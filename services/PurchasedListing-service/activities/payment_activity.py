from temporalio import activity
import requests


@activity.defn
async def charge_payment(user_id: int, amount: float):

    r = requests.post(
        "http://payment-service:8080/pay",
        json={
            "userId": user_id,
            "amount": amount
        }
    )

    return r.json()

## Change to the refund composite microservice.
@activity.defn
async def refund_payment(payment_id: str):
    requests.post(
        "http://refund-service:8080/payment",
        json={"paymentId": payment_id}
    )