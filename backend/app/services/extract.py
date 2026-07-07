import logging

import httpx
import trafilatura

__all__ = ["fetch_and_extract"]

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


async def fetch_and_extract(url: str, timeout: float = 10.0) -> str | None:
    """Fetch a URL and extract main text. Return None on any failure (log, skip)."""
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout,
            headers={"User-Agent": _USER_AGENT},
        ) as http_client:
            response = await http_client.get(url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("fetch failed for %s: %s", url, exc)
        return None

    try:
        return trafilatura.extract(response.text)
    except Exception as exc:  # trafilatura has no documented exception surface
        logger.warning("extract failed for %s: %s", url, exc)
        return None
