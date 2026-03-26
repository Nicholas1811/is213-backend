import requests
from temporalio import activity

@activity.defn
async def refund_payment(data):
    # Call payment-service /process-payment endpoint
    response = requests.post(
        "http://payment-service:8080/payment/process-payment",
        json={
            "user_id": data["user_id"],
            "price": int(data["refund_amount"]),  # refund_amount should be positive
            "qty": 1  # Refund is always for 1 transaction
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Payment refund failed: {response.status_code} {response.text}")
    return response.json()

@activity.defn
async def reverse_refund(data):
    response = requests.post(
        "http://payment-service:8080/payment/reverse-refund",
        json={"refund_id": data["refund_id"]},
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Payment refund compensation failed: {response.status_code} {response.text}")
    return response.json()
