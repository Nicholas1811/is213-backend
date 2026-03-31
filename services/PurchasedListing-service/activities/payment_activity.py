from temporalio import activity
import requests

## Calls wrapper payment service
@activity.defn
async def charge_payment(data):

    # tracking of workflow
    info = activity.info()

    r = requests.post(
        "http://payment-service:8080/process-payment",
        json={
            "user_id": data['user_id'],
            "price": int(data['price']),
            "quantity_to_update" : int(data['quantityToUpdate']),
            "listing_id" : data['listing_id'],
            "order_id" : data['orderId'],
            "points_changed" : int(data['points_changed']),
            "workflow_id": info.workflow_id
        }
    )
    print("Payment data is: " , r.json(), flush=True)
    if r.status_code != 200:
        raise Exception(f"Payment service failed: {r.status_code} {r.text}")

    return r.json()


