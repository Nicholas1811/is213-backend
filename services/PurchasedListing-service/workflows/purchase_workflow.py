from temporalio import workflow
from datetime import timedelta

with workflow.unsafe.imports_passed_through():
    from activities.listing_activity import get_listing_price
    from activities.points_activity import use_points
    from activities.payment_activity import charge_payment
    from activities.order_activity import create_order

# Code here runs out workflow that we need.
@workflow.defn
class PurchaseWorkflow:

    @workflow.run
    async def run(self, user_id, listing_id, quantity, points):

        listing = await workflow.execute_activity(
            get_listing_price,
            listing_id,
            start_to_close_timeout=timedelta(seconds=10)
        )

        price = listing["price"]
        total = price * quantity
        remaining = total - points

        ## Meaning if the amount of points you are using is > 0, meaning this is a mixed one
        ## do a post to the points activity.
        if points > 0:
            await workflow.execute_activity(
                use_points,
                user_id,
                points,
                start_to_close_timeout=timedelta(seconds=10)
            )

        payment_id = None
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

        return order