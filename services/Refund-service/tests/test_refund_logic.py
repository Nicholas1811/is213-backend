import unittest

from refund_logic import (
    COMPLETED_STATUS,
    SKIPPED_WORKFLOW_STATUS,
    derive_refund_workflow_status,
    normalize_refund_payload,
    refund_result_completed,
)


class RefundLogicTests(unittest.TestCase):
    def test_normalize_refund_payload_uses_legacy_payment_and_point_fields(self):
        payload = {
            "order_id": 216,
            "user_id": "user-1",
            "payment_id": "cs_test_123",
            "point_id": "point-ref-1",
        }

        normalized = normalize_refund_payload(payload)

        self.assertEqual(normalized["payment_checkout_id"], "cs_test_123")
        self.assertEqual(normalized["point_reference_id"], "point-ref-1")

    def test_normalize_refund_payload_keeps_canonical_fields(self):
        payload = {
            "order_id": 216,
            "user_id": "user-1",
            "payment_id": "legacy-checkout-id",
            "payment_checkout_id": "canonical-checkout-id",
        }

        normalized = normalize_refund_payload(payload)

        self.assertEqual(normalized["payment_checkout_id"], "canonical-checkout-id")

    def test_derive_refund_workflow_status_returns_skipped_for_full_no_op(self):
        status = derive_refund_workflow_status(
            {"status": "skipped", "message": "No payment to refund"},
            {"status": "skipped", "message": "No points to restore"},
        )

        self.assertEqual(status, SKIPPED_WORKFLOW_STATUS)

    def test_derive_refund_workflow_status_returns_completed_when_any_refund_happens(self):
        status = derive_refund_workflow_status(
            {"status": "succeeded", "refund_id": "re_123"},
            {"status": "skipped", "message": "No points to restore"},
        )

        self.assertEqual(status, COMPLETED_STATUS)

    def test_refund_result_completed_only_accepts_completed_workflows(self):
        self.assertTrue(refund_result_completed({"status": "COMPLETED"}))
        self.assertFalse(refund_result_completed({"status": "SKIPPED"}))


if __name__ == "__main__":
    unittest.main()
