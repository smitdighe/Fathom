from pydantic import BaseModel, Field

__all__ = ["PlannerOutput"]


class PlannerOutput(BaseModel):
    """Decomposition of the topic into sub-questions. Produced by the planner node."""

    sub_questions: list[str] = Field(min_length=3, max_length=6)
