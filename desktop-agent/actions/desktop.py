"""
Action: desktop
Controls the macOS Finder and organizes desktop items.
"""
import os
import shutil
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger("desktop")

def desktop_control(parameters: dict, player=None) -> str:
    action = parameters.get("action", "").lower().strip()
    path_param = parameters.get("path", "").strip()
    pattern = parameters.get("pattern", "*").strip()

    desktop_dir = Path.home() / "Desktop"

    logger.info(f"Desktop control: action={action}, path={path_param}, pattern={pattern}")

    try:
        if action == "show_desktop":
            # AppleScript to show desktop (hide other apps)
            applescript = """
            tell application "System Events"
                key code 103 -- F11 to show desktop on some macOS keyboards,
                -- or we can hide all processes:
                set visible of every process to false
            end tell
            """
            # Simplest approach is to use Mission Control show desktop key if configured,
            # or just tell Finder to activate.
            subprocess.run(["osascript", "-e", 'tell application "Finder" to activate'], check=True)
            return "Activated Finder."

        elif action == "list_files":
            files = [f.name for f in desktop_dir.iterdir() if not f.name.startswith(".")]
            if not files:
                return "Your desktop is empty."
            return "Files on Desktop:\n" + "\n".join(files)

        elif action == "open_folder":
            target = Path(path_param) if path_param else desktop_dir
            if not target.exists():
                return f"Error: Path '{target}' does not exist."
            subprocess.run(["open", str(target)], check=True)
            return f"Opened folder: {target.name}"

        elif action == "empty_trash":
            applescript = 'tell application "Finder" to empty trash'
            subprocess.run(["osascript", "-e", applescript], check=True)
            return "Trash emptied successfully."

        elif action == "organize_desktop":
            # Organise desktop files by type into folders (Documents, Images, Archives, Code)
            categories = {
                "Images": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".heic"],
                "Documents": [".pdf", ".docx", ".doc", ".txt", ".xlsx", ".csv", ".pptx"],
                "Archives": [".zip", ".tar", ".gz", ".rar", ".dmg"],
                "Code": [".py", ".js", ".ts", ".tsx", ".html", ".css", ".json", ".sh"],
            }
            
            moved_count = 0
            for item in desktop_dir.iterdir():
                if item.is_file() and not item.name.startswith("."):
                    ext = item.suffix.lower()
                    target_folder = None
                    
                    for folder_name, extensions in categories.items():
                        if ext in extensions:
                            target_folder = desktop_dir / folder_name
                            break
                            
                    if target_folder:
                        target_folder.mkdir(exist_ok=True)
                        shutil.move(str(item), str(target_folder / item.name))
                        moved_count += 1
            
            return f"Desktop organized. Moved {moved_count} files into categorized folders."

        else:
            return f"Unknown desktop action: {action}"

    except Exception as e:
        logger.error(f"Desktop control failed: {e}")
        return f"Failed to execute desktop control: {e}"
