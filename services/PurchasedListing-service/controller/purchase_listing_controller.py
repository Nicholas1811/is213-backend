from flask import Flask, request, jsonify
import asyncio
from temporalio.client import Client
import stripe
import time

app = Flask(__name__)
temporal_client = None



async def connect_temporal():
    global temporal_client

    while True:
        try:
            temporal_client = await Client.connect("temporal:7233")
            print("Connected to Temporal")
            break
        except Exception as e:
            print("Waiting for Temporal...", e)
            time.sleep(3)

asyncio.run(connect_temporal())
# Start purchase workflow
## If point is 0, we do not call the use points activity.
## If points is more than zero (from frontend, we call ground truth), we just add this in.
@app.route("/purchase", methods=["POST"])
def purchase_listing():

    data = request.json

    listing_id = data.get("listing_id")
    user_id = data.get("user_id")
    quantity = data.get("quantity", 1)
    points = data.get("points", 0)

    workflow_id = f"purchase-{listing_id}"

    async def start_workflow():
        result = await temporal_client.execute_workflow(
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
        return result

    result = asyncio.run(start_workflow())

    return jsonify(result)

@app.route("/health", methods=["GET"])
def health_check():
    return {"status":200, "message":"Healthy"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)