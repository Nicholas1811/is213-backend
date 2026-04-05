from email.policy import default

from temporalio import activity
import requests

@activity.defn

## From here, need qty, status, total paid as well.
async def create_order(data):

    r = requests.post(
        "http://order-service:8080/",
        json={
            "user_id" : data['user_id'],
            "listing_id": data['listing_id'],
            "status" : "PENDING",
            "total_paid" : data['total_paid'],
            "point_id" : data['point_id'],
            "payment_id" : "Empty",
            "qty" : data['qty'],
        }
    )
    print("Order data is: ",  r.json(), flush=True)
    if r.status_code >= 400 or r.status_code >= 500:
        raise Exception(f"Order service failed: {r.status_code} {r.text}")
    return r.json()

@activity.defn
async def cancel_order(data):
    r = requests.put(f"http://order-service:8080/cancel/{data['order_id']}")
    if r.status_code >= 400 or r.status_code >= 500:
        raise Exception(f"Order service failed: {r.status_code} {r.text}")
    return r.json()

@activity.defn
async def update_order_status(data):
    r = requests.put(f"http://order-service:8080/{data['order_id']}",
        json={
            "status": "PAID"
        }
    )
    print("Update Order Status is: ",  r.json(), flush=True)
    if r.status_code >= 400 or r.status_code >= 500:
        raise Exception(f"Order service failed: {r.status_code} {r.text}")
    return r.json()

@activity.defn
async def update_order_paymentId(data):
    print(data, flush=True)
    r = requests.put(f"http://order-service:8080/{data['order_id']}",
            json={
            "payment_id": data['payment_id']
        }
    )
    print("Update Order Payment ID: " , r.json(), flush=True)
    if r.status_code >= 400 or r.status_code >= 500:
        raise Exception(f"Order service failed: {r.status_code} {r.text}")
    return r.json()

@activity.defn
async def update_order_pointId(data):
    r = requests.put(f"http://order-service:8080/{data['order_id']}",
                     json={
                         "point_id": data['point_id']
                     }
                     )
    print("Update Order Point ID is: ", r.json(), flush=True)
    if r.status_code >= 400 or r.status_code >= 500:
        raise Exception(f"Order service failed: {r.status_code} {r.text}")
    return r.json()