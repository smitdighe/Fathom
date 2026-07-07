import asyncio

from app.graph.state import GraphState
from app.services import search as search_service

__all__ = ["search_node"]


async def search_node(state: GraphState) -> dict:
    sub_questions = state["sub_questions"]
    results_per_q = await asyncio.gather(
        *(search_service.search(q) for q in sub_questions),
        return_exceptions=True,
    )

    tagged: list[dict] = []
    for question, results in zip(sub_questions, results_per_q):
        if isinstance(results, BaseException):
            continue
        for item in results:
            tagged.append({**item, "sub_question": question})

    return {"_search_results": tagged}
