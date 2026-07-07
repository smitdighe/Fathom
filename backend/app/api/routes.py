from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.streaming.sse import stream_graph_events

__all__ = ["router"]

router = APIRouter()


class ResearchRequest(BaseModel):
    topic: str = Field(min_length=1)
    max_iterations: int = Field(default=settings.MAX_ITERATIONS, ge=1, le=3)


@router.post("/research")
async def research(request: ResearchRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_graph_events(request.topic, request.max_iterations),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
