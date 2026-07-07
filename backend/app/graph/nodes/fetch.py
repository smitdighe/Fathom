import asyncio
from datetime import datetime, timezone

from app.graph.state import GraphState
from app.services.extract import fetch_and_extract

__all__ = ["fetch_node"]


async def fetch_node(state: GraphState) -> dict:
    search_results = state.get("_search_results", [])
    extracted = await asyncio.gather(
        *(fetch_and_extract(r["url"]) for r in search_results),
        return_exceptions=True,
    )

    retrieved_at = datetime.now(timezone.utc).isoformat()
    new_sources: list[dict] = []
    for result, content in zip(search_results, extracted):
        if isinstance(content, BaseException) or content is None:
            continue
        new_sources.append(
            {
                "url": result["url"],
                "title": result.get("title", ""),
                "content": content,
                "retrieved_at": retrieved_at,
                "sub_question": result.get("sub_question", ""),
            }
        )

    return {"sources": state["sources"] + new_sources}
