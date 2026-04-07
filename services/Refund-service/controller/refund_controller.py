import asyncio
from flask import Flask, jsonify, request
from temporalio.client import Client
from refund_logic import normalize_refund_payload

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
            await asyncio.sleep(3)

asyncio.run(connect_temporal())

def _validate_refund_payload(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    normalized_data = normalize_refund_payload(data)
    required_fields = ["order_id", "user_id"]
    missing = [field for field in required_fields if normalized_data.get(field) in (None, "")]

    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    return normalized_data


async def _fire_refund_workflow(data, wait_for_completion=False):
    workflow_id = f"refund-{data['order_id']}"

    handle = await temporal_client.start_workflow(
        "RefundWorkflow",
        data,
        id=workflow_id,
        task_queue="refund-task-queue",
    )

    if wait_for_completion:
        return await handle.result()

    return {"workflow_id": handle.id, "status": "STARTED"}


def execute_refund(data, wait_for_completion=False):
    normalized_data = _validate_refund_payload(data)
    loop = asyncio.new_event_loop()

    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(
            _fire_refund_workflow(
                normalized_data,
                wait_for_completion=wait_for_completion,
            )
        )
    finally:
        asyncio.set_event_loop(None)
        loop.close()


@app.route("/process", methods=["POST"])
def process_refund(data=None):
    if data is None:
        data = request.get_json(silent=True)

    try:
        result = execute_refund(data, wait_for_completion=False)
        status_code = 200
        return result, status_code
    except ValueError as error:
        return {"error": str(error)}, 400
    except Exception as error:
        return {"error": str(error)}, 500

# send refund confirmation to notification service (mock_producer, producer.py)
def send_notification(data=None):
    if data is None:
        data = request.get_json(silent=True)

    try:
        result = execute_refund(data, wait_for_completion=False)
        status_code = 200
        return jsonify(result), status_code
    except ValueError as error:
        return {"error": str(error)}, 400
    except Exception as error:
        return {"error": str(error)}, 500

@app.route("/health", methods=["GET"])
def health_check():
    return {"status": 200, "message": "Healthy"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
