from pydantic import BaseModel, Field


class ListingUploadData(BaseModel):
    id: int
    s3ImageUrl: str
    name: str | None = None
    description: str | None = None
    qty: int
    unitPriceCents: int
    status: str
    bestBefore: str | None = None
    createdAt: str
    updatedAt: str


class ListingUploadRequest(BaseModel):
    eventId: str
    eventName: str
    eventVersion: int
    occurredAt: str | None = Field(default=None, alias="occurredAt")
    source: str
    correlationId: str | None = None
    data: ListingUploadData
