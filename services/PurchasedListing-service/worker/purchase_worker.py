import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflows.purchase_workflow import PurchaseWorkflow
from activities.listing_activity import get_listing_price
from activities.points_activity import use_points
from activities.payment_activity import charge_payment
from activities.order_activity import create_order


#In this method, we define a worker, in which it needs a workflow and the acitvities to pump the activities into the workflow.
async def main():
    client = await Client.connect("temporal:7233")
    worker = Worker(
        client,
        task_queue="purchase-task-queue",
        workflows=[PurchaseWorkflow],
        activities=[
            get_listing_price,
            use_points,
            charge_payment,
            create_order,
        ],
    )

    print("Worker started")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())