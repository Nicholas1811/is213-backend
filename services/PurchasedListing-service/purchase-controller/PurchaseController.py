# purchase-api/main.py

from fastapi import FastAPI
from temporalio.client import Client
from workflows import purchase_workflow

app = FastAPI()

@app.post("/purchase")
async def start_purchase(user_id: str, item_id: str):

    client = await Client.connect("temporal:7233")

    handle = await client.start_workflow(
        purchase_workflow.run,
        user_id,
        item_id,
        id=f"purchase-{user_id}-{item_id}",
        task_queue="purchase-task-queue",
    )

    return {"workflow_id": handle.id}