import asyncio
from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy
from class_model.input_model import RefundRequest

with workflow.unsafe.imports_passed_through():
    from activities.payment_activity import refund_payment, reverse_refund
    from activities.point_activity import deduct_points_compensation, restore_points

retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    maximum_attempts=5,
)

def payment_task_result(data):
    payment_task = asyncio.create_task(
                workflow.execute_activity(
                    refund_payment,
                    data,
                    start_to_close_timeout=timedelta(seconds=15),
                retry_policy=retry_policy,
            ))
    return payment_task

def point_task_result(data):
    point_task = asyncio.create_task(
            workflow.execute_activity(
                restore_points,
                data,
                start_to_close_timeout=timedelta(seconds=15),
                retry_policy=retry_policy,
            ))
    return point_task

@workflow.defn
class RefundWorkflow:
    @workflow.run
    async def run(self, data: RefundRequest):

        # convert to dictionary
        if hasattr(data, "dict"):
            payload = data.dict()
        else:
            payload = data.model_dump()

        payment_task = None
        point_task = None
        payment_result = None
        point_result = None

        # process either or field
        if payload.get("payment_intent_id") is not None:
            payment_task = payment_task_result(payload)

        if payload.get("point_reference_id") is not None:
            point_task = point_task_result(payload)

        payment_error = None
        point_error = None

        if payment_task:
            try:
                payment_result = await payment_task
            except Exception as error:
                payment_error = str(error)

        if point_task:
            try:
                point_result = await point_task
            except Exception as error:
                point_error = str(error)

        if payment_error is None and point_error is None:
            return {
                "status": "COMPLETED",
                "payment": payment_result,
                "points": point_result,
            }
        compensation = []
        if point_task and point_error is None:
            try:
                compensation.append(
                    {
                        "type": "deduct_points",
                        "result": await workflow.execute_activity(
                            deduct_points_compensation,
                            data,
                            start_to_close_timeout=timedelta(seconds=15),
                        ),
                    }
                )
            except Exception as error:
                compensation.append(
                    {
                        "type": "deduct_points",
                        "error": str(error),
                    }
                )
        if payment_task and payment_error is None and payment_result is not None and payment_result.get("refund_id"):
            try:
                compensation.append(
                    {
                        "type": "reverse_refund",
                        "result": await workflow.execute_activity(
                            reverse_refund,
                            {"refund_id": payment_result.get("refund_id")},
                            start_to_close_timeout=timedelta(seconds=15),
                        ),
                    }
                )
            except Exception as error:
                compensation.append(
                    {
                        "type": "reverse_refund",
                        "error": str(error),
                    }
                )
        return {
            "status": "FAILED",
            "payment": payment_result,
            "payment_error": payment_error,
            "points": point_result,
            "point_error": point_error,
            "compensation": compensation,
        }
