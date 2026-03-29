import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflows.purchase_workflow import PurchaseWorkflow
from activities.get_listing_price import purchase_listing, reset_listing
from activities.point_activity import use_points, refund_points
from activities.payment_activity import charge_payment
from activities.order_creation import create_order, cancel_order, update_order_status, update_order_paymentId


#In this method, we define a worker, in which it needs a workflow and the acitvities to pump the activities into the workflow.
async def connect_temporal():
    global temporal_client
    while True:
        try:
            client = await Client.connect("temporal:7233")
            temporal_client = client
            print("Connected to Temporal & ready")
            return temporal_client

        except Exception as e:
            print("Waiting for Temporal...", e)
            await asyncio.sleep(3)


async def main():
    client = await connect_temporal()
    worker = Worker(
        client,
        task_queue="purchase-task-queue",
        workflows=[PurchaseWorkflow],
        activities=[
            purchase_listing,
            reset_listing,
            use_points,
            cancel_order,
            refund_points,
            update_order_paymentId,
            update_order_status,
            charge_payment,
            create_order,
        ],
    )

    print("Worker started")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())