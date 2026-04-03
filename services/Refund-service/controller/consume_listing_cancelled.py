import pika
import json
import os
import time

from controller.constants import REFUND_TASK_QUEUE
from controller.refund_controller import process_refund


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

    channel.queue_declare(queue=REFUND_TASK_QUEUE, durable=True)

    channel.queue_bind(
        exchange=EXCHANGE_NAME,
        queue=REFUND_TASK_QUEUE,
        routing_key=ROUTING_KEY
    )

    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(
        queue=REFUND_TASK_QUEUE,
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

                if not order_id:
                    print("[Refund] Skipping invalid order (no id)")
                    continue

                print(f"[Refund] Processing order {order_id}")
                process_refund(order)

                print(f"[Refund] Success for order {order_id}")

            except Exception as e:
                print(f"[Refund] Failed for order {order.get('id')}: {e}")
                continue  # DO NOT break loop

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"[Refund] Batch error: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)