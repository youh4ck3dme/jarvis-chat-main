"""
Action: weather_report
Fetches current weather for a city using wttr.in.
"""
import logging
import requests

logger = logging.getLogger("weather_report")

def weather_action(parameters: dict, player=None) -> str:
    city = parameters.get("city", "").strip()
    if not city:
        return "Error: City name is required for weather reports."

    logger.info(f"Fetching weather for: {city}")
    try:
        # Use wttr.in format that returns clean plain text or json
        # Let's request json format wttr.in/city?format=j1
        url = f"https://wttr.in/{city}?format=j1"
        resp = requests.get(url, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            curr = data.get("current_condition", [{}])[0]
            temp_c = curr.get("temp_C", "N/A")
            desc = curr.get("lang_sk", curr.get("weatherDesc", [{}])[0].get("value", "N/A"))
            humidity = curr.get("humidity", "N/A")
            wind = curr.get("windspeedKmph", "N/A")
            
            return (
                f"Current weather in {city.capitalize()}:\n"
                f"- Temperature: {temp_c}°C\n"
                f"- Conditions: {desc}\n"
                f"- Humidity: {humidity}%\n"
                f"- Wind Speed: {wind} km/h"
            )
        else:
            # Fallback to plain text wttr.in format
            text_url = f"https://wttr.in/{city}?format=3"
            fallback_resp = requests.get(text_url, timeout=10)
            if fallback_resp.status_code == 200:
                return fallback_resp.text.strip()
            return f"Failed to get weather for {city}. (HTTP Status {resp.status_code})"
    except Exception as e:
        logger.error(f"Weather fetch failed: {e}")
        return f"Weather report service currently unavailable: {e}"
