import json
import os
import time

import pika
from sqlalchemy import text

from order import _db_engine

RABBITMQ_HOST = "rabbitmq"
EXCHANGE_NAME = "order.events"
ROUTING_KEY = "order.status.*"
QUEUE_NAME = "order.status.queue"


def connect():
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=RABBITMQ_HOST)
            )
            print("[OrderStatus] Connected to RabbitMQ")
            return connection
        except pika.exceptions.AMQPConnectionError:
            print("[OrderStatus] Waiting for RabbitMQ...")
            time.sleep(5)


def callback(ch, method, properties, body):
    try:
        event = json.loads(body)
        order_id = event.get("order_id")
        status = str(event.get("status", "")).strip().upper()

        if not order_id:
            raise ValueError("Missing order_id in order status event")

        if status not in {"REFUNDED", "PENDING_REFUND", "REFUND_FAILED"}:
            print(f"[OrderStatus] Ignoring unsupported status '{status}' for order {order_id}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        with _db_engine().begin() as connection:
            connection.execute(
                text("UPDATE orders SET status = :status WHERE id = :id"),
                {"status": status, "id": int(order_id)},
            )

        print(f"[OrderStatus] Updated order {order_id} to {status}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as error:
        print(f"[OrderStatus] Error: {error}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main():
    connection = connect()
    channel = connection.channel()

    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type="topic",
        durable=True,
    )

    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME, routing_key=ROUTING_KEY)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    print(f"[OrderStatus] Waiting for events: {ROUTING_KEY}")
    channel.start_consuming()


if __name__ == "__main__":
    main()
