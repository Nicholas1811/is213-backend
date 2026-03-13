from temporalio import workflow
from datetime import timedelta
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from activities.get_listing_price import purchase_listing, reset_listing
    from activities.point_activity import use_points, refund_points
    from activities.payment_activity import charge_payment #, refund_payment
    from activities.order_creation import create_order, cancel_order, update_order_status

retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    maximum_attempts=5,
)

@workflow.defn
class PurchaseWorkflow:
    @workflow.run
    async def run(self, data):
        listing_deducted = False
        points_used = False
        order_id = None
        try:
            ## Listing here will lower the numbers.
            listing = await workflow.execute_activity(
                purchase_listing,
                {"listing_id": data['listing_id']},
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=retry_policy
            )
            listing_deducted = True
            ## Calculate the points used, and minus together.
            price = listing["unitPriceCents"]
            total = price * data['quantity']
            remaining = total - data['points'] ##points from the UI side.

            ## If no points, then we dont use this, if user points is more than zero, we use points.
            point = None
            if data['points'] > 0:
                ## Use points, a POST to the DB which says SPEND. You spend whatever that is lower, either ALL your points, or the total price.
                point = await workflow.execute_activity(
                    use_points,
                    {
                        "user_id": data['user_id'],
                        "points_changed": data['points'],
                        "transaction_type" : "SPEND",
                        "reference_id" : "" # Might want to bring the order creation flow on top first.
                    },
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=retry_policy
                )
                points_used = True
                    ##If the remaining is less than 0, we instantly submit the order, else we need to return the checkout url.
            ## We send the orderID.
            ## Order ID would need the point ID first, then send it over.
            point_id = ""
            if(point!= None):
                point_id = point['id']

            order = await workflow.execute_activity(
                create_order,
                {
                    "user_id" : data['user_id'],
                    "listing_id": data['listing_id'],
                    "status" : "created",
                    "total_paid" : total,
                    "point_id" : point_id,
                    "payment_id" : "Empty",
                    "qty" : data['quantity'],
                },
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=retry_policy
            )
            order_id = order["order_id"]
            payment_id = "None"
            ## If points is not enough, means we pay more.
            ## You might need more details for the charge payment.
            if remaining > 0:
                payment_id = await workflow.execute_activity(
                    charge_payment,
                    {
                        ## For stripe stuff.
                        "user_id": data['user_id'],
                        "price": remaining,
                        ## Code here is for listing compensation.
                        "listing_id" : data['listing_id'],
                        "quantityToUpdate" : data['quantity'], #For listing service to add back
                        ## This is for order compensation, compensation need to update the paymentID and status maybe.
                        #Serves as reference ID
                        "orderId" : order_id,
                        ## This code below is for Point compensation.
                        "points_changed": data['points'],
                    },
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=retry_policy
                )
                return payment_id
            else:
                await workflow.execute_activity(
                    update_order_status,
                    order_id,
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=retry_policy
                )
            return {"status": "order created, point fully paid"}

        except Exception as e:
            workflow.logger.error("Workflow failed, starting compensations")
            if order_id:
                await workflow.execute_activity(
                    cancel_order,
                    {
                        "order_id": order_id
                    },
                    start_to_close_timeout=timedelta(seconds=10)
                )

            if points_used:
                await workflow.execute_activity(
                    refund_points,
                    {
                        "user_id": data['user_id'],
                        "points_changed": data['points'],
                        "transaction_type" : "REFUND",
                        "reference_id" : order_id # Might want to bring the order creation flow on top first.
                    },
                    start_to_close_timeout=timedelta(seconds=10)
                )
            ## Must check is it DB add or what
            if listing_deducted:
                await workflow.execute_activity(
                    reset_listing,
                    {"listing_id": data['listing_id'], "qty": data['quantity']},
                    start_to_close_timeout=timedelta(seconds=10)
                )
            raise