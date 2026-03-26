import requests
from temporalio import activity
from class_model.input_model import RefundRequest

@activity.defn
async def refund_payment(data):
    # Call payment-service /process-payment endpoint
    response = requests.post(
        "http://payment-service:8080/refund",
        json={
            "payment_intent_id": data.get("payment_intent_id")
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Payment refund failed: {response.status_code} {response.text}")
    return response.json()

@activity.defn
async def reverse_refund(data):
    response = requests.post(
        "http://payment-service:8080/refund",
        json={"payment_intent_id": data.get("payment_intent_id")},
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Payment refund compensation failed: {response.status_code} {response.text}")
    return response.json()
