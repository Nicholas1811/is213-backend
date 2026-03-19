import requests
from temporalio import activity

@activity.defn
async def restore_points(data):
    response = requests.post(
        "http://point-service:8080/points/transaction",
        json={
            "user_id": data["user_id"],
            "points_changed": int(data["points_amount"]),
            "transaction_type": "REFUND",
            "reference_id": str(data["order_id"]),
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Point restoration failed: {response.status_code} {response.text}")
    return response.json()

@activity.defn
async def deduct_points_compensation(data):
    response = requests.post(
        "http://point-service:8080/points/transaction",
        json={
            "user_id": data["user_id"],
            "points_changed": int(data["points_amount"]) * -1,
            "transaction_type": "SPEND",
            "reference_id": str(data["order_id"]),
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise Exception(f"Point compensation failed: {response.status_code} {response.text}")
    return response.json()
