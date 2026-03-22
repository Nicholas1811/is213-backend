import json
from os import environ
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncGenerator
from uuid import uuid4

import aio_pika
from fastapi import FastAPI

# from app.gemini_process import generate_listing_details_from_image_url

RABBITMQ_URL = environ.get("RABBITMQ_URL", "amqp://localhost:5672")
RABBITMQ_EXCHANGE = environ.get("RABBITMQ_EXCHANGE", "dev.events")
RABBITMQ_QUEUE = environ.get("RABBITMQ_QUEUE", "dev.listings.events")
RABBITMQ_PREFETCH = int(environ.get("RABBITMQ_PREFETCH", "20"))
AI_CONSUME_QUEUE = environ.get("AI_CONSUME_QUEUE", "dev.ai.listing.uploaded")
LISTING_UPLOADED_ROUTING_KEY = "listing.uploaded"
LISTING_PROCESSED_ROUTING_KEY = "listing.processed"

# AMQP Connection
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.connection = await aio_pika.connect_robust(
        RABBITMQ_URL,
    )
    app.state.channel = await app.state.connection.channel()
    await app.state.channel.set_qos(prefetch_count=RABBITMQ_PREFETCH)

    app.state.exchange = await app.state.channel.declare_exchange(
        RABBITMQ_EXCHANGE,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )
    app.state.listing_uploaded_queue = await app.state.channel.declare_queue(
        AI_CONSUME_QUEUE,
        durable=True,
    )
    await app.state.listing_uploaded_queue.bind(
        app.state.exchange,
        routing_key=LISTING_UPLOADED_ROUTING_KEY,
    )

    app.state.last_listing_uploaded: dict[str, Any] | None = None
    app.state.last_listing_processed: dict[str, Any] | None = None
    await app.state.listing_uploaded_queue.consume(
        lambda message: handle_listing_uploaded(app, message),
    )

    try:
        yield
    finally:
        await app.state.connection.close()

# On consuming listing.uploaded event
# 1. Grab the payload data (imageURL)
# 2. Sent to AI service for processing
# 3. Populate new message with AI details as new message payload
# 4. Publish message with new payload
async def handle_listing_uploaded(
    app: FastAPI,
    message: aio_pika.abc.AbstractIncomingMessage,
) -> None:
    async with message.process(requeue=False):
        payload = json.loads(message.body.decode("utf-8"))
        listing = payload.get("data", {})
        image_url = listing.get("s3ImageUrl")
        image_mime_type = listing.get("mimeType") or listing.get("contentType")
        listing_id = listing.get("id")

        app.state.last_listing_uploaded = {
            "eventId": payload.get("eventId"),
            "eventName": payload.get("eventName"),
            "listingId": listing_id,
            "imageUrl": image_url,
            "mimeType": image_mime_type,
        }

        print(f"Image consumed: {image_url}")

        # ai_details = await generate_listing_details_from_image_url(
        #     image_url,
        #     mime_type=image_mime_type,
        # )

        processed_payload = build_default_listing_processed_message(
            source_payload=payload
            # ai_name=ai_details.name,
            # ai_description=ai_details.description,
        )
        await publish_listing_processed(app, processed_payload)


async def publish_listing_processed(app: FastAPI, payload: dict[str, Any]) -> dict[str, Any]:
    await app.state.exchange.publish(
        aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
        ),
        routing_key=LISTING_PROCESSED_ROUTING_KEY,
    )

    app.state.last_listing_processed = payload
    return payload

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def home():
    return "gay"

# Publish health check
@app.post("/publish")
async def publish_message() -> dict:
    payload = build_default_listing_uploaded_message()
    await app.state.channel.default_exchange.publish(
        aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
        ),
        routing_key=AI_CONSUME_QUEUE,
    )
    return {
        "status": "ok",
        "queue": AI_CONSUME_QUEUE,
        "body": payload,
    }

