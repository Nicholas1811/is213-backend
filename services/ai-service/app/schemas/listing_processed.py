from pydantic import BaseModel, Field


class ListingProcessedData(BaseModel):
    id: int
    s3ImageUrl: str
    name: str
    description: str
    qty: int
    unitPriceCents: int
    status: str
    bestBefore: str | None = None
    createdAt: str
    updatedAt: str


class ListingProcessResponse(BaseModel):
    eventId: str
    eventName: str
    eventVersion: int
    occurredAt: str | None = Field(default=None, alias="occurredAt")
    source: str
    correlationId: str | None = None
    data: ListingProcessedData
