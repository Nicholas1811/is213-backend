from temporalio import activity
import requests

## Calls wrapper payment service
@activity.defn
async def charge_payment(user_id: int, amount: float):

    r = requests.post(
        "http://payment-service:8080/process-payment",
        json={
            "userId": user_id,
            "amount": amount
        }
    )

    return r.json()

## Calls refund.
@activity.defn
async def refund_payment(payment_id: str):

    requests.post(
        "http://payment-service:8080/refund",
        json={"paymentId": payment_id}
    )