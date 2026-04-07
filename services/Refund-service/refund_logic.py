SKIPPED_STATUS = "skipped"
COMPLETED_STATUS = "COMPLETED"
SKIPPED_WORKFLOW_STATUS = "SKIPPED"

_EMPTY_SENTINELS = {"", "none", "empty", "null"}


def is_blank(value):
    if value is None:
        return True
    return str(value).strip().lower() in _EMPTY_SENTINELS


def normalize_refund_payload(data):
    normalized = dict(data)

    if is_blank(normalized.get("payment_checkout_id")) and not is_blank(normalized.get("payment_id")):
        normalized["payment_checkout_id"] = normalized.get("payment_id")

    if is_blank(normalized.get("point_reference_id")) and not is_blank(normalized.get("point_id")):
        normalized["point_reference_id"] = normalized.get("point_id")

    return normalized


def activity_was_skipped(result):
    if not isinstance(result, dict):
        return False
    return str(result.get("status", "")).strip().lower() == SKIPPED_STATUS


def derive_refund_workflow_status(payment_result, point_result):
    if activity_was_skipped(payment_result) and activity_was_skipped(point_result):
        return SKIPPED_WORKFLOW_STATUS
    return COMPLETED_STATUS


def refund_result_completed(result):
    if not isinstance(result, dict):
        return False
    return str(result.get("status", "")).strip().upper() == COMPLETED_STATUS
