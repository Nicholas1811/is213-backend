from os import environ


RABBITMQ_URL = environ.get("RABBITMQ_URL", "amqp://localhost:5672")
RABBITMQ_EXCHANGE = environ.get("RABBITMQ_EXCHANGE", "dev.events")
AI_CONSUME_QUEUE = environ.get("AI_CONSUME_QUEUE", "dev.ai.listing.uploaded")
RABBITMQ_PREFETCH = int(environ.get("RABBITMQ_PREFETCH", "20"))
LISTING_UPLOADED_ROUTING_KEY = "listing.uploaded"
LISTING_PROCESSED_ROUTING_KEY = "listing.processed"
