from pydantic import BaseModel, Field, field_validator, model_validator
from uuid import UUID
from typing import Literal

class TransactionCreate(BaseModel):
    user_id: UUID
    points_changed: int
    transaction_type: Literal['EARN', 'SPEND', 'REFUND']
    reference_id: str = Field(min_length=1, max_length=100)


    #Prevents any points changed to be zero
    @field_validator('points_changed')
    @classmethod
    def points_must_not_be_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError('points_changed cannot be zero')
        return v

    #Enforce Spend to be below 0 and the rest to be above 0
    @model_validator(mode='after')
    def check_transaction_sign(self) -> 'TransactionCreate':
        t_type = self.transaction_type
        points = self.points_changed

        if t_type == 'SPEND' and points > 0:
            raise ValueError("Transaction type 'SPEND' must have a negative point value (e.g., -50)")

        if t_type in ['EARN', 'REFUND'] and points < 0:
            raise ValueError(f"Transaction type '{t_type}' must have a positive point value (e.g., 50)")

        return self
    

class PhotoProcessCreate(BaseModel):
    user_id: UUID
    before_image_url: str