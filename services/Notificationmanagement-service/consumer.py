from math import trunc

## Consumer code so that everytime when events enter, it calls the notification-mgmt call back.
import pika
import json
import time
from notification_management import pushNotificationWorkflow
# Roughly, we need this for each event.
# {
#     "eventType": "order.created",
#     "userId": 123,
#     "data": {
#         "orderId": 456
#     }
# }
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
    exchange="notification-exchange",
    exchange_type='topic',
    durable=True
)
channel.queue_declare(
    queue="notification.queue",
    durable=True
)
channel.queue_bind(
    exchange="notification-exchange",
    queue="notification.queue",
    routing_key="#.failed"
)

channel.queue_bind(
    exchange="notification-exchange",
    queue="notification.queue",
    routing_key="#.created"
)

channel.queue_bind(
    exchange="notification-exchange",
    queue="notification.queue",
    routing_key="#.success"
)
def callback(ch, method, properties, body):
    event = json.loads(body)
    print(f"Callback methods run with {event}", flush=True)
    pushNotificationWorkflow()
    ch.basic_ack(delivery_tag=method.delivery_tag)

print("Consumer is now waiting for messages...", flush=True)
channel.basic_consume(queue="notification.queue", on_message_callback=callback)
channel.start_consuming()
