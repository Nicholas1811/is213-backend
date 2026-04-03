# activities/publish_events.py

import pika
import json
import uuid
import os
from temporalio import activity

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
def connect_rabbit():
    while True:
        try:
            return pika.BlockingConnection(
                pika.ConnectionParameters(host=RABBITMQ_HOST)
            )
        except pika.exceptions.AMQPConnectionError:
            print("[Producer] Waiting for RabbitMQ...")
            import time
            time.sleep(3)


@activity.defn
async def publish_event(data):
    print(f"[Producer] Publishing event: {data['event_key']}", flush=True)

    connection = connect_rabbit()
    channel = connection.channel()

    channel.exchange_declare(
        exchange="notification.events",
        exchange_type="topic",
        durable=True
    )

    event = {
        "event_id": str(uuid.uuid4()),
        "key": data['event_key'],
        "userId" : f"{data['userId']}", ##TODO CHANGE HERE
        "event_original_id" : f"{data['original_id']}" ##TODO CHANGE HERE
    }

    channel.basic_publish(
        exchange="notification.events",
        routing_key=data['event_key'],   # 🔥 SAME as event type
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2)
    )

    connection.close()
    print("[Producer] Event published.", flush=True)