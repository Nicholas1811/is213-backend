import logging
from asyncio import gather

from app.clients.openai_client import OpenAIClient
from app.schemas.points_verification_processed import (
    PointsVerificationProcessedResponse,
)
from app.schemas.points_verification_upload import PointsVerificationUploadRequest
from app.vision import ImageLoader, ScreenReplayDetector
from app.vision.models import ScreenReplayDetectionResult

logger = logging.getLogger(__name__)


class PointsVerificationService:
    def __init__(
        self,
        openai_client: OpenAIClient,
        image_loader: ImageLoader | None = None,
        screen_replay_detector: ScreenReplayDetector | None = None,
        precheck_enabled: bool = True,
    ) -> None:
        self.openai_client = openai_client
        self.image_loader = image_loader
        self.screen_replay_detector = screen_replay_detector
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

        self._log_detection_result("before", request, before_result)
        self._log_detection_result("after", request, after_result)

        for label, result in (
            ("before", before_result),
            ("after", after_result),
        ):
            if result.is_screen_replay:
                logger.info(
                    "Rejected points verification from local screen replay detector trans_id=%s user_id=%s image=%s score=%s reason=%s",
                    request.trans_id,
                    request.user_id,
                    label,
                    result.score,
                    result.reason,
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
    ) -> None:
        logger.info(
            "Screen replay precheck trans_id=%s user_id=%s image=%s detected=%s score=%s confidence=%s features=%s",
            request.trans_id,
            request.user_id,
            label,
            result.is_screen_replay,
            result.score,
            result.confidence,
            result.features.as_dict(),
        )
