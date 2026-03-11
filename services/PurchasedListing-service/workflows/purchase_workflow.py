from temporalio import workflow
from datetime import timedelta

with workflow.unsafe.imports_passed_through():
    from activities.get_listing_price import get_listing_price
    from activities.point_activity import use_points, refund_points
    from activities.payment_activity import charge_payment, refund_payment
    from activities.order_creation import create_order


@workflow.defn
class PurchaseWorkflow:
    @workflow.run
    async def run(self, user_id, listing_id, quantity, points):
        points_used = False
        payment_id = None
        order_id = None
        try:
            listing = await workflow.execute_activity(
                get_listing_price,
                listing_id,
                start_to_close_timeout=timedelta(seconds=10)
            )
            price = listing["price"]
            total = price * quantity
            remaining = total - points

            if points > 0:
                await workflow.execute_activity(
                    use_points,
                    user_id,
                    points,
                    start_to_close_timeout=timedelta(seconds=10)
                )
                points_used = True

            if remaining > 0:
                payment_id = await workflow.execute_activity(
                    charge_payment,
                    user_id,
                    remaining,
                    start_to_close_timeout=timedelta(seconds=10)
                )

            order = await workflow.execute_activity(
                create_order,
                user_id,
                listing_id,
                payment_id,
                start_to_close_timeout=timedelta(seconds=10)
            )

            order_id = order["order_id"]

            return order

        except Exception:

            workflow.logger.error("Workflow failed, starting compensations")

            if order_id:
                await workflow.execute_activity(
                    cancel_order,
                    order_id,
                    start_to_close_timeout=timedelta(seconds=10)
                )

            if payment_id:
                await workflow.execute_activity(
                    refund_payment,
                    payment_id,
                    start_to_close_timeout=timedelta(seconds=10)
                )

            if points_used:
                await workflow.execute_activity(
                    refund_points,
                    user_id,
                    points,
                    start_to_close_timeout=timedelta(seconds=10)
                )

            raise