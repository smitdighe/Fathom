import asyncio
import json
from typing import Any

from openai import AsyncOpenAI, OpenAIError, RateLimitError
from pydantic import BaseModel

from app.config import settings
from app.services.exceptions import LLMCallError

__all__ = ["client", "call_with_tool", "pydantic_to_tool_schema"]

# Cerebras is OpenAI-compatible; point the OpenAI client at its endpoint. Async
# so the graph nodes can await call_with_tool.
client = AsyncOpenAI(
    api_key=settings.CEREBRAS_API_KEY,
    base_url="https://api.cerebras.ai/v1",
)

DEFAULT_MODEL = "gpt-oss-120b"
DEFAULT_MAX_TOKENS = 4096

_MAX_RETRY_ATTEMPTS = 3  # exponential backoff 2**n seconds: 1s, 2s, 4s


def pydantic_to_tool_schema(
    model: type[BaseModel], name: str, description: str
) -> dict[str, Any]:
    """Convert a Pydantic model into an OpenAI function-calling tool schema.
    Cerebras's OpenAI-compatible endpoint accepts standard JSON schema
    ($ref/$defs included), so no cleaning is needed."""
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": model.model_json_schema(),
        },
    }


def _is_retryable(exc: OpenAIError) -> bool:
    if isinstance(exc, RateLimitError):
        return True
    status = getattr(exc, "status_code", None)
    return isinstance(status, int) and status >= 500


async def _create(
    model: str, messages: list[dict], tool_schema: dict, tool_name: str
) -> Any:
    """Call Cerebras, retrying only rate limits (429) and server errors (5xx)
    with exponential backoff (1s, 2s, 4s)."""
    for attempt in range(_MAX_RETRY_ATTEMPTS):
        try:
            return await client.chat.completions.create(
                model=model,
                max_tokens=DEFAULT_MAX_TOKENS,
                messages=messages,
                tools=[tool_schema],
                tool_choice={"type": "function", "function": {"name": tool_name}},
            )
        except OpenAIError as exc:
            if _is_retryable(exc) and attempt < _MAX_RETRY_ATTEMPTS - 1:
                await asyncio.sleep(2**attempt)
                continue
            raise LLMCallError(f"Cerebras API call failed: {exc}") from exc
    raise LLMCallError("Cerebras API call failed: exhausted retries")


def _extract_tool_args(response: Any) -> dict[str, Any] | None:
    choices = response.choices
    if not choices:
        return None
    tool_calls = choices[0].message.tool_calls
    if not tool_calls:
        return None
    try:
        return json.loads(tool_calls[0].function.arguments)
    except (json.JSONDecodeError, TypeError):
        return None


async def call_with_tool(
    system: str,
    messages: list[dict],
    tool_schema: dict,
    tool_name: str,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    """Call the model forcing a single tool use, return the parsed tool-call arguments."""
    full_messages = [{"role": "system", "content": system}, *messages]

    for _ in range(2):  # one retry on empty/malformed tool call
        response = await _create(model, full_messages, tool_schema, tool_name)
        args = _extract_tool_args(response)
        if args is not None:
            return args

    raise LLMCallError(f"No tool_call for tool '{tool_name}' in response")
