import uuid
from flask import Flask, request, jsonify
import asyncio
from temporalio.client import Client
import time

app = Flask(__name__)
temporal_client = None

async def connect_temporal():
    global temporal_client
    while True:
        try:
            client = await Client.connect("temporal:7233")
            temporal_client = client
            print("Connected to Temporal & ready")
            break
        except Exception as e:
            print("Waiting for Temporal...", e)
            await asyncio.sleep(3)

asyncio.run(connect_temporal())

@app.route("/purchase", methods=["POST"])
def purchase_listing():
    data = request.json

    listing_id = data.get("listing_id")
    user_id = data.get("user_id")
    quantity = data.get("quantity", 1)
    points = data.get("points", 0)

    workflow_id = str(uuid.uuid4())

    async def start_and_poll_workflow():
        handle = await temporal_client.start_workflow(
            "PurchaseWorkflow",
            {
                "user_id": user_id,
                "listing_id": listing_id,
                "quantity": quantity,
                "points": points
            },
            id=workflow_id,
            task_queue="purchase-task-queue",
        )
        
        checkout_url = None
        
        for _ in range(20):
            try:
                checkout_url = await handle.query("get_checkout_url")
                if checkout_url:
                    return {"checkout_url": checkout_url, "workflow_id": workflow_id}
            except Exception as e:
                pass
                
            await asyncio.sleep(0.5)

        return {"message": "Order processing started", "workflow_id": workflow_id}

    result = asyncio.run(start_and_poll_workflow())
    return jsonify(result)

@app.route("/health", methods=["GET"])
def health_check():
    return {"status":200, "message":"Healthy"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)