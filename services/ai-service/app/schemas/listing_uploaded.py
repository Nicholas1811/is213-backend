from pydantic import AliasChoices, BaseModel, Field


class ListingUploadData(BaseModel):
    id: int
    s3ImageUrl: str = Field(
        validation_alias=AliasChoices("s3ImageUrl", "imageUrl"),
    )
    name: str | None = None
    description: str | None = None
    qty: int = 0
    unitPriceCents: int | None = None
    status: str | None = None
    bestBefore: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class ListingUploadRequest(BaseModel):
    eventId: str
    eventName: str
    eventVersion: int
    occurredAt: str | None = Field(default=None, alias="occurredAt")
    source: str
    correlationId: str | None = None
    data: ListingUploadData
