"""
Action: file_controller
Handles file system operations (create, read, write, copy, move, delete, list, search).
"""
import os
import shutil
import logging
import fnmatch
from pathlib import Path
from datetime import datetime

logger = logging.getLogger("file_controller")

def file_controller(parameters: dict, player=None) -> str:
    action = parameters.get("action", "").lower().strip()
    path_str = parameters.get("path", "").strip()
    dest_str = parameters.get("destination", "").strip()
    content = parameters.get("content", "").strip()
    query = parameters.get("query", "").strip()
    recursive = parameters.get("recursive", False)

    if not action or not path_str:
        return "Error: Missing required parameters (action, path)."

    path = Path(path_str).expanduser().resolve()
    logger.info(f"File Controller: action={action}, path={path}")

    # Restrict file modifications outside safe environments (optional security, but user approved)
    try:
        if action == "create":
            if path.exists():
                return f"File '{path}' already exists."
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            return f"Successfully created file at {path}."

        elif action == "read":
            if not path.exists():
                return f"Error: File '{path}' does not exist."
            if path.is_dir():
                return f"Error: '{path}' is a directory. Use list action instead."
            # Read first 10k characters to prevent overflow
            text = path.read_text(encoding="utf-8", errors="replace")
            if len(text) > 10000:
                return text[:10000] + "\n\n[Content truncated due to size...]"
            return text

        elif action == "write":
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            return f"Successfully wrote to {path}."

        elif action == "copy":
            if not dest_str:
                return "Error: Destination path is required for copy."
            dest = Path(dest_str).expanduser().resolve()
            dest.parent.mkdir(parents=True, exist_ok=True)
            if path.is_dir():
                shutil.copytree(str(path), str(dest), dirs_exist_ok=True)
            else:
                shutil.copy2(str(path), str(dest))
            return f"Copied {path} to {dest}."

        elif action == "move":
            if not dest_str:
                return "Error: Destination path is required for move."
            dest = Path(dest_str).expanduser().resolve()
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(path), str(dest))
            return f"Moved {path} to {dest}."

        elif action == "delete":
            # Safety checks can be handled at prompt/user level
            if not path.exists():
                return f"Error: Path '{path}' does not exist."
            
            # Send to macOS Trash rather than permanent delete
            from send2trash import send2trash
            send2trash(str(path))
            return f"Moved {path} to System Trash."

        elif action == "list":
            if not path.exists():
                return f"Error: Directory '{path}' does not exist."
            if not path.is_dir():
                return f"Error: '{path}' is a file."
            
            items = []
            for item in path.iterdir():
                prefix = "[DIR] " if item.is_dir() else "[FILE]"
                items.append(f"{prefix} {item.name}")
            return f"Directory contents of {path}:\n" + "\n".join(items)

        elif action == "search":
            if not path.is_dir():
                return f"Error: Search root '{path}' must be a directory."
            if not query:
                return "Error: Search query is required."
            
            matches = []
            pattern = f"*{query}*"
            
            if recursive:
                for root, dirnames, filenames in os.walk(str(path)):
                    for filename in fnmatch.filter(filenames + dirnames, pattern):
                        matches.append(os.path.join(root, filename))
                        if len(matches) >= 50: # Limit results
                            break
            else:
                for item in path.iterdir():
                    if fnmatch.fnmatch(item.name, pattern):
                        matches.append(str(item))
            
            if not matches:
                return f"No matches found for '{query}' in {path}."
            return f"Found {len(matches)} matches:\n" + "\n".join(matches[:50])

        elif action == "info":
            if not path.exists():
                return f"Error: Path '{path}' does not exist."
            
            stat = path.stat()
            size = stat.st_size
            created = datetime.fromtimestamp(stat.st_ctime).isoformat()
            modified = datetime.fromtimestamp(stat.st_mtime).isoformat()
            p_type = "directory" if path.is_dir() else "file"
            
            return (
                f"Path: {path}\n"
                f"Type: {p_type}\n"
                f"Size: {size} bytes\n"
                f"Created: {created}\n"
                f"Modified: {modified}"
            )

        else:
            return f"Unknown file action: {action}"

    except Exception as e:
        logger.error(f"File operation failed: {e}")
        return f"File operation failed: {e}"
