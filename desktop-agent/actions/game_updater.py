"""
Action: game_updater
Handles Steam/Epic game updates. Limited on macOS.
"""
import logging
import subprocess

logger = logging.getLogger("game_updater")

def game_updater(parameters: dict, player=None, speak=None) -> str:
    action = parameters.get("action", "check").lower().strip()
    platform = parameters.get("platform", "steam").lower().strip()
    game_name = parameters.get("game_name", "").strip()

    logger.info(f"Game updater action: {action} on {platform} for game: {game_name}")

    if "steam" in platform:
        # Steam URL scheme: steam://run/appid or steam://open
        # We can open Steam app directly
        try:
            subprocess.run(["open", "steam://open/main"], check=True)
            return "Opened Steam client (Note: game updates are managed automatically by Steam)."
        except Exception:
            return "Steam client does not appear to be installed or running on this Mac."
    else:
        return f"Game update operations for {platform.capitalize()} are not natively supported on macOS."
