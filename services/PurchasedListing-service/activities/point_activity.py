from temporalio import activity
import requests
import uuid

# Use points, POST for points.
## Add in fields for like type (reduction).
@activity.defn
async def use_points(data):
    print(data, flush=True)
    r = requests.post(
        "http://point-service:8080/transaction",
        json={
            "user_id": data['user_id'],
            "points_changed": data['points_changed'] * -1,
            "transaction_type" : "SPEND",
            "reference_id" : str(uuid.uuid4())
        }
    )
    print("Point entry is: " , r.json(), flush=True)
    if r.status_code >= 400:
        raise Exception(f"Points service error: {r.status_code} {r.text}")
    return r.json()

@activity.defn
async def refund_points(data):
    r = requests.post(
        "http://point-service:8080/transaction",
        json={
            "user_id": data['user_id'],
            "points_changed": data['points_changed'],
            "transaction_type" : "REFUND",
            "reference_id" : data['reference_id']
        }
    )
    print("Point entry refund is: " , r.json(), flush=True)
    if r.status_code >= 400:
        raise Exception(f"Points service error during refund: {r.status_code} {r.text}")
    return r.json()

@activity.defn
async def updatePointWithOrderId(data):
    print(data, flush=True)
    try:
        response = requests.patch(
            f"http://point-service:8080/transaction/{data['transaction_id']}",
            json={
                "new_ref_id": data['order_id']
            },
            timeout=5
        )
        print("Update Point with Order ID data is: " , response.json(), flush=True)
        if response.status_code >= 400:
            raise Exception(
                f"Points service error during update: "
                f"{response.status_code} {response.text}"
            )
        return response.json()
    except requests.RequestException as e:
        raise Exception(f"HTTP request failed: {str(e)}")