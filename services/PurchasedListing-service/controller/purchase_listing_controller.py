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
@app.route("/purchase", methods=["POST"])
def purchase_listing():
    data = request.json

    listing_id = data.get("listing_id")
    buyer_id = data.get("buyer_id")

    workflow_id = f"purchase-{listing_id}"

    async def start_workflow():
        await temporal_client.start_workflow(
            "purchase-workflow",
            {"listing_id": listing_id, "buyer_id": buyer_id},
            id=workflow_id,
            task_queue="purchase-task-queue",
        )

    asyncio.run(start_workflow())

    ## Return the checkout url here
    return jsonify({
        "message": "Purchase workflow started",
        "workflow_id": workflow_id
    })

## Endpoint secret by stripe.

endpoint_secret = "xyz"
@app.route("/webhook/payment", methods=["POST"])
def confirmWebhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            endpoint_secret
        )
    except stripe.error.SignatureVerificationError:
        return jsonify({"error": "Invalid signature"}), 400
    # Handle event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        workflow_id = session["metadata"].get("workflow_id")
        print("Payment completed for workflow:", workflow_id)
        ## Call order service to update over here.
        # Here you would signal your workflow / continue processing
    else:
        pass
        #Failure events, so we call the compensation here, which is to
        #1) Refund Points, Update Lising, Set Order to cancelled.

    return jsonify({"status": "success"}), 200

@app.route("/health", methods=["GET"])
def health_check():
    return {"status":200, "message":"Healthy"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)