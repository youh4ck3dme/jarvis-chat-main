"""
Action: open_app
Opens any application on macOS using the 'open' command.
"""
import subprocess
import logging

logger = logging.getLogger("open_app")

def open_app(parameters: dict, response=None, player=None) -> str:
    app_name = parameters.get("app_name", "").strip()
    if not app_name:
        return "Error: Application name was not provided."

    logger.info(f"Opening application: {app_name}")
    try:
        # Common macOS app name mappings to ensure successful execution
        mappings = {
            "chrome": "Google Chrome",
            "safari": "Safari",
            "spotify": "Spotify",
            "messages": "Messages",
            "finder": "Finder",
            "terminal": "Terminal",
            "activity monitor": "Activity Monitor",
            "system settings": "System Settings",
            "settings": "System Settings",
            "app store": "App Store",
            "whatsapp": "WhatsApp",
            "discord": "Discord",
            "slack": "Slack",
        }
        
        target_name = mappings.get(app_name.lower(), app_name)
        
        # Execute macOS 'open' command
        subprocess.run(["open", "-a", target_name], check=True, capture_output=True)
        return f"Successfully opened {target_name}."
    except subprocess.CalledProcessError as e:
        # If open -a fails, attempt to run open as a fallback (could be a path or a URL)
        try:
            subprocess.run(["open", app_name], check=True, capture_output=True)
            return f"Opened {app_name}."
        except Exception:
            err = e.stderr.decode().strip() if e.stderr else str(e)
            logger.error(f"Failed to open app {app_name}: {err}")
            return f"Failed to open '{app_name}'. Make sure it is installed. (Error: {err})"
