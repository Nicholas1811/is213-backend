
## Consumer code so that everytime when events enter, it calls the notification-mgmt call back.
import pika
import json
from notification_management import pushNotificationWorkflow

connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
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
    routing_key="#"
)
def callback(ch, method, properties, body):
    event = json.loads(body)
    print(f"Received event {event}")
    ## Event body should be like this
    ##{
    # eventName, status, userId, datetime?
    # }
    pushNotificationWorkflow(event)
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(queue="notification.queue", on_message_callback=callback)

print("Waiting for all to send notification queue events")
channel.start_consuming()
