import requests
from temporalio import activity
from class_model.input_model import RefundRequest

@activity.defn
def refund_payment(data):
    payment_checkout_id = data.get("payment_checkout_id")
    if not payment_checkout_id or str(payment_checkout_id).strip().lower() in ["none", "empty"]:
        return {"status": "skipped", "message": "No payment to refund"}

    response = requests.post(
        "http://payment-service:8080/refund",
        json={
            "payment_checkout_id": data.get("payment_checkout_id")
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Payment refund failed: {response.status_code} {response.text}")
    return response.json()
