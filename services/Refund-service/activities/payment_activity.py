import requests
from temporalio import activity
from refund_logic import is_blank, normalize_refund_payload


@activity.defn
def refund_payment(data):
    normalized_data = normalize_refund_payload(data)
    payment_checkout_id = normalized_data.get("payment_checkout_id")

    if is_blank(payment_checkout_id):
        print(payment_checkout_id)
        return {"status": "skipped", "message": "No payment to refund"}

    response = requests.post(
        "http://172.20.10.5:8000/payment/refund",
        json={"payment_checkout_id": payment_checkout_id},
        timeout=10,
    )
    print(response)

    if response.status_code >= 400:
        raise Exception(
            f"Payment refund failed: {response.status_code} {response.text}"
        )
    return response.json()
