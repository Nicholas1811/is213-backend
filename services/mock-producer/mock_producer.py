## Consumer code so that everytime when events enter, it calls the notification-mgmt call back.
# POC for our producer code.
import pika
import json
import time
## Code over here can be reused throughout.
def connect_rabbit():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
            return connection
        except pika.exceptions.AMQPConnectionError:
            time.sleep(5)

def publish_event():
    print("INSIDE", flush=True)
    connection = connect_rabbit()
    channel = connection.channel()

    channel.exchange_declare(
        exchange="notification-exchange",
        exchange_type='topic',
        durable=True
    )

    event = {
        "eventName": "proof.concept",
        "itemId" : "specific id we might need to send over",
        "status": "SUCCESS",
        "userId": 123,
        "datetime": "2026-02-27T15:45:00"
    }

    channel.basic_publish(
        exchange="notification-exchange",
        routing_key="test",
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print("Message published.", flush=True)
print("Waiting to send")
