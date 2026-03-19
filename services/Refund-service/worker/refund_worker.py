import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from activities.payment_activity import refund_payment, reverse_refund
from activities.point_activity import deduct_points_compensation, restore_points
from workflows.refund_workflow import RefundWorkflow

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
    client = await connect_temporal()
    worker = Worker(
        client,
        task_queue="refund-task-queue",
        workflows=[RefundWorkflow],
        activities=[
            refund_payment,
            reverse_refund,
            restore_points,
            deduct_points_compensation,
        ],
    )
    print("Refund worker started")
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
