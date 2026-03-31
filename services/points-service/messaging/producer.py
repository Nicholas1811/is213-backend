import pika
import json
from .constants import AI_TASK_QUEUE, AI_TASK_ROUTING_KEY
import time
import uuid


def connect_rabbit():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
            return connection
        except pika.exceptions.AMQPConnectionError:
            time.sleep(5)

def publish_to_ai(user_id, trans_id , before_url, after_url):
    connection = connect_rabbit()
    channel = connection.channel()
    
    channel.queue_declare(queue=AI_TASK_QUEUE, durable=True)
    
    payload = {
        "user_id": str(user_id),
        "trans_id": str(trans_id),
        "before_url": before_url,
        "after_url": after_url
    }
    
    channel.basic_publish(
        exchange='',
        routing_key=AI_TASK_ROUTING_KEY,
        body=json.dumps(payload)
    )
    connection.close()


def publish_notification(user_id,trans_id,status):
    print("Event is starting to get published.", flush=True)
    connection = connect_rabbit()
    channel = connection.channel()

    channel.exchange_declare(
        exchange="notification-exchange",
        exchange_type='topic',
        durable=True
    )

    if status == "approved":
        key = "point.success"
    else:
        key = "point.failure"
    event = {
        "event_id" : str(uuid.uuid4()),
        "key" : key, #binding key
        "userId" : user_id,
        "event_original_id" : trans_id,
    }

    channel.basic_publish(
        exchange="notification-exchange",
        routing_key=key,
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print("Message published.", flush=True)