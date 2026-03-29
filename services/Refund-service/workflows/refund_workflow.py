import asyncio
from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from activities.payment_activity import refund_payment
    from activities.point_activity import deduct_points_compensation, restore_points

retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    maximum_attempts=5,
)

@workflow.defn
class RefundWorkflow:
    @workflow.run
    async def run(self, data):

        # Step 1: Restore points first (this is reversible)
        try:
            point_result = await workflow.execute_activity(
                restore_points,
                data,
                start_to_close_timeout=timedelta(seconds=15),
                retry_policy=retry_policy,
            )
        except Exception as error:
            # Points failed — stop here, no harm done
            return {
                "status": "FAILED",
                "point_error": str(error),
                "payment": None,
                "points": None,
            }

        # Step 2: Process Stripe refund (this is irreversible)
        try:
            payment_result = await workflow.execute_activity(
                refund_payment,
                data,
                start_to_close_timeout=timedelta(seconds=15),
                retry_policy=retry_policy,
            )
        except Exception as error:
            # Payment failed — compensate by deducting the points back
            compensation = []
            try:
                compensation.append({
                    "type": "deduct_points",
                    "result": await workflow.execute_activity(
                        deduct_points_compensation,
                        data,
                        start_to_close_timeout=timedelta(seconds=15),
                        retry_policy=retry_policy,
                    ),
                })
            except Exception as comp_error:
                compensation.append({
                    "type": "deduct_points",
                    "error": str(comp_error),
                })

            return {
                "status": "FAILED",
                "payment_error": str(error),
                "points": point_result,
                "payment": None,
                "compensation": compensation,
            }

        # Both succeeded!
        return {
            "status": "COMPLETED",
            "payment": payment_result,
            "points": point_result,
        }
