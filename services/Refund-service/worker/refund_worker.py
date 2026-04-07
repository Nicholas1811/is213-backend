import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
import concurrent.futures
import threading

from activities.payment_activity import refund_payment
from activities.point_activity import deduct_points_compensation, restore_points
from activities.order_status_activity import publish_order_status_activity
from workflows.refund_workflow import RefundWorkflow
from controller.consumer import start_order_result_consumer
from controller.consume_listing_cancelled import start_refund_consumer

async def connect_temporal():
    while True:
        try:
            client = await Client.connect("temporal:7233")
            print("Connected to Temporal")
            return client
        except Exception:
            print("Waiting for Temporal...")
            await asyncio.sleep(3)

async def main():
    # start rabbitmq consumer
    threading.Thread(target=start_order_result_consumer, daemon=True).start()
    threading.Thread(target=start_refund_consumer, daemon=True).start()

    client = await connect_temporal()
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as activity_executor:
        worker = Worker(
            client,
            task_queue="refund-task-queue",
            workflows=[RefundWorkflow],
            activities=[
                refund_payment,
                restore_points,
                deduct_points_compensation,
                publish_order_status_activity,
            ],
            activity_executor=activity_executor,
        )
        print("Refund worker started")
        await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
