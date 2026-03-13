from email.policy import default

from temporalio import activity
import requests

@activity.defn

## From here, need qty, status, total paid as well.
async def create_order(data):

    r = requests.post(
        "http://order-service:8080/orders",
        json={
            "user_id" : data['user_id'],
            "listing_id": data['listing_id'],
            "status" : "created",
            "total_paid" : data['total_paid'],
            "point_id" : data['point_id'],
            "payment_id" : "Empty",
            "qty" : data['qty'],
        }
    )
    return r.json()

@activity.defn
async def cancel_order(data):
    r = requests.put("http://order-service:8080/orders/cancel",
                    )
    return r

@activity.defn
async def update_order_status(orderId):
    r = requests.put(f"http://order-service:8080/orders/{orderId}",
        json={
            "status": "success"
        }
    )