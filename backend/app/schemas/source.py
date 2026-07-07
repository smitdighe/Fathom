from datetime import datetime
from typing import Literal

from pydantic import BaseModel, HttpUrl

__all__ = ["Source", "Claim", "Contradiction"]


class Source(BaseModel):
    """A single retrieved web source. Produced by the research/retrieval node."""

    url: HttpUrl
    title: str
    content: str
    retrieved_at: datetime
    sub_question: str


class Claim(BaseModel):
    """An extracted factual claim with supporting sources. Produced by the extraction node."""

    text: str
    source_urls: list[HttpUrl]
    confidence: Literal["low", "medium", "high"]


class Contradiction(BaseModel):
    """A detected conflict between two claims. Produced by the contradiction-detection node."""

    claim_a: str
    claim_b: str
    sources: list[HttpUrl]
