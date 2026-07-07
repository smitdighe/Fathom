"""Offline smoke test for the compiled research graph.

Patches the three external service boundaries (Cerebras LLM, Tavily search, HTTP
extract) so the real compiled graph — nodes, edges, loop, iteration cap — runs
deterministically without network access or API keys.
"""
import json

import pytest

from app.graph.build import build_graph
from app.graph.state import create_initial_state

# Writer tool payload with the title alias shape that writer_node normalizes.
_REPORT = {
    "title": "Smoke Report",
    "sections": [
        {
            "title": "Overview",
            "content": "Body text.",
        }
    ],
    "source_list": [
        {
            "url": "https://example.com/a",
            "title": "Example A",
            "content": "content",
            "retrieved_at": "2026-01-01T00:00:00Z",
            "sub_question": "q1",
        }
    ],
    "confidence_notes": "High confidence on a trivial topic.",
}


async def _fake_call_with_tool(system, messages, tool_schema, tool_name, model):
    """Dispatch a canned tool result by tool_name."""
    return {
        "plan_sub_questions": {"sub_questions": ["q1", "q2", "q3"]},
        "assess_sufficiency": {
            "verdict": "sufficient",
            "reasoning": "Enough evidence.",
            "gaps": [],
            "follow_up_questions": [],
        },
        "extract_claims": {
            "claims": [
                {
                    "text": "A claim.",
                    "source_urls": ["https://example.com/a"],
                    "confidence": "high",
                }
            ]
        },
        "detect_contradictions": {"contradictions": []},
        "write_report": _REPORT,
    }[tool_name]


async def _fake_search(query, max_results=5):
    return [{"url": "https://example.com/a", "title": "Example A", "snippet": "s"}]


async def _fake_fetch_and_extract(url, timeout=10.0):
    return "Extracted body text."


@pytest.fixture
def patched_services(monkeypatch):
    for mod in ("planner", "reflect", "cross_reference", "writer"):
        monkeypatch.setattr(
            f"app.graph.nodes.{mod}.call_with_tool", _fake_call_with_tool
        )
    monkeypatch.setattr(
        "app.graph.nodes.search.search_service.search", _fake_search
    )
    monkeypatch.setattr(
        "app.graph.nodes.fetch.fetch_and_extract", _fake_fetch_and_extract
    )


async def test_graph_smoke(patched_services):
    graph = build_graph()
    final_state = await graph.ainvoke(create_initial_state("trivial topic", 1))

    # final_report is non-empty valid JSON
    assert final_state["final_report"]
    report = json.loads(final_state["final_report"])
    assert report["title"]
    assert report["sections"][0]["heading"] == "Overview"
    assert report["sections"][0]["citations"] == []

    # iteration cap respected
    assert final_state["iteration"] <= final_state["max_iterations"] == 1
