from pydantic import AliasChoices, BaseModel, Field


class ListingProcessedData(BaseModel):
    id: int
    s3ImageUrl: str = Field(
        validation_alias=AliasChoices("s3ImageUrl", "imageUrl"),
        serialization_alias="imageUrl",
    )
    name: str
    description: str
    qty: int
    unitPriceCents: int | None = None
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
