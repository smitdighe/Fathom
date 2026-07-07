from typing import Any

from tavily import AsyncTavilyClient

from app.config import settings
from app.services.exceptions import SearchError

__all__ = ["client", "search"]

client = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)


async def search(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """Run a Tavily search, return [{url, title, snippet}]."""
    try:
        response = await client.search(query=query, max_results=max_results)
    except Exception as exc:  # tavily raises plain Exception subclasses
        raise SearchError(f"Tavily search failed: {exc}") from exc

    return [
        {
            "url": r.get("url", ""),
            "title": r.get("title", ""),
            "snippet": r.get("content", ""),
        }
        for r in response.get("results", [])
    ]
