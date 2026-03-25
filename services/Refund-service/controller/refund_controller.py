import asyncio
import time
from flask import Flask, jsonify, request
from temporalio.client import Client
from typing import Optional
from pydantic import BaseModel, ValidationError
from class_model.input_model import RefundRequest

app = Flask(__name__)
temporal_client = None

async def connect_temporal():
    global temporal_client
    while True:
        try:
            temporal_client = await Client.connect("temporal:7233")
            print("Connected to Temporal")
            break
        except Exception as error:
            print("Waiting for Temporal...", error)
            time.sleep(3)

asyncio.run(connect_temporal())

@app.route("/process", methods=["POST"])
def process_refund():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return {"error": "Request body must be a JSON object"}, 400
    required_fields = ["order_id", "user_id"]

    try:
        # unpack refund request class into dictionary
        validated_request = RefundRequest(**data)
    except ValidationError as e:
        # error handling to catch any errors converting
        return {"error": e.errors()}, 400

    # point id and payment id is either or, whichever is not null, go and process
    if not validated_request.point_reference_id and not validated_request.payment_intent_id:
        return {"error": "Missing required fields: either point_reference_id or payment_intent_id must be provided"}, 400
    workflow_id = f"refund-{validated_request.order_id}"

    # convert to dictionary
    if hasattr(validated_request, "dict"):
        payload = validated_request.dict()
    else:
        payload = validated_request.model_dump()

    async def start_workflow():
        return await temporal_client.execute_workflow(
            "RefundWorkflow",
            payload,
            id=workflow_id,
            task_queue="refund-task-queue",
        )
    try:
        result = asyncio.run(start_workflow())
        status_code = 200 if result.get("status") == "COMPLETED" else 500
        return jsonify(result), status_code
    except Exception as error:
        return {"error": str(error)}, 500

@app.route("/health", methods=["GET"])
def health_check():
    return {"status": 200, "message": "Healthy"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
