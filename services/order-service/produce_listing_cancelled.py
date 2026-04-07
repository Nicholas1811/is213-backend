import pika
import json
import os
from decimal import Decimal

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")

EXCHANGE_NAME = "refund.events"
ROUTING_KEY = "refund.batch.requested"


def _json_default(value):
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")

def connect_rabbit():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            return connection
        except pika.exceptions.AMQPConnectionError:
            time.sleep(5)

def publish_refund_batch(orders: list[dict]):
    if not orders:
        print("[Producer] No orders to refund")
        return

    connection = connect_rabbit()
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
        body=json.dumps(message, default=_json_default),
        properties=pika.BasicProperties(
            delivery_mode=2  # persistent
        )
    )

    print(f"[Producer] Sent {len(orders)} orders for refund")

    connection.close()