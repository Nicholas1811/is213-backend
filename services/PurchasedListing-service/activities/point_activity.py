from temporalio import activity
import requests

# Use points, POST for points.
## Add in fields for like type (reduction).
@activity.defn
async def use_points(data):
    print(data, flush=True)
    r = requests.post(
        "http://point-service:8080/points/transaction",
        json={
            "user_id": data['user_id'],
            "points_changed": data['points_changed'] * -1,
            "transaction_type" : "SPEND",
            "reference_id" : "a" #Might want to bring the order creation flow on top first.
        }
    )
    if r.status_code >= 400:
        raise Exception(f"Points service error: {r.status_code} {r.text}")
    return r.json()

@activity.defn
async def refund_points(data):
    r = requests.post(
        "http://point-service:8080/points/transaction",
        json={
            "user_id": data['user_id'],
            "points_changed": data['points_changed'],
            "transaction_type" : "REFUND",
            "reference_id" : "a" #orderID here.
        }
    )
    if r.status_code >= 400:
        raise Exception(f"Points service error during refund: {r.status_code} {r.text}")
    return r.json()