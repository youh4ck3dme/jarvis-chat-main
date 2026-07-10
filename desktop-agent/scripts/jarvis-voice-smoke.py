#!/usr/bin/env python3
"""Smoke test: Iron Man JARVIS voice config + optional Gemini TTS probe."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from jarvis_voice import (  # noqa: E402
    IRON_MAN_JARVIS_BILINGUAL_DELIVERY,
    IRON_MAN_JARVIS_LIVE_VOICE,
    IRON_MAN_JARVIS_MACOS_TTS_VOICE,
    JARVIS_VOICE_SMOKE_LINE,
)


def fail(message: str) -> None:
    print(f"❌ {message}")
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f"✅ {message}")


def check_bridge_config() -> None:
    bridge_path = ROOT / "config" / "bridge.json"
    if not bridge_path.exists():
        fail(f"Missing {bridge_path}")

    bridge = json.loads(bridge_path.read_text(encoding="utf-8"))
    if bridge.get("live_voice") != IRON_MAN_JARVIS_LIVE_VOICE:
        fail(
            f"bridge.json live_voice={bridge.get('live_voice')!r}, "
            f"expected {IRON_MAN_JARVIS_LIVE_VOICE!r}",
        )
    if bridge.get("macos_tts_voice") != IRON_MAN_JARVIS_MACOS_TTS_VOICE:
        fail(
            f"bridge.json macos_tts_voice={bridge.get('macos_tts_voice')!r}, "
            f"expected {IRON_MAN_JARVIS_MACOS_TTS_VOICE!r}",
        )
    ok(f"bridge.json → Gemini {IRON_MAN_JARVIS_LIVE_VOICE}, macOS {IRON_MAN_JARVIS_MACOS_TTS_VOICE}")


def check_main_loader() -> None:
    from main import DEFAULT_LIVE_VOICE, _live_voice_name  # noqa: E402

    if DEFAULT_LIVE_VOICE != IRON_MAN_JARVIS_LIVE_VOICE:
        fail(f"main.DEFAULT_LIVE_VOICE={DEFAULT_LIVE_VOICE!r}")
    if _live_voice_name() != IRON_MAN_JARVIS_LIVE_VOICE:
        fail(f"main._live_voice_name()={_live_voice_name()!r}")
    ok("main.py loads Iron Man JARVIS live voice")


def check_prompt_persona() -> None:
    prompt = (ROOT / "core" / "prompt.txt").read_text(encoding="utf-8").lower()
    if "iron man" not in prompt or "jarvis" not in prompt:
        fail("core/prompt.txt missing Iron Man JARVIS persona")
    if "alternate" not in prompt and "english, slovak" not in prompt:
        fail("core/prompt.txt missing bilingual voice instruction")
    if "alternate every single word" not in IRON_MAN_JARVIS_BILINGUAL_DELIVERY.lower():
        fail("jarvis_voice bilingual delivery block incomplete")
    ok("system prompt includes Iron Man JARVIS + EN/SK alternation")


def check_macos_voice() -> None:
    if shutil.which("say") is None:
        fail("macOS say(1) not found")
    result = subprocess.run(
        ["say", "-v", "?"],
        capture_output=True,
        text=True,
        check=False,
    )
    if IRON_MAN_JARVIS_MACOS_TTS_VOICE not in result.stdout:
        fail(f"macOS voice {IRON_MAN_JARVIS_MACOS_TTS_VOICE!r} not installed")
    ok(f"macOS voice {IRON_MAN_JARVIS_MACOS_TTS_VOICE!r} available")


def play_macos_sample() -> None:
    subprocess.run(
        ["say", "-v", IRON_MAN_JARVIS_MACOS_TTS_VOICE, JARVIS_VOICE_SMOKE_LINE],
        check=False,
    )
    ok("played macOS JARVIS sample (Daniel)")


def probe_gemini_voice() -> None:
    api_keys_path = ROOT / "config" / "api_keys.json"
    if not api_keys_path.exists():
        print("⚠️  skip Gemini probe — no api_keys.json")
        return

    key = json.loads(api_keys_path.read_text(encoding="utf-8")).get("gemini_api_key", "")
    if not key or key == "REPLACE_ME":
        print("⚠️  skip Gemini probe — no API key")
        return

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("⚠️  skip Gemini probe — google-genai missing")
        return

    client = genai.Client(api_key=key)
    try:
        resp = client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=JARVIS_VOICE_SMOKE_LINE,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=IRON_MAN_JARVIS_LIVE_VOICE,
                        ),
                    ),
                ),
            ),
        )
    except Exception as error:  # noqa: BLE001
        print(f"⚠️  Gemini probe skipped: {error}")
        return

    parts = resp.candidates[0].content.parts if resp.candidates else []
    if not any(getattr(part, "inline_data", None) for part in parts):
        fail("Gemini TTS returned no audio")
    ok(f"Gemini TTS probe OK — voice {IRON_MAN_JARVIS_LIVE_VOICE}")


def main() -> None:
    print("JARVIS Iron Man voice smoke test\n")
    check_bridge_config()
    check_main_loader()
    check_prompt_persona()
    check_macos_voice()
    play_macos_sample()
    probe_gemini_voice()
    print("\n✅ JARVIS voice smoke test passed")


if __name__ == "__main__":
    main()