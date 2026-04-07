import asyncio
from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy
from class_model.input_model import RefundRequest

with workflow.unsafe.imports_passed_through():
    from activities.payment_activity import refund_payment
    from activities.point_activity import deduct_points_compensation, restore_points
    from activities.order_status_activity import publish_order_status_activity

# Fast-fail testing profile for initial activities (points restore + payment refund).
# This keeps retries short so failed refunds move to REFUND_FAILED quickly during local tests.
# Effective behavior:
# - 2 attempts total
# - backoff starts at 1s and caps at 3s
retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=3),
    maximum_attempts=2,
)

# Fast-fail testing profile for compensation activity (deduct_points_compensation).
# If payment refund fails, this controls how quickly compensation gives up for test runs.
# Effective behavior:
# - 2 attempts total
# - backoff starts at 1s and caps at 3s
saga_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=3),
    maximum_attempts=2,
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
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=retry_policy,
            )
        except Exception as error:
            await workflow.execute_activity(
                publish_order_status_activity,
                {
                    "order_id": data.get("order_id"),
                    "user_id": data.get("user_id"),
                    "status": "REFUND_FAILED",
                },
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=retry_policy,
            )

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
                start_to_close_timeout=timedelta(seconds=5),
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
                        start_to_close_timeout=timedelta(seconds=5),
                        retry_policy=saga_retry_policy,
                    ),
                })
            except Exception as comp_error:
                # Compensation exhausted bounded retries.
                compensation.append({
                    "type": "deduct_points",
                    "error": str(comp_error),
                })

            await workflow.execute_activity(
                publish_order_status_activity,
                {
                    "order_id": data.get("order_id"),
                    "user_id": data.get("user_id"),
                    "status": "REFUND_FAILED",
                },
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=retry_policy,
            )

            return {
                "status": "FAILED",
                "payment_error": str(error),
                "points": point_result,
                "payment": None,
                "compensation": compensation,
            }

        # Both succeeded!
        await workflow.execute_activity(
            publish_order_status_activity,
            {
                "order_id": data.get("order_id"),
                "user_id": data.get("user_id"),
                "status": "REFUNDED",
            },
            start_to_close_timeout=timedelta(seconds=5),
            retry_policy=retry_policy,
        )

        return {
            "status": "COMPLETED",
            "payment": payment_result,
            "points": point_result,
        }

