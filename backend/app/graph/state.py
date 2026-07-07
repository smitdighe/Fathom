from typing import Literal, NotRequired, TypedDict


class GraphState(TypedDict):
    topic: str
    sub_questions: list[str]
    sources: list[dict]  # {url, title, content, retrieved_at, sub_question}
    claims: list[dict]  # {text, source_urls, confidence}
    contradictions: list[dict]  # {claim_a, claim_b, sources}
    iteration: int
    max_iterations: int
    verdict: Literal["sufficient", "needs_more_research"]
    final_report: str

    # Internal transient channels (node-to-node handoff, not part of the
    # public result). NotRequired => create_initial_state need not seed them.
    _search_results: NotRequired[list[dict]]  # search_node -> fetch_node
    _reflect_reasoning: NotRequired[str]  # reflect_node output
    _gaps: NotRequired[list[str]]  # reflect_node -> planner_node
    _follow_up_questions: NotRequired[list[str]]  # reflect_node -> planner_node


def create_initial_state(topic: str, max_iterations: int = 3) -> GraphState:
    return GraphState(
        topic=topic,
        sub_questions=[],
        sources=[],
        claims=[],
        contradictions=[],
        iteration=0,
        max_iterations=max_iterations,
        verdict="needs_more_research",
        final_report="",
    )
