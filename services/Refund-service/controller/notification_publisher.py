## Consumer code so that everytime when events enter, it calls the notification-mgmt call back.
# POC for our producer code.
import pika
import json
import time
import uuid

## Code over here can be reused throughout in your own services.
def connect_rabbit():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
            return connection
        except pika.exceptions.AMQPConnectionError:
            time.sleep(5)

def publish_event(event_original_id, userId):
    print("Event is starting to get published.", flush=True)
    connection = connect_rabbit()
    channel = connection.channel()

    channel.exchange_declare(
        exchange="notification.events",
        exchange_type='topic',
        durable=True
    )

    ## Mock events, you guys can use this as reference to know what to send.
    event = {
        "event_id" : str(uuid.uuid4()),
        "key" : "listing.cancelled", #binding key
        "userId" : f"{userId}", #
        "event_original_id" : f"{event_original_id}"
    }
    ## Sample routing key, change according to your needs.
    channel.basic_publish(
        exchange="notification.events",
        routing_key="listing.cancelled", #Here
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print("Message published.", flush=True)
print("Waiting to send")
