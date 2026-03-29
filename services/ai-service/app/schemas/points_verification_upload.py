from pydantic import BaseModel


class PointsVerificationUploadRequest(BaseModel):
    user_id: str
    trans_id: str
    before_url: str
    after_url: str
