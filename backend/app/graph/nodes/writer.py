import json

from app.graph.state import GraphState
from app.schemas.report import FinalReport, WriterOutput
from app.services.llm import call_with_tool, pydantic_to_tool_schema

__all__ = ["writer_node"]

MODEL = "gpt-oss-120b"
TOOL_NAME = "write_report"

SYSTEM_PROMPT = (
    "You are a research report writer. Synthesize the claims, contradictions, and "
    "sources into a report of title, sections, and confidence notes. Each section "
    "cites its supporting sources by URL, copied exactly from the provided source "
    "list — never invent a URL, and never output any source metadata (titles, "
    "dates, or content): the source list is compiled separately in code. Surface "
    "contradictions honestly in the confidence notes. Report via the write_report "
    'tool. Every section object must use exactly these required keys: "heading", '
    '"content", "citations". Do not use title for a section heading. Example section: '
    '{"heading": "Key Findings", "content": "Synthesis text.", '
    '"citations": ["https://example.com/source"]}.'
)

_TOOL_SCHEMA = pydantic_to_tool_schema(
    WriterOutput, TOOL_NAME, "Return the report's title, sections, and confidence notes."
)

# Token budget guard: the writer only needs source identity (for citations) plus
# a short grounding snippet, not full article text. Full content across all
# sources blew past Cerebras's daily token limit, so trim before prompting.
MAX_WRITER_SOURCES = 40
WRITER_SNIPPET_CHARS = 200


def _trim_sources_for_writer(state: GraphState) -> list[dict]:
    """Rank sources by how often their URL is cited across the extracted claims,
    keep the top MAX_WRITER_SOURCES, and reduce each to url/title/sub_question
    plus a short content snippet for citation grounding."""
    cite_counts: dict[str, int] = {}
    for claim in state["claims"]:
        for url in claim.get("source_urls", []):
            cite_counts[str(url)] = cite_counts.get(str(url), 0) + 1

    ranked = sorted(
        state["sources"],
        key=lambda s: cite_counts.get(str(s.get("url", "")), 0),
        reverse=True,
    )
    return [
        {
            "url": s.get("url", ""),
            "title": s.get("title", ""),
            "sub_question": s.get("sub_question", ""),
            "content": (s.get("content") or "")[:WRITER_SNIPPET_CHARS],
        }
        for s in ranked[:MAX_WRITER_SOURCES]
    ]


def _build_prompt(state: GraphState) -> str:
    sources = _trim_sources_for_writer(state)
    return (
        f"Topic: {state['topic']}\n\n"
        f"Claims (JSON):\n{json.dumps(state['claims'], ensure_ascii=False)}\n\n"
        f"Contradictions (JSON):\n"
        f"{json.dumps(state['contradictions'], ensure_ascii=False)}\n\n"
        f"Sources (JSON):\n{json.dumps(sources, ensure_ascii=False)}\n\n"
        "Write the report: title, sections (each citing supporting source URLs "
        "from the list above), and confidence notes. Do not reproduce the source "
        "list itself."
    )


def _normalize_writer_result(result: dict) -> dict:
    normalized = dict(result)
    sections = normalized.get("sections")
    if not isinstance(sections, list):
        return normalized

    normalized_sections = []
    for section in sections:
        if not isinstance(section, dict):
            normalized_sections.append(section)
            continue

        normalized_section = dict(section)
        if "heading" not in normalized_section and "title" in normalized_section:
            normalized_section["heading"] = normalized_section.pop("title")
        if "citations" not in normalized_section:
            normalized_section["citations"] = []
        normalized_sections.append(normalized_section)

    normalized["sections"] = normalized_sections
    return normalized


async def writer_node(state: GraphState) -> dict:
    result = await call_with_tool(
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_prompt(state)}],
        tool_schema=_TOOL_SCHEMA,
        tool_name=TOOL_NAME,
        model=MODEL,
    )
    writer_output = WriterOutput(**_normalize_writer_result(result))
    # source_list comes straight from the real retrieved sources, never the LLM.
    final_report = FinalReport(
        title=writer_output.title,
        sections=writer_output.sections,
        source_list=state["sources"],
        confidence_notes=writer_output.confidence_notes,
    )
    return {"final_report": final_report.model_dump_json()}
