from temporalio import activity
import requests

## Calls wrapper payment service
@activity.defn
async def charge_payment(data):

    r = requests.post(
        "http://payment-service:8080/payment/process-payment",
        json={
            "user_id": data['user_id'],
            "price": int(data['price']),
            "qty" : int(data['quantityToUpdate'])
        }
    )
    if r.status_code != 200:
        raise Exception(f"Payment service failed: {r.status_code} {r.text}")

    return r.json()


