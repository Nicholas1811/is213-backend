from math import trunc

## Consumer code so that everytime when events enter, it calls the notification-mgmt call back.
import pika
import json
import time
from notification_management import pushNotificationWorkflow
def connect_rabbit():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
            return connection
        except pika.exceptions.AMQPConnectionError:
            print("Not ready yet.")
            time.sleep(5)
connection = connect_rabbit()
channel = connection.channel()

#Declare exchange
channel.exchange_declare(
    exchange="notification.events",
    exchange_type='topic',
    durable=True
)
## Dead letter queue

channel.queue_declare(
    queue="notification.dlq",
    durable=True
)
channel.queue_declare(
    queue="notification.queue",
    durable=True,
    arguments={
        "x-dead-letter-exchange": "notification.events",
        "x-dead-letter-routing-key": "deadletter"
    }
)

channel.queue_bind(
    exchange="notification.events",
    queue="notification.queue",
    routing_key="#.failure"
)

channel.queue_bind(
    exchange="notification.events",
    queue="notification.queue",
    routing_key="#.created"
)

channel.queue_bind(
    exchange="notification.events",
    queue="notification.queue",
    routing_key="#.success"
)

channel.queue_bind(
    exchange="notification.events",
    queue="notification.queue",
    routing_key="#.cancelled"
)

channel.queue_bind(
    exchange="notification.events",
    queue="notification.dlq",
    routing_key="deadletter"
)

def callback(ch, method, properties, body):
    event = json.loads(body)
    try:
        pushNotificationWorkflow(event)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print("Processing failed:", e)
        ch.basic_nack(
            delivery_tag=method.delivery_tag,
            requeue=False
        )

print("Consumer is now waiting for messages...", flush=True)
channel.basic_consume(queue="notification.queue", on_message_callback=callback)
channel.start_consuming()
