from app.graph.state import GraphState
from app.schemas.planner import PlannerOutput
from app.services.llm import call_with_tool, pydantic_to_tool_schema

__all__ = ["planner_node"]

MODEL = "gpt-oss-120b"
TOOL_NAME = "plan_sub_questions"

SYSTEM_PROMPT = (
    "You are a research planner. Decompose a topic into 3-6 focused, "
    "non-overlapping sub-questions that together give thorough coverage. "
    "Return them via the plan_sub_questions tool."
)

_TOOL_SCHEMA = pydantic_to_tool_schema(
    PlannerOutput, TOOL_NAME, "Return the list of research sub-questions."
)


def _build_prompt(state: GraphState) -> str:
    lines = [f"Research topic: {state['topic']}"]
    if state["iteration"] > 0:
        gaps = state.get("_gaps", [])
        follow_ups = state.get("_follow_up_questions", [])
        if gaps:
            lines.append(
                "Known gaps from prior research:\n"
                + "\n".join(f"- {g}" for g in gaps)
            )
        if follow_ups:
            lines.append(
                "Suggested follow-up questions:\n"
                + "\n".join(f"- {q}" for q in follow_ups)
            )
        lines.append(
            "Refine the plan: generate improved sub-questions that target these "
            "gaps and follow-ups."
        )
    else:
        lines.append("Decompose this topic into focused sub-questions.")
    return "\n\n".join(lines)


async def planner_node(state: GraphState) -> dict:
    result = await call_with_tool(
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_prompt(state)}],
        tool_schema=_TOOL_SCHEMA,
        tool_name=TOOL_NAME,
        model=MODEL,
    )
    return {
        "sub_questions": result["sub_questions"],
        "iteration": state["iteration"] + 1,
    }
