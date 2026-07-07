from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.graph.edges import route_after_reflect
from app.graph.nodes.cross_reference import cross_reference_node
from app.graph.nodes.fetch import fetch_node
from app.graph.nodes.planner import planner_node
from app.graph.nodes.reflect import reflect_node
from app.graph.nodes.search import search_node
from app.graph.nodes.writer import writer_node
from app.graph.state import GraphState

__all__ = ["build_graph", "graph"]


def build_graph() -> CompiledStateGraph:
    builder = StateGraph(GraphState)

    builder.add_node("planner", planner_node)
    builder.add_node("search", search_node)
    builder.add_node("fetch", fetch_node)
    builder.add_node("reflect", reflect_node)
    builder.add_node("cross_reference", cross_reference_node)
    builder.add_node("writer", writer_node)

    builder.add_edge(START, "planner")
    builder.add_edge("planner", "search")
    builder.add_edge("search", "fetch")
    builder.add_edge("fetch", "reflect")

    builder.add_conditional_edges(
        "reflect",
        route_after_reflect,
        {"planner": "planner", "cross_reference": "cross_reference"},
    )

    builder.add_edge("cross_reference", "writer")
    builder.add_edge("writer", END)

    return builder.compile()


# In-process singleton for reuse (e.g. main.py / API layer). No checkpointer.
graph = build_graph()
