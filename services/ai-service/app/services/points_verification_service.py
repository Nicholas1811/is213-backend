import logging
from asyncio import gather

from app.clients.openai_client import OpenAIClient
from app.schemas.points_verification_processed import (
    PointsVerificationProcessedResponse,
)
from app.schemas.points_verification_upload import PointsVerificationUploadRequest
from app.vision import ImageLoader, ScreenReplayDetector, ScreenReplayModel
from app.vision.models import ScreenReplayDetectionResult, ScreenReplayModelResult

logger = logging.getLogger(__name__)


class PointsVerificationService:
    def __init__(
        self,
        openai_client: OpenAIClient,
        image_loader: ImageLoader | None = None,
        screen_replay_detector: ScreenReplayDetector | None = None,
        screen_replay_model: ScreenReplayModel | None = None,
        precheck_enabled: bool = True,
    ) -> None:
        self.openai_client = openai_client
        self.image_loader = image_loader
        self.screen_replay_detector = screen_replay_detector
        self.screen_replay_model = screen_replay_model
        self.precheck_enabled = precheck_enabled

    async def process(
        self, request: PointsVerificationUploadRequest
    ) -> PointsVerificationProcessedResponse:
        before_image_url = request.before_url
        after_image_url = request.after_url

        precheck_result = await self._run_screen_replay_precheck(request)
        if precheck_result is not None:
            return precheck_result

        system_prompt = """
             You are verifying whether a user truly finished a real meal for a rewards system.

             You will receive two images in order:
             1. the before-eating photo
             2. the after-eating photo

             First, decide whether both images show a real physical meal scene.
             Immediately reject if either image shows:
             - food displayed on a phone, tablet, laptop, monitor, television, or any other screen
             - a screenshot, printed photo, poster, menu, advertisement, or digital display of food
             - visible UI, bezels, screen borders, reflections, app layouts, or status bars
             - a person holding a device that displays food instead of a real meal
             - a scene that does not appear physically real

             After confirming both images show a real meal, decide meal completion:
             - the before photo must clearly show a meaningful amount of food present at the start; reject if the before photo is already empty, nearly empty, or appears already finished
             - the two images should appear to show the same meal setting, such as a similar plate, tray, table, or surrounding context
             - the before photo should contain clearly more food than the after photo
             - the after photo should show that the plate or food container is at least 90 percent empty
             - approve only if it is likely the same real meal before and after eating
             - reject if the images do not appear related, if the before photo is already mostly empty, if the after photo still contains substantial food, or if the result is unclear
             - if you are uncertain at any step, return rejected

             Return only valid JSON with exactly these keys:
             - is_real_scene
             - same_meal_setting
             - before_food_percent
             - after_food_percent
             - confidence
             - reason

             Valid values:
             - is_real_scene must be a boolean
             - same_meal_setting must be a boolean
             - before_food_percent must be an integer from 0 to 100 representing how much meaningful food is visible in the before image
             - after_food_percent must be an integer from 0 to 100 representing how much food remains in the after image
             - confidence must be a number from 0 to 1
             - reason must be a short phrase explaining the decision

             Approval rubric:
             - before_food_percent should be low, such as 0 to 10, when the before image is empty, nearly empty, or already finished
             - approve only when is_real_scene is true, same_meal_setting is true, before_food_percent is at least 25, after_food_percent is at most 10, and the before image clearly contains more food than the after image
             - if the before image is empty or nearly empty, return a low before_food_percent and do not approve
             - if you are uncertain, be conservative in the percentages and do not approve

             Confidence rules:
             - use higher confidence only when the same real meal setting is clear, the before image clearly starts with food present, and the after image is clearly at least 90 percent empty
             - use high confidence rejection when a screen, screenshot, or displayed food image is visible

        """

        ai_result = await self.openai_client.generate_json_points(
            system_prompt, before_image_url, after_image_url
        )
        status = self._derive_ai_status(ai_result)
        logger.info(
            "Points verification AI decision trans_id=%s user_id=%s status=%s confidence=%s reason=%s is_real_scene=%s same_meal_setting=%s before_food_percent=%s after_food_percent=%s",
            request.trans_id,
            request.user_id,
            status,
            ai_result.get("confidence"),
            ai_result.get("reason"),
            ai_result.get("is_real_scene"),
            ai_result.get("same_meal_setting"),
            ai_result.get("before_food_percent"),
            ai_result.get("after_food_percent"),
        )

        return PointsVerificationProcessedResponse(
            trans_id=request.trans_id,
            user_id=request.user_id,
            status=status,
        )

    async def _run_screen_replay_precheck(
        self,
        request: PointsVerificationUploadRequest,
    ) -> PointsVerificationProcessedResponse | None:
        if (
            not self.precheck_enabled
            or self.image_loader is None
            or self.screen_replay_detector is None
        ):
            return None

        try:
            before_image, after_image = await gather(
                self.image_loader.load(request.before_url),
                self.image_loader.load(request.after_url),
            )
        except Exception:
            logger.exception(
                "Screen replay precheck skipped because image loading failed trans_id=%s user_id=%s",
                request.trans_id,
                request.user_id,
            )
            return None

        before_result = self.screen_replay_detector.analyze(before_image)
        after_result = self.screen_replay_detector.analyze(after_image)
        before_model_result = self._predict_with_local_model(before_result)
        after_model_result = self._predict_with_local_model(after_result)

        self._log_detection_result(
            "before", request, before_result, before_model_result
        )
        self._log_detection_result("after", request, after_result, after_model_result)

        for label, result, model_result in (
            ("before", before_result, before_model_result),
            ("after", after_result, after_model_result),
        ):
            should_reject = (
                model_result.is_screen_replay
                if model_result is not None
                else result.is_screen_replay
            )
            if should_reject:
                reason = (
                    f"local model spoof_probability={model_result.probability}"
                    if model_result is not None
                    else result.reason
                )
                logger.info(
                    "Rejected points verification from local screen replay precheck trans_id=%s user_id=%s image=%s score=%s reason=%s",
                    request.trans_id,
                    request.user_id,
                    label,
                    result.score,
                    reason,
                )
                return PointsVerificationProcessedResponse(
                    trans_id=request.trans_id,
                    user_id=request.user_id,
                    status="rejected",
                )

        return None

    def _log_detection_result(
        self,
        label: str,
        request: PointsVerificationUploadRequest,
        result: ScreenReplayDetectionResult,
        model_result: ScreenReplayModelResult | None = None,
    ) -> None:
        if model_result is None:
            logger.info(
                "Screen replay precheck trans_id=%s user_id=%s image=%s heuristic_detected=%s score=%s confidence=%s features=%s",
                request.trans_id,
                request.user_id,
                label,
                result.is_screen_replay,
                result.score,
                result.confidence,
                result.features.as_dict(),
            )
            return

        logger.info(
            "Screen replay precheck trans_id=%s user_id=%s image=%s heuristic_detected=%s score=%s confidence=%s model_detected=%s model_probability=%s model_threshold=%s features=%s",
            request.trans_id,
            request.user_id,
            label,
            result.is_screen_replay,
            result.score,
            result.confidence,
            model_result.is_screen_replay,
            model_result.probability,
            model_result.threshold,
            result.features.as_dict(),
        )

    def _predict_with_local_model(
        self,
        result: ScreenReplayDetectionResult,
    ) -> ScreenReplayModelResult | None:
        if self.screen_replay_model is None:
            return None
        return self.screen_replay_model.predict(result)

    def _derive_ai_status(self, ai_result: dict) -> str:
        is_real_scene = self._coerce_bool(ai_result.get("is_real_scene"))
        same_meal_setting = self._coerce_bool(ai_result.get("same_meal_setting"))
        before_food_percent = self._coerce_percent(ai_result.get("before_food_percent"))
        after_food_percent = self._coerce_percent(ai_result.get("after_food_percent"))

        is_approved = (
            is_real_scene
            and same_meal_setting
            and before_food_percent >= 25
            and after_food_percent <= 10
            and before_food_percent >= after_food_percent + 15
        )
        return "approved" if is_approved else "rejected"

    def _coerce_bool(self, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "yes", "1"}:
                return True
            if normalized in {"false", "no", "0"}:
                return False
        return False

    def _coerce_percent(self, value: object) -> int:
        if isinstance(value, bool):
            return int(value) * 100
        if isinstance(value, (int, float)):
            return max(0, min(100, int(round(float(value)))))
        if isinstance(value, str):
            try:
                parsed = float(value.strip())
            except ValueError:
                return 0
            return max(0, min(100, int(round(parsed))))
        return 0
