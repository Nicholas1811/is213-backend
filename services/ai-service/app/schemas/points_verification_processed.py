from pydantic import BaseModel


class PointsVerificationProcessedResponse(BaseModel):
    trans_id: str
    user_id: str
    status: str
