from os import environ


RABBITMQ_URL = environ.get("RABBITMQ_URL", "amqp://rabbitmq:5672")
RABBITMQ_CONNECT_RETRY_DELAY = float(environ.get("RABBITMQ_CONNECT_RETRY_DELAY", "5"))
RABBITMQ_CONNECT_MAX_RETRIES = int(environ.get("RABBITMQ_CONNECT_MAX_RETRIES", "0"))
RABBITMQ_EXCHANGE = environ.get("RABBITMQ_EXCHANGE", "listing.events")
AI_CONSUME_QUEUE = environ.get("AI_CONSUME_QUEUE", "ai.listing-processor.q")
RABBITMQ_PREFETCH = int(environ.get("RABBITMQ_PREFETCH", "20"))
LISTING_UPLOADED_ROUTING_KEY = "listing.uploaded"
LISTING_PROCESSED_ROUTING_KEY = "listing.processed"


POINTS_VERIFICATION_EXCHANGE = ""
AI_TASK_QUEUE = "ai_processing_queue"
AI_TASK_ROUTING_KEY = "ai_processing_queue"

AI_RESULT_QUEUE = "ai_result_queue"
AI_RESULT_ROUTING_KEY = "ai_result_queue"
