from temporalio import activity
import requests

@activity.defn

## From here, need qty, status, total paid as well.
async def create_order(user_id, listing_id, payment_id, point_id):

    r = requests.post(
        "http://order-service:8080/orders",
        json={
            "userId": user_id,
            "listingId": listing_id,
            "paymentId": payment_id,
            "pointId": point_id
        }
    )

    return r.json()