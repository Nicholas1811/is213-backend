import requests
from temporalio import activity

def get_actual_points(user_id, ref_id, default_points):
    """Helper to fetch actual points from point-service natively via transaction ID."""
    if not ref_id or str(ref_id).strip().lower() in ["none", "empty"]:
        return default_points
    try:
        res = requests.get(f"http://point-service:8080/transaction/details/{ref_id}", timeout=5)
        if res.status_code == 200:
            tx = res.json()
            return abs(int(tx.get("points_changed", 0)))
        raise Exception(f"Point lookup failed: {res.status_code} {res.text}")
    except Exception as e:
        raise Exception(f"Failed to fetch points for {ref_id}: {e}")

@activity.defn
def restore_points(data):
    ref_id = data.get("point_reference_id")
    user_id = data.get("user_id")
    
    if not ref_id or str(ref_id).strip().lower() in ["none", "empty"]:
        return {"status": "skipped", "message": "No points to restore"}

    points_amount = get_actual_points(user_id, ref_id, 0)

    if points_amount is None or int(points_amount) <= 0:
        raise Exception(f"Invalid points amount resolved for refund reference {ref_id}: {points_amount}")

    response = requests.post(
        "http://point-service:8080/transaction",
        json={
            "user_id": data.get("user_id"),
            "points_changed": int(points_amount),
            "transaction_type": "REFUND",
            "reference_id": str(ref_id),
        },
        timeout=10,
    )

    if response.status_code >= 400:
        raise Exception(f"Point restoration failed: {response.status_code} {response.text}")
    return response.json()

@activity.defn
def deduct_points_compensation(data):
    ref_id = data.get("point_reference_id")
    user_id = data.get("user_id")

    if not ref_id or str(ref_id).strip().lower() in ["none", "empty"]:
        return {"status": "skipped", "message": "No points to compensate"}

    points_amount = get_actual_points(user_id, ref_id, 0)

    if points_amount is None or int(points_amount) <= 0:
        raise Exception(f"Invalid points amount resolved for compensation reference {ref_id}: {points_amount}")

    response = requests.post(
        "http://point-service:8080/transaction",
        json={
            "user_id": data.get("user_id"),
            "points_changed": int(points_amount) * -1,
            "transaction_type": "SPEND",
            "reference_id": f"{ref_id}-comp",
        },
        timeout=10, 
    )
    if response.status_code >= 400:
        raise Exception(f"Point compensation failed: {response.status_code} {response.text}")
    return response.json()
