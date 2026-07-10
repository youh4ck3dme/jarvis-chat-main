"""
Action: flight_finder
Searches Google Flights or Web Search to find best flight options and summarizes them.
"""
import logging
from actions.web_search import web_search
from or_client import client as or_client

logger = logging.getLogger("flight_finder")

def flight_finder(parameters: dict, player=None) -> str:
    origin = parameters.get("origin", "").strip()
    destination = parameters.get("destination", "").strip()
    date = parameters.get("date", "").strip()
    return_date = parameters.get("return_date", "").strip()
    passengers = parameters.get("passengers", 1)
    cabin = parameters.get("cabin", "economy").strip()
    save = parameters.get("save", False)

    if not origin or not destination or not date:
        return "Error: Origin, destination, and departure date are required."

    search_query = f"flights from {origin} to {destination} on {date}"
    if return_date:
        search_query += f" returning {return_date}"
    search_query += f" {passengers} passengers {cabin} class"

    logger.info(f"Flight finder query: '{search_query}'")

    try:
        # Search the web for flight options
        search_results = web_search({"query": search_query})
        
        # Use OpenRouter LLM to structure and present the results
        prompt = (
            f"Based on the following search results for: '{search_query}':\n\n"
            f"{search_results}\n\n"
            f"Provide a clean, bulleted list of the best flight options. "
            f"Estimate flight durations, layovers, and approximate pricing if visible. "
            f"Answer in Slovak if user context is Slovak, otherwise in English."
        )

        summary = or_client.chat(
            prompt=prompt,
            system="You are JARVIS's travel assistant. Present flight options concisely and professionally."
        )

        if save:
            from pathlib import Path
            save_path = Path.home() / "Desktop" / "flight_options.txt"
            save_path.write_text(summary, encoding="utf-8")
            return f"Flight options saved to Desktop:\n\n{summary}"

        return summary
    except Exception as e:
        logger.error(f"Flight finder failed: {e}")
        return f"Failed to search for flights: {e}"
