from fastapi import FastAPI

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import aio_pika

# AMQP Connection
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.connection = await aio_pika.connect_robust(
        #"amqp://guest:guest@localhost/",
        "amqp://localhost:5672",
    )
    app.state.channel = await app.state.connection.channel()
    try:
        yield
    finally:
        await app.state.connection.close()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def home():
    return "gay"

# Publish health check
@app.post("/publish")
async def publish_message(message: str) -> dict:
    await app.state.channel.default_exchange.publish(
        aio_pika.Message(body=message.encode()),
        routing_key="test_queue",
    )
    return {"status": "ok"}

# Publish health check
@app.get("/consume")
async def consume_message() -> dict:
    queue = await app.state.channel.declare_queue(
        "test_queue",
        auto_delete=True,
    )
    message = await queue.get(timeout=5, fail=False)

    if message:
        await message.ack()
        return {"body": message.body.decode()}

    return {"body": None}

# RabbitMQ JSON body contract
#
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
#
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
#
# Notes:
# - `data` must be the full listing snapshot, not only `product_id` / `image_url`.
# - AI should read the image from `data.s3ImageUrl`.
# - The processed event should preserve the original listing fields and only update the
#   AI-enriched fields such as `name`, `description`, `status`, and `updatedAt`.