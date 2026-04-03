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
             - the two images should appear to show the same meal setting, such as a similar plate, tray, table, or surrounding context
             - the after photo should show that the plate or food container is at least 90 percent empty
             - approve only if it is likely the same real meal before and after eating
             - reject if the images do not appear related, if the after photo still contains substantial food, or if the result is unclear
             - if you are uncertain at any step, return rejected

             Return only valid JSON with exactly these keys:
             - status
             - confidence
             - reason

             Valid values:
             - status must be either approved or rejected
             - confidence must be a number from 0 to 1
             - reason must be a short phrase explaining the decision

             Confidence rules:
             - use higher confidence only when the same real meal setting is clear and the after image is clearly at least 90 percent empty
             - use high confidence rejection when a screen, screenshot, or displayed food image is visible

        """

        ai_result = await self.openai_client.generate_json_points(
            system_prompt, before_image_url, after_image_url
        )
        logger.info(
            "Points verification AI decision trans_id=%s user_id=%s status=%s confidence=%s reason=%s",
            request.trans_id,
            request.user_id,
            ai_result.get("status"),
            ai_result.get("confidence"),
            ai_result.get("reason"),
        )

        return PointsVerificationProcessedResponse(
            trans_id=request.trans_id,
            user_id=request.user_id,
            status=ai_result["status"],
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
