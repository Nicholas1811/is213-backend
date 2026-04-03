import pika
import json
import os
import uuid
from datetime import datetime

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")

EXCHANGE_NAME = "refund.events"
ROUTING_KEY = "refund.batch.requested"


def publish_refund_batch(orders: list[dict]):
    if not orders:
        print("[Producer] No orders to refund")
        return

    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=RABBITMQ_HOST)
    )
    channel = connection.channel()

    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type="topic",
        durable=True
    )

    message = {
        "event": "refund.batch.requested",
        "orders": orders
    }

    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=ROUTING_KEY,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2  # persistent
        )
    )

    print(f"[Producer] Sent {len(orders)} orders for refund")

    connection.close()