import json
from pathlib import Path

from jarvis_voice import IRON_MAN_JARVIS_LIVE_VOICE, IRON_MAN_JARVIS_MACOS_TTS_VOICE


def test_bridge_json_uses_iron_man_jarvis_voices():
    bridge = json.loads((Path(__file__).resolve().parent.parent / "config" / "bridge.json").read_text())
    assert bridge["live_voice"] == IRON_MAN_JARVIS_LIVE_VOICE
    assert bridge["macos_tts_voice"] == IRON_MAN_JARVIS_MACOS_TTS_VOICE


def test_main_default_live_voice():
    from main import DEFAULT_LIVE_VOICE, _live_voice_name

    assert DEFAULT_LIVE_VOICE == IRON_MAN_JARVIS_LIVE_VOICE
    assert _live_voice_name() == IRON_MAN_JARVIS_LIVE_VOICE


def test_prompt_mentions_iron_man_jarvis():
    prompt = (Path(__file__).resolve().parent.parent / "core" / "prompt.txt").read_text(encoding="utf-8").lower()
    assert "iron man" in prompt
    assert "jarvis" in prompt