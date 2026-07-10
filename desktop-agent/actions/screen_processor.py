"""
Action: screen_processor
Captures a screenshot or webcam photo on macOS and analyzes it using OpenRouter Vision.
Runs in a separate thread and speaks the description directly to the user.
"""
import json
import os
import time
import subprocess
import logging
import threading
from pathlib import Path
from jarvis_voice import IRON_MAN_JARVIS_MACOS_TTS_VOICE
from or_client import client as or_client

logger = logging.getLogger("screen_processor")

def _macos_tts_voice() -> str:
    try:
        bridge_path = Path(__file__).resolve().parent.parent / "config" / "bridge.json"
        voice = json.loads(bridge_path.read_text(encoding="utf-8")).get(
            "macos_tts_voice",
            IRON_MAN_JARVIS_MACOS_TTS_VOICE,
        )
        return str(voice).strip() or IRON_MAN_JARVIS_MACOS_TTS_VOICE
    except Exception:
        return IRON_MAN_JARVIS_MACOS_TTS_VOICE


def speak_macos(text: str):
    """Speaks text using macOS native TTS — Daniel = British male (Iron Man JARVIS style)."""
    voice = _macos_tts_voice()

    def _say():
        try:
            subprocess.run(["say", "-v", voice, text], check=False)
        except Exception as e:
            logger.error(f"say command failed: {e}")
    threading.Thread(target=_say, daemon=True).start()

def screen_process(parameters: dict, response=None, player=None, session_memory=None) -> str:
    angle = parameters.get("angle", "screen").lower().strip()
    prompt = parameters.get("text", "Describe what you see.").strip()

    tmp_dir = Path.home() / ".jarvis" / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    img_path = tmp_dir / f"capture_{int(time.time())}.png"

    logger.info(f"Screen processor: angle={angle}, prompt='{prompt}'")

    if angle == "camera":
        # Capture from webcam using opencv
        try:
            import cv2
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                msg = "Webcam is not accessible or currently in use."
                if player:
                    player.write_log(f"Vision: {msg}")
                speak_macos(msg)
                return msg
            
            # Warm up camera sensor
            for _ in range(5):
                cap.read()
                
            ret, frame = cap.read()
            if ret:
                cv2.imwrite(str(img_path), frame)
            cap.release()
        except ImportError:
            msg = "opencv-python (cv2) is not installed. Webcam capture is unavailable."
            if player:
                player.write_log(f"Vision: {msg}")
            speak_macos(msg)
            return msg
        except Exception as e:
            msg = f"Failed to capture from webcam: {e}"
            if player:
                player.write_log(f"Vision: {msg}")
            speak_macos(msg)
            return msg
    else:
        # Capture screen using macOS screencapture CLI
        try:
            subprocess.run(["screencapture", "-x", str(img_path)], check=True)
        except subprocess.CalledProcessError as e:
            msg = f"Failed to take screenshot: {e}"
            if player:
                player.write_log(f"Vision: {msg}")
            speak_macos(msg)
            return msg

    if not img_path.exists():
        msg = "Failed to locate captured image."
        speak_macos(msg)
        return msg

    # Send to OpenRouter Vision
    if player:
        player.write_log("Vision: Analyzing image via OpenRouter...")

    try:
        reply = or_client.vision_from_file(
            prompt=prompt,
            image_path=str(img_path),
            system="You are JARVIS's vision module. Describe the image clearly and concisely as if you are looking at it in real-time."
        )
        
        if reply:
            if player:
                player.write_log(f"Vision reply: {reply}")
            speak_macos(reply)
            # Remove tmp file
            try:
                os.remove(img_path)
            except OSError:
                pass
            return reply
        else:
            msg = "Could not analyze the image."
            speak_macos(msg)
            return msg
    except Exception as e:
        msg = f"Vision analysis failed: {e}"
        logger.error(msg)
        speak_macos("Sorry sir, vision analysis failed.")
        return msg
