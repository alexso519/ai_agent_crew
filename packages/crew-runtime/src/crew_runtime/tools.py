from crewai.tools import tool


@tool("web_search")
def web_search(query: str) -> str:
    """Search the web for current information."""
    return f"[web_search] Results for: {query}"


@tool("sql_executor")
def sql_executor(query: str) -> str:
    """Execute a read-only SQL query against configured databases."""
    return f"[sql_executor] Query acknowledged: {query[:200]}"


@tool("api_connector")
def api_connector(endpoint: str) -> str:
    """Call an external HTTP API endpoint."""
    return f"[api_connector] Request sent to: {endpoint}"


@tool("file_reader")
def file_reader(path: str) -> str:
    """Read contents from an allowed file path."""
    return f"[file_reader] Read simulated content from: {path}"


@tool("python_executor")
def python_executor(code: str) -> str:
    """Execute Python in a sandboxed environment."""
    return f"[python_executor] Executed snippet ({len(code)} chars)"


@tool("vector_search")
def vector_search(query: str) -> str:
    """Query vector store for semantically similar documents."""
    return f"[vector_search] Top matches for: {query}"


TOOL_REGISTRY: dict[str, object] = {
    "web_search": web_search,
    "sql_executor": sql_executor,
    "api_connector": api_connector,
    "file_reader": file_reader,
    "python_executor": python_executor,
    "vector_search": vector_search,
}


def resolve_tools(tool_names: list[str]) -> list[object]:
    resolved: list[object] = []
    for name in tool_names:
        key = name.strip().lower().replace(" ", "_")
        if key in TOOL_REGISTRY:
            resolved.append(TOOL_REGISTRY[key])
    return resolved
