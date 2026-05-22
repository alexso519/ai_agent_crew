import os
from typing import Any

from crewai import LLM


def build_llm(
    provider: str,
    model: str,
    *,
    temperature: float = 0.7,
    base_url: str | None = None,
) -> LLM:
    """Route LLM selection per agent configuration."""
    provider_key = provider.lower().strip()
    model_name = model.strip() or "llama3"

    if provider_key == "ollama":
        ollama_base = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        return LLM(
            model=f"ollama/{model_name}",
            base_url=ollama_base,
            temperature=temperature,
        )

    if provider_key == "gpt":
        return LLM(model=f"openai/{model_name}", temperature=temperature)

    if provider_key == "claude":
        return LLM(model=f"anthropic/{model_name}", temperature=temperature)

    if provider_key == "gemini":
        return LLM(model=f"gemini/{model_name}", temperature=temperature)

    return LLM(
        model=f"ollama/{model_name}",
        base_url=base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=temperature,
    )


def memory_enabled_flags(memory_config: dict[str, Any]) -> bool:
    return bool(
        memory_config.get("short_term")
        or memory_config.get("long_term")
        or memory_config.get("entity")
        or memory_config.get("shortTerm")
        or memory_config.get("longTerm")
    )
