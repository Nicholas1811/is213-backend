import pika
import json
import os
from controller.constants import REFUND_TASK_QUEUE
from controller.refund_controller import process_refund
from .order_status_publisher import publish_order_refunded

def start_order_result_consumer():
    rabbit_host = os.environ.get('RABBITMQ_HOST', 'localhost')
    import time
    
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=rabbit_host)
            )
            break
        except pika.exceptions.AMQPConnectionError:
            print("Waiting for RabbitMQ...")
            time.sleep(5)
            
    channel = connection.channel()
    
    channel.exchange_declare(
        exchange='cancel.order.fanout.events',
        exchange_type='fanout',
        durable=True
    )

    channel.queue_declare(queue=REFUND_TASK_QUEUE, durable=True)
    
    channel.queue_bind(
        exchange='cancel.order.fanout.events',
        queue=REFUND_TASK_QUEUE,
        routing_key=''
    )

    channel.basic_consume(
        queue=REFUND_TASK_QUEUE, 
        on_message_callback=on_order_result, 
        auto_ack=False 
    )

    print("[Consumer] Listening on queue:", REFUND_TASK_QUEUE, flush=True)
    channel.start_consuming()

def on_order_result(ch, method, properties, body):
    try:
        data = json.loads(body)
        order_id = data.get('order_id')

        if not order_id:
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        
        print(f"[Consumer] Received cancel request for order {order_id}", flush=True)

        result = process_refund(data)
        publish_order_refunded(order_id, data.get("user_id"))
        print(f"[Consumer] Refund result: {result}", flush=True)

        ch.basic_ack(delivery_tag=method.delivery_tag)
        return
    except Exception as e:
        print(f"[Consumer] Error processing refund: {e}", flush=True)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

