from typing import Literal

from pydantic import BaseModel, Field

__all__ = ["ReflectVerdict"]


class ReflectVerdict(BaseModel):
    """Assessment of whether gathered research is sufficient. Produced by the reflect node."""

    verdict: Literal["sufficient", "needs_more_research"]
    reasoning: str
    gaps: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
