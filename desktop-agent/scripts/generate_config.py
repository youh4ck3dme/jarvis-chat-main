"""
Generates config/api_keys.json and config/bridge.json from ../.env.local.
Run: python scripts/generate_config.py
"""
import json
import os
from pathlib import Path


def main():
    base = Path(__file__).resolve().parent.parent
    config_dir = base / "config"
    config_dir.mkdir(exist_ok=True)

    env_file = base.parent / ".env.local"
    env_vars: dict[str, str] = {}

    if env_file.exists():
        print(f"📄 Reading {env_file}")
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env_vars[key.strip()] = value.strip()
    else:
        print(f"⚠️  {env_file} not found — using environment variables or placeholders")

    env_keys = (
        "GEMINI_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
        "MISTRAL_API_KEY",
        "MISTRAL_API_KEY_SECONDARY",
        "DESKTOP_MISTRAL_TEXT_MODEL",
        "DESKTOP_MISTRAL_TEXT_MODEL_FALLBACK",
        "DESKTOP_MISTRAL_CODE_MODEL",
        "DESKTOP_MISTRAL_VISION_MODEL",
        "DESKTOP_AGENT_PORT",
        "DESKTOP_AGENT_CONVERSATION_ID",
        "DESKTOP_AGENT_WEB_BASE_URL",
        "DESKTOP_AGENT_LLM_PROVIDER",
        "DESKTOP_AGENT_VOICE",
        "DESKTOP_AGENT_MACOS_TTS_VOICE",
    )
    for key in env_keys:
        if key in os.environ:
            env_vars[key] = os.environ[key]

    gemini_key = (
        env_vars.get("GEMINI_API_KEY")
        or env_vars.get("GOOGLE_GENERATIVE_AI_API_KEY")
        or "REPLACE_ME"
    )
    mistral_key = env_vars.get("MISTRAL_API_KEY", "")
    mistral_secondary = env_vars.get("MISTRAL_API_KEY_SECONDARY", "")
    llm_provider = env_vars.get("DESKTOP_AGENT_LLM_PROVIDER", "mistral").strip().lower()
    if llm_provider != "mistral":
        llm_provider = "mistral"

    api_keys = {
        "gemini_api_key": gemini_key,
        "mistral_api_key": mistral_key,
        "mistral_api_key_secondary": mistral_secondary,
        "mistral_text_model": env_vars.get("DESKTOP_MISTRAL_TEXT_MODEL", "mistral-small-latest"),
        "mistral_text_model_fallback": env_vars.get(
            "DESKTOP_MISTRAL_TEXT_MODEL_FALLBACK", "mistral-medium-latest"
        ),
        "mistral_code_model": env_vars.get("DESKTOP_MISTRAL_CODE_MODEL", "codestral-latest"),
        "mistral_vision_model": env_vars.get("DESKTOP_MISTRAL_VISION_MODEL", "pixtral-12b-2409"),
        "default_llm_provider": llm_provider,
        "os_system": "Darwin",
    }

    api_keys_path = config_dir / "api_keys.json"
    api_keys_path.write_text(json.dumps(api_keys, indent=2) + "\n", encoding="utf-8")
    print(f"✅ Written {api_keys_path}")

    if gemini_key == "REPLACE_ME":
        print("⚠️  GEMINI_API_KEY not set — required for Gemini Live voice")
    if not mistral_key and not mistral_secondary:
        print("⚠️  Set MISTRAL_API_KEY and/or MISTRAL_API_KEY_SECONDARY for desktop text tools")

    bridge = {
        "health_port": int(env_vars.get("DESKTOP_AGENT_PORT", "8765")),
        "web_base_url": env_vars.get("DESKTOP_AGENT_WEB_BASE_URL", "http://127.0.0.1:3141"),
        "conversation_id": env_vars.get("DESKTOP_AGENT_CONVERSATION_ID", "desktop-voice-session"),
        "live_voice": env_vars.get("DESKTOP_AGENT_VOICE", "Schedar"),
        "macos_tts_voice": env_vars.get("DESKTOP_AGENT_MACOS_TTS_VOICE", "Daniel"),
        "memory_sync_enabled": True,
        "memory_sync_interval_sec": 60,
    }

    bridge_path = config_dir / "bridge.json"
    bridge_path.write_text(json.dumps(bridge, indent=2) + "\n", encoding="utf-8")
    print(f"✅ Written {bridge_path}")


if __name__ == "__main__":
    main()