# RabbitMQ JSON body contract
# Notes:
# - `data` must be the full listing snapshot, not only `product_id` / `image_url`.
# - AI should read the image from `data.s3ImageUrl`.
# - The processed event should preserve the original listing fields and only update the
#   AI-enriched fields such as `name`, `description`, `status`, and `updatedAt`.

# Consume from `listing.uploaded`
# {
#   "eventId": "2d8d7d7c-2a2b-4c1b-a6d8-7d7f8d5f2e10",
#   "eventName": "listing.uploaded",
#   "eventVersion": 1,
#   "occurredAt": "2026-03-22T10:15:30.000Z",
#   "source": "jms-productservice",
#   "correlationId": "optional-trace-id",
#   "data": {
#     "id": 123,
#     "s3ImageUrl": "https://bucket.s3.ap-southeast-1.amazonaws.com/listings/item-123.jpg",
#     "name": None,
#     "description": None,
#     "qty": 10,
#     "unitPriceCents": 2599,
#     "status": "created",
#     "bestBefore": "2026-03-30T00:00:00.000Z",
#     "createdAt": "2026-03-22T10:00:00.000Z",
#     "updatedAt": "2026-03-22T10:00:00.000Z"
#   }
# }

# Use this for testing JSON body using /publish
def build_default_listing_uploaded_message() -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "eventId": str(uuid4()),
        "eventName": LISTING_UPLOADED_ROUTING_KEY,
        "eventVersion": 1,
        "occurredAt": now,
        "source": "jms-productservice",
        "correlationId": "manual-test-publish",
        "data": {
            "id": 123,
            "s3ImageUrl": "LINK TO S3 TEST IMAGE URL",
            "name": None,
            "description": None,
            "qty": 10,
            "unitPriceCents": 2599,
            "status": "created",
            "bestBefore": None,
            "createdAt": now,
            "updatedAt": now,
        },
    }

# Publish to `listing.processed`
# {
#   "eventId": "8e8d5c2d-6e67-4f0a-9c37-4b0c3e5f91aa",
#   "eventName": "listing.processed",
#   "eventVersion": 1,
#   "occurredAt": "2026-03-22T10:16:00.000Z",
#   "source": "ai-service",
#   "correlationId": "same incoming correlationId or the uploaded eventId",
#   "data": {
#     "id": 123,
#     "s3ImageUrl": "https://bucket.s3.ap-southeast-1.amazonaws.com/listings/item-123.jpg",
#     "name": "AI generated product name",
#     "description": "AI generated product description",
#     "qty": 10,
#     "unitPriceCents": 2599,
#     "status": "processed",
#     "bestBefore": "2026-03-30T00:00:00.000Z",
#     "createdAt": "2026-03-22T10:00:00.000Z",
#     "updatedAt": "2026-03-22T10:16:00.000Z"
#   }
# }

# Use this for testing JSON body to publish to listing-service
def build_default_listing_processed_message(
    source_payload: dict[str, Any] | None = None,
    ai_name: str = "AI generated product name",
    ai_description: str = "AI generated product description",
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    uploaded_payload = source_payload or build_default_listing_uploaded_message()
    original_listing = uploaded_payload.get("data", {})

    return {
        "eventId": str(uuid4()),
        "eventName": LISTING_PROCESSED_ROUTING_KEY,
        "eventVersion": 1,
        "occurredAt": now,
        # Keep the current source shape compatible with listing-service's validator.
        "source": uploaded_payload.get("source", "jms-productservice"),
        "correlationId": uploaded_payload.get("correlationId") or uploaded_payload.get("eventId"),
        "data": {
            "id": original_listing.get("id", 123),
            "s3ImageUrl": original_listing.get("s3ImageUrl", "LINK TO S3 TEST IMAGE URL"),
            "name": ai_name,
            "description": ai_description,
            "qty": original_listing.get("qty", 10),
            "unitPriceCents": original_listing.get("unitPriceCents", 2599),
            "status": "processed",
            "bestBefore": original_listing.get("bestBefore"),
            "createdAt": original_listing.get("createdAt", now),
            "updatedAt": now,
        },
    }
