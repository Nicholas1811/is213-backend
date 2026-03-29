import requests
from temporalio import activity

@activity.defn
def refund_payment(data):
    response = requests.post(
        "http://payment-service:8080/payment/refund",
        json={
            "payment_intent_id": data["payment_intent_id"]
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Payment refund failed: {response.status_code} {response.text}")
    return response.json()

    return response.json()
