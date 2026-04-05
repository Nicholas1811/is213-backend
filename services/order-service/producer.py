from pika import exchange_type
import pika
import json
from constants import CANCEL_TASK_QUEUE, CANCEL_TASK_ROUTING_KEY
import time
import uuid


def connect_rabbit():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
            return connection
        except pika.exceptions.AMQPConnectionError:
            time.sleep(5)

def publish_to_refund(order_id, listing_id, user_id, point_reference_id, payment_id, qty, points_amount):
    connection = connect_rabbit()
    channel = connection.channel()
    
    channel.exchange_declare(
        exchange='cancel.order.fanout.events',
        exchange_type='fanout',
        durable=True
    )

    channel.exchange_declare(
        exchange='notification.events',
        exchange_type='topic',
        durable=True
    )
    
    
    payload = {
        "event_id": str(uuid.uuid4()),
        "key": CANCEL_TASK_ROUTING_KEY,
        "order_id": str(order_id),
        "listing_id": str(listing_id),
        "user_id": str(user_id),
        "points_amount": points_amount if points_amount is not None else 0,
        "point_reference_id": str(point_reference_id) if point_reference_id else "",
        "payment_id": str(payment_id) if payment_id else "",
        "qty": qty
    }

    notif_payload = {
        "event_id": str(uuid.uuid4()),
        "key": CANCEL_TASK_ROUTING_KEY,
        "userId": str(user_id),
        "event_original_id" : f"{str(order_id)}"
    }

    channel.basic_publish(
        exchange='cancel.order.fanout.events',
        routing_key=CANCEL_TASK_ROUTING_KEY,
        body=json.dumps(payload),
        properties=pika.BasicProperties(delivery_mode=2)
    )

    channel.basic_publish(
        exchange="notification.events",
        routing_key=CANCEL_TASK_ROUTING_KEY,
        body=json.dumps(notif_payload),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    connection.close()