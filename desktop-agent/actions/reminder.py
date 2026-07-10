"""
Action: reminder
Creates a reminder in the macOS Reminders app.
"""
import subprocess
import logging
from datetime import datetime

logger = logging.getLogger("reminder")

def reminder(parameters: dict, response=None, player=None) -> str:
    message = parameters.get("message", "").strip()
    date_str = parameters.get("date", "").strip()
    time_str = parameters.get("time", "").strip()

    if not message:
        return "Error: Reminder message is required."

    # Parse date and time if provided
    due_date_time = None
    if date_str and time_str:
        try:
            due_date_time = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        except ValueError:
            pass

    logger.info(f"Setting reminder: '{message}' at {date_str} {time_str}")

    # Construct AppleScript to interface with macOS Reminders app
    if due_date_time:
        # Reminders format: "January 20, 2026 at 9:00:00 AM"
        formatted_date = due_date_time.strftime("%B %d, %Y at %I:%M:%S %p")
        applescript = f"""
        tell application "Reminders"
            set newReminder to make new reminder with properties {{name:"{message}", remind me date:date "{formatted_date}"}}
        end tell
        """
    else:
        applescript = f"""
        tell application "Reminders"
            make new reminder with properties {{name:"{message}"}}
        end tell
        """

    try:
        subprocess.run(["osascript", "-e", applescript], check=True, capture_output=True)
        time_info = f" for {date_str} {time_str}" if date_str else ""
        return f"Successfully created macOS Reminder: '{message}'{time_info}."
    except subprocess.CalledProcessError as e:
        err = e.stderr.decode().strip() if e.stderr else str(e)
        logger.error(f"Failed to set reminder: {err}")
        return f"Failed to set reminder on Mac. Ensure Reminders permissions are granted. (Error: {err})"
