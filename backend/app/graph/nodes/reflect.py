from app.graph.state import GraphState
from app.schemas.reflect import ReflectVerdict
from app.services.llm import call_with_tool, pydantic_to_tool_schema

__all__ = ["reflect_node"]

MODEL = "gpt-oss-120b"
TOOL_NAME = "assess_sufficiency"

SYSTEM_PROMPT = (
    "You are a research critic. Judge whether the gathered sources and claims "
    "sufficiently answer the topic and its sub-questions. If not, name the gaps "
    "and propose follow-up questions. Report via the assess_sufficiency tool."
)

_TOOL_SCHEMA = pydantic_to_tool_schema(
    ReflectVerdict, TOOL_NAME, "Return the sufficiency verdict and any gaps."
)


def _build_prompt(state: GraphState) -> str:
    source_titles = "\n".join(
        f"- {s.get('title', '')} ({s.get('url', '')})" for s in state["sources"]
    ) or "- (none)"
    claim_texts = "\n".join(
        f"- {c.get('text', '')}" for c in state["claims"]
    ) or "- (none)"
    return (
        f"Topic: {state['topic']}\n\n"
        f"Sub-questions:\n"
        + "\n".join(f"- {q}" for q in state["sub_questions"])
        + f"\n\nSources gathered ({len(state['sources'])}):\n{source_titles}\n\n"
        f"Claims extracted ({len(state['claims'])}):\n{claim_texts}\n\n"
        f"Iteration {state['iteration']} of {state['max_iterations']}.\n"
        "Decide if research is sufficient or needs more."
    )


async def reflect_node(state: GraphState) -> dict:
    result = await call_with_tool(
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_prompt(state)}],
        tool_schema=_TOOL_SCHEMA,
        tool_name=TOOL_NAME,
        model=MODEL,
    )

    verdict = result["verdict"]
    # Hard cap: exhausted iterations => force sufficient regardless of model.
    if state["iteration"] >= state["max_iterations"]:
        verdict = "sufficient"

    return {
        "verdict": verdict,
        "_reflect_reasoning": result.get("reasoning", ""),
        "_gaps": result.get("gaps", []),
        "_follow_up_questions": result.get("follow_up_questions", []),
    }
