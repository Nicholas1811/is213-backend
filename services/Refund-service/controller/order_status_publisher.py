import json
import os
import time
import uuid

import pika

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
EXCHANGE_NAME = "order.events"


def connect_rabbit():
    while True:
        try:
            return pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        except pika.exceptions.AMQPConnectionError:
            print("[Refund->Order] Waiting for RabbitMQ...")
            time.sleep(5)


def publish_order_status(order_id, status, user_id=None):
    normalized_status = str(status).strip().upper()
    routing_key = f"order.status.{normalized_status.lower()}"

    connection = connect_rabbit()
    channel = connection.channel()

    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type="topic",
        durable=True,
    )

    event = {
        "event_id": str(uuid.uuid4()),
        "event": routing_key,
        "order_id": str(order_id),
        "status": normalized_status,
        "user_id": str(user_id) if user_id is not None else None,
        "source": "refund-service",
    }

    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=routing_key,
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2),
    )

    connection.close()


def publish_order_refunded(order_id, user_id=None):
    publish_order_status(order_id, "REFUNDED", user_id)
