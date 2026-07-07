import json

from pydantic import BaseModel

from app.graph.state import GraphState
from app.schemas.source import Claim, Contradiction
from app.services.llm import call_with_tool, pydantic_to_tool_schema

__all__ = ["cross_reference_node"]

MODEL = "gpt-oss-120b"

# Token budget guard: claim extraction needs source text, but full articles
# across every source overrun Cerebras's token limit. Cap per-source content and the
# number of sources fed into the extraction prompt.
MAX_XREF_SOURCES = 30
XREF_CONTENT_CHARS = 2000


class _ClaimList(BaseModel):
    """Wrapper for the claim-extraction tool output (cross_reference node)."""

    claims: list[Claim]


class _ContradictionList(BaseModel):
    """Wrapper for the contradiction-detection tool output (cross_reference node)."""

    contradictions: list[Contradiction]


CLAIMS_TOOL = "extract_claims"
CONTRADICTIONS_TOOL = "detect_contradictions"

_CLAIMS_SCHEMA = pydantic_to_tool_schema(
    _ClaimList, CLAIMS_TOOL, "Return deduplicated factual claims with source URLs."
)
_CONTRADICTIONS_SCHEMA = pydantic_to_tool_schema(
    _ContradictionList,
    CONTRADICTIONS_TOOL,
    "Return contradictions detected among the claims.",
)

CLAIMS_SYSTEM = (
    "You extract atomic factual claims from research sources. Merge near-identical "
    "claims into one, attaching every supporting source URL. Assign a confidence "
    "of low/medium/high. Report via the extract_claims tool."
)
CONTRADICTIONS_SYSTEM = (
    "You detect direct contradictions between factual claims. For each conflicting "
    "pair, cite the claims and the source URLs involved. Report via the "
    "detect_contradictions tool."
)


def _build_claims_prompt(state: GraphState) -> str:
    sources = [
        {
            "url": s.get("url", ""),
            "title": s.get("title", ""),
            "sub_question": s.get("sub_question", ""),
            "content": (s.get("content") or "")[:XREF_CONTENT_CHARS],
        }
        for s in state["sources"][:MAX_XREF_SOURCES]
    ]
    return (
        f"Topic: {state['topic']}\n\n"
        f"Sources (JSON):\n{json.dumps(sources, ensure_ascii=False)}\n\n"
        "Extract and deduplicate the factual claims."
    )


def _build_contradictions_prompt(topic: str, claims: list[dict]) -> str:
    return (
        f"Topic: {topic}\n\n"
        f"Claims (JSON):\n{json.dumps(claims, ensure_ascii=False)}\n\n"
        "Identify any pairs of claims that directly contradict each other."
    )


async def cross_reference_node(state: GraphState) -> dict:
    claims_result = await call_with_tool(
        system=CLAIMS_SYSTEM,
        messages=[{"role": "user", "content": _build_claims_prompt(state)}],
        tool_schema=_CLAIMS_SCHEMA,
        tool_name=CLAIMS_TOOL,
        model=MODEL,
    )
    claims = claims_result.get("claims", [])

    contradictions_result = await call_with_tool(
        system=CONTRADICTIONS_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": _build_contradictions_prompt(state["topic"], claims),
            }
        ],
        tool_schema=_CONTRADICTIONS_SCHEMA,
        tool_name=CONTRADICTIONS_TOOL,
        model=MODEL,
    )
    contradictions = contradictions_result.get("contradictions", [])

    return {"claims": claims, "contradictions": contradictions}
