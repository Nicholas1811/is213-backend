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

def publish_event():
    print("Event is starting to get published.", flush=True)
    connection = connect_rabbit()
    channel = connection.channel()

    channel.exchange_declare(
        exchange="notification-exchange",
        exchange_type='topic',
        durable=True
    )

    ## Mock events, you guys can use this as reference to know what to send.
    event = {
        "event_id" : str(uuid.uuid4()),
        "key" : "order.created", #binding key
        "userId" : "temp-user-id", ##TODO CHANGE HERE
        "event_original_id" : "your id from your original table, on FE, this one for onclick and query"
    }
## Sample routing key, change according to your needs.
    channel.basic_publish(
        exchange="notification-exchange",
        routing_key="order.created", #Here
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print("Message published.", flush=True)
print("Waiting to send")
