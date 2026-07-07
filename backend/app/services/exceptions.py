__all__ = ["ServiceError", "LLMCallError", "SearchError"]


class ServiceError(Exception):
    """Base class for all service-layer errors."""


class LLMCallError(ServiceError):
    """Raised when a Cerebras call fails or returns no tool_calls."""


class SearchError(ServiceError):
    """Raised when the Tavily search client fails."""
