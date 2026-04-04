import pika
import json
import time
from sqlalchemy import text
from produce_listing_cancelled import publish_refund_batch

# 🔥 import your DB engine + serializer
from order import _db_engine

RABBITMQ_HOST = "rabbitmq"
EXCHANGE_NAME = "listing.events"
ROUTING_KEY = "listing.cancelled"
QUEUE_NAME = "refund.listing.cancelled.queue"

def connect():
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=RABBITMQ_HOST)
            )
            print("[Consumer] Connected to RabbitMQ")
            return connection
        except pika.exceptions.AMQPConnectionError:
            print("[Consumer] Waiting for RabbitMQ...")
            time.sleep(5)

def callback(ch, method, properties, body):
    try:
        event = json.loads(body)
        print(f"[Consumer] Received listing.cancelled: {event}")

        #listing = event.get("data", {})
        listing_id = str(event["data"]["id"])

        if not listing_id:
            raise ValueError("Missing listing_id in event")

        with _db_engine().connect() as connection:
            rows = connection.execute(
                text("SELECT * FROM orders WHERE listing_id = :listing_id and status = 'PAID'"),
                {"listing_id": listing_id},
            ).mappings().all()

        orders = []
        for row in rows:
            order = dict(row)
            orders.append({
                "id": order.get("id"),
                "listing_id": order.get("listing_id"),
                "user_id": order.get("user_id"),
                "points_amount": order.get("total_paid"),
                "point_reference_id": order.get("point_id"),
                "payment_id": order.get("payment_id"),
                "qty": order.get("qty"),
            })

        print(f"[Consumer] Found {len(orders)} orders for listing {listing_id}")

        for order in orders:
            print(f"[Consumer] Processing order {order['id']}")

        if orders:
            publish_refund_batch(orders)
        ch.basic_ack(delivery_tag=method.delivery_tag)


    except Exception as e:
        print(f"[Consumer] Error: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def main():
    print("Connet")
    connection = connect()
    channel = connection.channel()

    print("Declare exchange")
    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type="topic",
        durable=True
    )

    print("Queue declare")
    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    print("Queue bind")
    channel.queue_bind(
        exchange=EXCHANGE_NAME,
        queue=QUEUE_NAME,
        routing_key=ROUTING_KEY
    )

    print(f"[Consumer] Waiting for events: {ROUTING_KEY}")
    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(
        queue=QUEUE_NAME,
        on_message_callback=callback
    )

    channel.start_consuming()


if __name__ == "__main__":
    main()
