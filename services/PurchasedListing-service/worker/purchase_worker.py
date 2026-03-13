import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflows.purchase_workflow import PurchaseWorkflow
from activities.get_listing_price import purchase_listing
from activities.point_activity import use_points
from activities.payment_activity import charge_payment
from activities.order_creation import create_order


#In this method, we define a worker, in which it needs a workflow and the acitvities to pump the activities into the workflow.
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
        task_queue="purchase-task-queue",
        workflows=[PurchaseWorkflow],
        activities=[
            purchase_listing,
            use_points,
            charge_payment,
            create_order,
        ],
    )

    print("Worker started")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())