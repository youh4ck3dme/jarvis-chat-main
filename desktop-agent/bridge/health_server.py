"""
FastAPI health server — runs on 127.0.0.1:8765 in a daemon thread.
Provides health, tools, and memory status endpoints for the web bridge.
"""
import json
import time
import platform
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

_start_time = time.time()
_base_dir = Path(__file__).resolve().parent.parent
_bridge_config_path = _base_dir / "config" / "bridge.json"
_tool_manifest_path = _base_dir.parent / "shared" / "tool-manifest.json"

AGENT_VERSION = "0.1.0"

# Mutable state updated by memory_manager
_last_memory_sync: str | None = None
_memory_sync_enabled: bool = True


def set_last_memory_sync(iso_str: str) -> None:
    global _last_memory_sync
    _last_memory_sync = iso_str


def set_memory_sync_enabled(enabled: bool) -> None:
    global _memory_sync_enabled
    _memory_sync_enabled = enabled


def _load_bridge_config() -> dict:
    try:
        return json.loads(_bridge_config_path.read_text(encoding="utf-8"))
    except Exception:
        return {
            "health_port": 8765,
            "web_base_url": "http://127.0.0.1:3141",
            "conversation_id": "desktop-voice-session",
        }


def _load_tool_manifest() -> list:
    try:
        return json.loads(_tool_manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return []


def create_app() -> FastAPI:
    app = FastAPI(title="JARVIS Desktop Agent", version=AGENT_VERSION)

    bridge = _load_bridge_config()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:3141",
            "http://localhost:3141",
            f"http://127.0.0.1:{bridge.get('health_port', 8765)}",
        ],
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        tools = _load_tool_manifest()
        return {
            "status": "ok",
            "agent_version": AGENT_VERSION,
            "platform": platform.system().lower(),
            "gemini_live_model": "models/gemini-2.5-flash-native-audio-preview-12-2025",
            "conversation_id": bridge.get("conversation_id", "desktop-voice-session"),
            "memory_sync": {
                "enabled": _memory_sync_enabled,
                "last_sync_at": _last_memory_sync,
                "web_base_url": bridge.get("web_base_url", "http://127.0.0.1:3141"),
            },
            "tools_available": len(tools),
            "uptime_sec": round(time.time() - _start_time, 1),
        }

    @app.get("/tools")
    def tools():
        return _load_tool_manifest()

    @app.get("/status/memory")
    def memory_status():
        return {
            "sync_enabled": _memory_sync_enabled,
            "last_sync_at": _last_memory_sync,
            "conversation_id": bridge.get("conversation_id", "desktop-voice-session"),
        }

    return app


def start_health_server(port: int = 8765) -> threading.Thread:
    """Start the health server in a daemon thread. Non-blocking."""
    import uvicorn

    app = create_app()

    def _run():
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

    t = threading.Thread(target=_run, daemon=True, name="health-server")
    t.start()
    print(f"[BRIDGE] 🌐 Health server on http://127.0.0.1:{port}/health")
    return t
