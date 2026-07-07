from typing import Literal

from app.graph.state import GraphState

__all__ = ["route_after_reflect"]


def route_after_reflect(state: GraphState) -> Literal["planner", "cross_reference"]:
    """Route after reflect: loop back to planner if more research is needed,
    otherwise proceed to cross_reference. The iteration cap is already enforced
    inside reflect_node (single source of truth), so it is not re-checked here."""
    if state["verdict"] == "needs_more_research":
        return "planner"
    return "cross_reference"
