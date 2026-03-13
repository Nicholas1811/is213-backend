import pika
from temporalio import activity

#publish to rabbit.
# I need the orderId, userId as well, and the eventType.
@activity.defn
async def publish_purchase_event(order_id):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters("rabbitmq")
    )
    channel = connection.channel()

    channel.basic_publish(
        exchange="",
        routing_key="purchase.success",
        body=str(order_id)
    )

    connection.close()