"""
Action: web_search
Searches the web using DuckDuckGo.
"""
import logging
from duckduckgo_search import DDGS

logger = logging.getLogger("web_search")

def web_search(parameters: dict, player=None) -> str:
    query = parameters.get("query", "").strip()
    if not query:
        return "Error: No search query provided."

    logger.info(f"Searching the web for: {query}")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            if not results:
                return f"No results found for '{query}'."

            formatted_results = []
            for idx, r in enumerate(results, 1):
                formatted_results.append(
                    f"{idx}. {r.get('title')}\n   URL: {r.get('href')}\n   Summary: {r.get('body')}\n"
                )
            
            return "\n".join(formatted_results)
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return f"Web search failed: {e}"
