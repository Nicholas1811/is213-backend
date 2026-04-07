import pika
import json
import os
import time

from controller.refund_controller import execute_refund
from controller.notification_publisher import publish_event
from .order_status_publisher import publish_order_refunded
from refund_logic import refund_result_completed

EXCHANGE_NAME = "refund.events"
ROUTING_KEY = "refund.batch.requested"


def start_refund_consumer():
    rabbit_host = os.environ.get('RABBITMQ_HOST', 'rabbitmq')

    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=rabbit_host)
            )
            break
        except pika.exceptions.AMQPConnectionError:
            print("[Refund] Waiting for RabbitMQ...")
            time.sleep(5)

    channel = connection.channel()

    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type='topic',
        durable=True
    )

    channel.queue_declare(queue="LISTING_CANCELLED_REFUND", durable=True)

    channel.queue_bind(
        exchange=EXCHANGE_NAME,
        queue="LISTING_CANCELLED_REFUND",
        routing_key=ROUTING_KEY
    )

    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(
        queue="LISTING_CANCELLED_REFUND",
        on_message_callback=on_refund_batch,
        auto_ack=False
    )

    print("[Refund] Listening for refund batches...", flush=True)
    channel.start_consuming()

def on_refund_batch(ch, method, properties, body):
    try:
        data = json.loads(body)

        orders = data.get("orders", [])

        print(f"[Refund] Received {len(orders)} orders")

        if not orders:
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        for order in orders:
            try:
                order_id = order.get("id")
                user_id = order.get("user_id")

                if not order_id:
                    print("[Refund] Skipping invalid order (no id)")
                    continue

                if not user_id:
                    print(f"[Refund] Skipping invalid order {order_id} (no user_id)")
                    continue

                refund_payload = {
                    "order_id": order_id,
                    "user_id": user_id,
                    "point_reference_id": order.get("point_reference_id"),
                    "payment_checkout_id": order.get("payment_id"),
                }

                print(f"[Refund] Processing order {order_id}")
                result = execute_refund(refund_payload, wait_for_completion=True)
                if refund_result_completed(result):
                    publish_order_refunded(order_id, user_id)
                    ##Should publish to affected users.
                    publish_event(order_id, user_id)
                else:
                    print(
                        f"[Refund] Workflow for order {order_id} ended with status "
                        f"{result.get('status')}; skipping refunded event",
                        flush=True,
                    )

                print(f"[Refund] Workflow result for order {order_id}: {result}", flush=True)

            except Exception as e:
                print(f"[Refund] Failed for order {order.get('id')}: {e}")
                continue  # DO NOT break loop

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"[Refund] Batch error: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
