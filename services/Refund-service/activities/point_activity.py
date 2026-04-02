import requests
from temporalio import activity

@activity.defn
def restore_points(data):
    points_amount = data.get("points_amount")
    ref_id = data.get("point_reference_id")
    
    if str(points_amount).strip().lower() in ["none", "empty"]:
        points_amount = 0

    
    if not ref_id or str(ref_id).strip().lower() in ["none", "empty"] or points_amount is None or float(points_amount) <= 0:
        return {"status": "skipped", "message": "No points to restore"}

    response = requests.post(
        "http://point-service:8080/transaction",
        json={
            "user_id": data.get("user_id"),
            "points_changed": float(points_amount),
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
    points_amount = data.get("points_amount")
    ref_id = data.get("point_reference_id")
    
    if str(points_amount).strip().lower() in ["none", "empty"]:
        points_amount = 0
        
    if not ref_id or str(ref_id).strip().lower() in ["none", "empty"] or points_amount is None or float(points_amount) <= 0:
        return {"status": "skipped", "message": "No points to compensate"}

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
