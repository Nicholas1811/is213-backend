from temporalio import activity
import requests

# Use points, POST for points.
## Add in fields for like type (reduction).
@activity.defn
async def use_points(user_id: int, points: int):

    r = requests.post(
        "http://points-service:8080/points/use",
        json={
            "userId": user_id,
            "points": points
        }
    )
    return r.json()

@activity.defn
async def refund_points(transaction_id: str):

    requests.post(
        "http://points-service:8080/points/refund",
        json={"transactionId": transaction_id}
    )