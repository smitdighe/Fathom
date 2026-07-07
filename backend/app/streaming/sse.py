import json
from collections.abc import AsyncGenerator

from app.graph.build import graph
from app.graph.state import create_initial_state

__all__ = ["format_sse", "stream_graph_events"]

# Only surface events tied to our named graph nodes; drop LangGraph-internal
# sub-chain/runnable events.
NODE_NAMES = {
    "planner",
    "search",
    "fetch",
    "reflect",
    "cross_reference",
    "writer",
}


def format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_graph_events(
    topic: str, max_iterations: int
) -> AsyncGenerator[str, None]:
    initial_state = create_initial_state(topic, max_iterations)
    try:
        async for event in graph.astream_events(initial_state, version="v2"):
            name = event.get("name", "")
            if name not in NODE_NAMES:
                continue

            kind = event["event"]
            if kind == "on_chain_start":
                yield format_sse("node_start", {"node": name})
            elif kind == "on_chain_end":
                output = event["data"].get("output") or {}
                # Strip internal transient channels (_search_results, _gaps, ...)
                # so they never leak into the public SSE payload.
                public_output = {
                    k: v for k, v in output.items() if not k.startswith("_")
                }
                yield format_sse(
                    "node_end", {"node": name, "output": public_output}
                )

                if name == "reflect":
                    yield format_sse(
                        "reflect_verdict",
                        {
                            "verdict": output.get("verdict"),
                            "gaps": output.get("_gaps", []),
                            "follow_up_questions": output.get(
                                "_follow_up_questions", []
                            ),
                        },
                    )
                elif name == "writer":
                    yield format_sse(
                        "report_ready",
                        {"final_report": output.get("final_report")},
                    )
    except Exception as exc:  # stream must terminate with an error event, not 500
        yield format_sse("error", {"message": str(exc)})
        return
