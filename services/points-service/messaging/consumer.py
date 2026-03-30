import pika
import json
import os
from .constants import AI_RESULT_QUEUE 
from services import handle_ai_verdict

def on_ai_result(ch, method, properties, body):
    try:
        data = json.loads(body)
        trans_id = data.get('trans_id')
        user_id = data.get('user_id')
        status = data.get('status')

        if not trans_id:
            # remove from queue
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        success = handle_ai_verdict(trans_id, user_id, status)
        print(success, flush=True)
        if success:
            print(f" [v] Successfully updated DB for {trans_id}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
        else:
            #remove from queue
            ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        #remove from queue
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_ai_result_consumer():
    rabbit_host = os.environ.get('RABBITMQ_HOST', 'localhost')
    
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=rabbit_host)
    )
    channel = connection.channel()
    
    channel.queue_declare(queue=AI_RESULT_QUEUE, durable=True)

    channel.basic_consume(
        queue=AI_RESULT_QUEUE, 
        on_message_callback=on_ai_result, 
        auto_ack=False 
    )

    channel.start_consuming()