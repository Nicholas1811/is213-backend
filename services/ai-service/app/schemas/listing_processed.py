from typing import Any

from pydantic import BaseModel, Field, model_validator


class ListingProcessResponse(BaseModel):
    eventId: str
    eventName: str
    eventVersion: int
    occurred_At: str | None = Field(
        default=None, alias="occuredAt"
    )  ## check message in queue eg: json { id: 123 , occuredAt : 'Jan 2023'} , it will map occuredAt to occurred_At
    source: str = Field(alias="source")
    correlationId: str = Field(alias="correlationId")
    data: str = Field(alias="data")
