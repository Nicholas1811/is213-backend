from email.feedparser import NeedMoreData

from temporalio import workflow
from datetime import timedelta
from temporalio.common import RetryPolicy
import uuid

with workflow.unsafe.imports_passed_through():
    from activities.get_listing_price import purchase_listing, reset_listing
    from activities.point_activity import use_points, refund_points
    from activities.payment_activity import charge_payment #, refund_payment
    from activities.order_creation import create_order, cancel_order, update_order_status, update_order_paymentId

retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    maximum_attempts=5,
)


@workflow.defn
class PurchaseWorkflow:
    @workflow.run
    async def run(self, data):
        sample_order_ref = str(workflow.uuid4())
        compensations = []
        order_ref = str(workflow.uuid4())
        order_id = None

        listing_deducted = False
        points_used = False
        order_id = None
        try:
            ## Listing here will lower the numbers.
            listing = await workflow.execute_activity(
                purchase_listing,
                {"listing_id": data['listing_id'],
                 "qty" : data['quantity']
                 },
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=retry_policy
            )
            #Making crash safe
            compensations.append(
                ("reset_listing", {
                    "listing_id": data["listing_id"],
                    "qty": data["quantity"]
                })
            )

            listing_deducted = True
            price = listing["unitPriceCents"] # Price from the listing.

            total = price * data['quantity'] # Total of quantity from user and the price.
            #remaining = total - data['points'] # Remaining from total - the point. If remaining < 0, we just call the order. If
            points_to_use = min(data["points"], total)
            remaining = total - points_to_use
            if(0 < remaining < 50):
                raise Exception("Remaining amount must be either 0 or at least 50 cents to proceed with payment.")
            print(remaining, flush=True)
            #more, then need to call checkout url.

            point = None
            if points_to_use > 0: #If using points
                ## Use points, a POST to the DB which says SPEND. You spend whatever that is lower, either ALL your points, or the total price.
                point = await workflow.execute_activity(
                    use_points,
                    {
                        "user_id": data['user_id'],
                        "points_changed": points_to_use, #Call endpoint to get user points on frontend.
                        "transaction_type" : "SPEND",
                        "reference_id" : sample_order_ref # Might want to bring the order creation flow on top first.
                    },
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=retry_policy
                )
                ## Crash safe
                compensations.append(
                    ("refund_points", {
                        "user_id": data["user_id"],
                        "points_changed": points_to_use,
                        "transaction_type": "REFUND",
                        "reference_id": order_ref
                    })
                )
                points_used = True
            ##If the remaining is less than 0, we instantly submit the order, else we need to return the checkout url.
            ## We send the orderID.
            ## Order ID would need the point ID first, then send it over.
            point_id = ""

            if(point!= None):
                point_id = point['id']
            enum_for_order = "PAID"
            if(remaining > 0):
                enum_for_order = "PENDING"

            order = await workflow.execute_activity(
                create_order,
                {
                    "user_id" : data['user_id'],
                    "listing_id": data['listing_id'],
                    "status" : enum_for_order,
                    "total_paid" : total,
                    "point_id" : point_id,
                    "payment_id" : "Empty",
                    "qty" : data['quantity'],
                },
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=retry_policy
            )
            ##TODO NIC: Update the point endpoint to have the referenceID using the orderID.
            print(order_id)
            order_id = order["id"]

            ##Crash safe
            compensations.append(
                ("cancel_order", {"order_id": order_id})
            )
            payment_id = None
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
                        "points_changed": points_to_use,
                    },
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=retry_policy
                )
                order_update = await workflow.execute_activity(
                    update_order_paymentId,
                    {
                        "order_id": order_id,
                        "payment_id": payment_id['checkout_id']
                    },
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=retry_policy)
                print(order_update, flush=True)
                return payment_id
            else:
                await workflow.execute_activity(
                    update_order_status,
                    {
                        "order_id": order_id
                    },
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=retry_policy
                )
                return {"status": "Order created, Paid fully using points!"}

        except Exception as e:
            workflow.logger.error("Workflow failed, running compensations")

            for action, payload in reversed(compensations):
                ## Must check over here.
                if action == "cancel_order":
                    await workflow.execute_activity(
                        cancel_order,
                        payload,
                        start_to_close_timeout=timedelta(seconds=10)
                    )

                elif action == "refund_points":
                    await workflow.execute_activity(
                        refund_points,
                        payload,
                        start_to_close_timeout=timedelta(seconds=10)
                    )

                elif action == "reset_listing":
                    await workflow.execute_activity(
                        reset_listing,
                        payload,
                        start_to_close_timeout=timedelta(seconds=10)
                    )

            raise