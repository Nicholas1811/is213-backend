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
##Change to new DLX.
channel.queue_declare(
    queue="notification.queue",
    durable=True,
    arguments={
        "x-dead-letter-exchange": "notification.dlx",
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

channel.exchange_declare(
    exchange="notification.dlx",
    exchange_type='topic',
    durable=True
)

channel.queue_bind(
    exchange="notification.dlx",
    queue="notification.dlq",
    routing_key="deadletter"
)

def callback(ch, method, properties, body):
    print("Received raw:", body, flush=True)

    try:
        try:
            event = json.loads(body)
        except Exception as parse_err:
            print("JSON parsing failed:", parse_err, flush=True)

            ch.basic_nack(
                delivery_tag=method.delivery_tag,
                requeue=False
            )
            return

        print("Parsed event:", event, flush=True)

        # Step 2: Run your business logic SAFELY
        try:
            pushNotificationWorkflow(event)
        except Exception as workflow_err:
            print("Workflow failed:", workflow_err, flush=True)

            ch.basic_nack(
                delivery_tag=method.delivery_tag,
                requeue=False
            )
            return
        print("Successfully processed", flush=True)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as fatal_err:
        print("FATAL ERROR:", fatal_err, flush=True)

        try:
            ch.basic_nack(
                delivery_tag=method.delivery_tag,
                requeue=False
            )
        except Exception as nack_err:
            print("Failed to nack message:", nack_err, flush=True)

print("Consumer is now waiting for messages...", flush=True)
channel.basic_consume(queue="notification.queue", on_message_callback=callback)
channel.start_consuming()
