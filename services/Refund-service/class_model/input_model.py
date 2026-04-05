from pydantic import BaseModel
from typing import Optional

#  this is the expected json input either or both can be provided
# {
#   "order_id": 2,
#   "user_id": "550e8400-e29b-41d4-a716-446655440000",
#   "points_amount": 100,
#   "point_id": "f8392488-5ecf-44d9-9483-1642dfea5dc4",
#   "payment_intent_id": "pi_3S64492eZvKYlo2C13313131"
# }

class RefundRequest(BaseModel):
    order_id: int
    user_id: str
    point_reference_id: Optional[str] = None
    payment_checkout_id: Optional[str] = None