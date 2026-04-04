from os import environ
from pathlib import Path


RABBITMQ_URL = environ.get("RABBITMQ_URL", "amqp://rabbitmq:5672")
RABBITMQ_CONNECT_RETRY_DELAY = float(environ.get("RABBITMQ_CONNECT_RETRY_DELAY", "5"))
RABBITMQ_CONNECT_MAX_RETRIES = int(environ.get("RABBITMQ_CONNECT_MAX_RETRIES", "0"))
LISTING_EVENTS_EXCHANGE = environ.get("LISTING_EVENTS_EXCHANGE", "listing.events")
AI_EVENTS_EXCHANGE = environ.get("AI_EVENTS_EXCHANGE", "ai.events")
AI_CONSUME_QUEUE = environ.get("AI_CONSUME_QUEUE", "ai.listing-processor.q")
RABBITMQ_PREFETCH = int(environ.get("RABBITMQ_PREFETCH", "20"))
LISTING_UPLOADED_ROUTING_KEY = environ.get("LISTING_UPLOADED_ROUTING_KEY", "listing.uploaded")
LISTING_PROCESSED_ROUTING_KEY = environ.get("LISTING_PROCESSED_ROUTING_KEY", "ai.listing.processed")


POINTS_VERIFICATION_EXCHANGE = ""
AI_TASK_QUEUE = "ai_processing_queue"
AI_TASK_ROUTING_KEY = "ai_processing_queue"

AI_RESULT_QUEUE = "ai_result_queue"
AI_RESULT_ROUTING_KEY = "ai_result_queue"

SCREEN_REPLAY_DETECTOR_ENABLED = (
    environ.get("SCREEN_REPLAY_DETECTOR_ENABLED", "true").lower() == "true"
)
SCREEN_REPLAY_REJECT_THRESHOLD = float(
    environ.get("SCREEN_REPLAY_REJECT_THRESHOLD", "0.72")
)
SCREEN_REPLAY_FETCH_TIMEOUT_SECONDS = float(
    environ.get("SCREEN_REPLAY_FETCH_TIMEOUT_SECONDS", "10")
)
OPENAI_POINTS_IMAGE_DETAIL = environ.get("OPENAI_POINTS_IMAGE_DETAIL", "high")
SERVICE_ROOT = Path(__file__).resolve().parents[1]
SCREEN_REPLAY_MODEL_ENABLED = (
    environ.get("SCREEN_REPLAY_MODEL_ENABLED", "false").lower() == "true"
)
SCREEN_REPLAY_MODEL_PATH = environ.get(
    "SCREEN_REPLAY_MODEL_PATH",
    str(SERVICE_ROOT / "models" / "screen_replay_model.joblib"),
)
SCREEN_REPLAY_MODEL_REJECT_THRESHOLD = float(
    environ.get("SCREEN_REPLAY_MODEL_REJECT_THRESHOLD", "0.5")
)
