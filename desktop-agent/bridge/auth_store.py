"""
Auth store — loads Supabase JWT from ~/.jarvis/desktop-auth.json.
Used by cloud_sync to authenticate with the web API.
"""
import json
import time
from pathlib import Path

AUTH_FILE = Path.home() / ".jarvis" / "desktop-auth.json"


def load_auth() -> dict | None:
    """Load auth data from ~/.jarvis/desktop-auth.json."""
    if not AUTH_FILE.exists():
        return None
    try:
        return json.loads(AUTH_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None


def is_expired(auth: dict) -> bool:
    """Check if the access token has expired."""
    expires_at = auth.get("expires_at", 0)
    return time.time() > expires_at


def get_auth_headers() -> dict | None:
    """
    Returns Authorization headers if a valid token exists.
    Returns None if no auth or token expired.
    """
    auth = load_auth()
    if not auth:
        return None
    if is_expired(auth):
        print("[AUTH] ⚠️ Token expired — re-export from web app")
        return None
    return {
        "Authorization": f"Bearer {auth['access_token']}",
        "Content-Type": "application/json",
    }
