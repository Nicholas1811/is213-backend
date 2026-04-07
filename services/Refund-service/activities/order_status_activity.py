from temporalio import activity

from controller.order_status_publisher import publish_order_status


@activity.defn
def publish_order_status_activity(data):
    order_id = data.get("order_id")
    status = data.get("status")
    user_id = data.get("user_id")

    if not order_id:
        raise ValueError("order_id is required to publish order status")
    if not status:
        raise ValueError("status is required to publish order status")

    publish_order_status(order_id, status, user_id)
    return {"status": "published", "order_id": str(order_id), "order_status": str(status).upper()}
