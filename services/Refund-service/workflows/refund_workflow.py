from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy
from refund_logic import derive_refund_workflow_status

with workflow.unsafe.imports_passed_through():
    from activities.payment_activity import refund_payment
    from activities.point_activity import deduct_points_compensation, restore_points

# Standard retry policy for initial activities
retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    maximum_attempts=5,
)

# Specialized retry policy for Sagas (Compensation activities)
# We use unlimited attempts (0) to ensure points are eventually deducted,
# preventing the "free points" inconsistency.
saga_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=5),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=30),
    maximum_attempts=0,
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
            # We use the SAGA_RETRY_POLICY here to guarantee point recovery
            compensation = []
            try:
                compensation.append({
                    "type": "deduct_points",
                    "result": await workflow.execute_activity(
                        deduct_points_compensation,
                        data,
                        start_to_close_timeout=timedelta(seconds=15),
                        retry_policy=saga_retry_policy,
                    ),
                })
            except Exception as comp_error:
                # This block is theoretically unreachable with maximum_attempts=0,
                # but kept for defensive programming and logging.
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

        # Final status depends on whether any refund work actually happened.
        return {
            "status": derive_refund_workflow_status(payment_result, point_result),
            "payment": payment_result,
            "points": point_result,
        }
