import pika
from temporalio import activity

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