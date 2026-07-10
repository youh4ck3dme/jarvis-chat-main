import json
import sys
import time
import base64
import logging
from pathlib import Path
from typing import Optional

import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mistral_client")

def _get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent


BASE_DIR     = _get_base_dir()
API_KEY_PATH = BASE_DIR / "config" / "api_keys.json"
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
DEFAULT_TEXT_MODEL = "mistral-small-latest"
DEFAULT_TEXT_MODEL_FALLBACK = "mistral-medium-latest"
DEFAULT_CODE_MODEL = "codestral-latest"
DEFAULT_VISION_MODEL = "pixtral-12b-2409"

def _load_config() -> dict:
    try:
        with open(API_KEY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise RuntimeError(f"api_keys.json not found at: {API_KEY_PATH}")
    except Exception as e:
        raise RuntimeError(f"Failed to load api_keys.json: {e}")

def _mistral_keys(config: dict) -> list[str]:
    keys: list[str] = []
    for field in ("mistral_api_key", "mistral_api_key_secondary"):
        value = (config.get(field) or "").strip()
        if value and value not in keys:
            keys.append(value)
    return keys


def _model_from_config(config: dict, field: str, default: str) -> str:
    return (config.get(field) or default).strip() or default


def _build_mistral_attempts(
    config: dict,
    *,
    model: Optional[str] = None,
    prefer_secondary: bool = False,
) -> list[tuple[str, str]]:
    keys = _mistral_keys(config)
    if not keys:
        raise ValueError("No Mistral API key configured (MISTRAL_API_KEY / MISTRAL_API_KEY_SECONDARY)")

    if prefer_secondary and len(keys) > 1:
        keys = [keys[1], keys[0]]

    text_model = model or _model_from_config(config, "mistral_text_model", DEFAULT_TEXT_MODEL)
    fallback_model = _model_from_config(
        config, "mistral_text_model_fallback", DEFAULT_TEXT_MODEL_FALLBACK
    )

    attempts: list[tuple[str, str]] = []
    for key in keys:
        attempts.append((key, text_model))
    if fallback_model != text_model and len(keys) > 0:
        attempts.append((keys[-1], fallback_model))
    return attempts

TEXT_MODELS: list[str] = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "minimax/minimax-m2.5:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "qwen/qwen3-coder:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-3-27b-it:free",
    "arcee-ai/trinity-large-preview:free",
    "z-ai/glm-4.5-air:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "google/gemma-3-12b-it:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "google/gemma-3-4b-it:free",
    "google/gemma-3n-e4b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "google/gemma-3n-e2b-it:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
]

VISION_MODELS: list[str] = [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "nvidia/llama-nemotron-embed-vl-1b-v2:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-3n-e4b-it:free",
    "google/gemma-3n-e2b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
]

OPENROUTER_API_URL    = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MAX_TOKENS    = 4096
DEFAULT_TEMPERATURE   = 0.7
REQUEST_TIMEOUT       = 60   # seconds per request
MAX_RETRIES_PER_MODEL = 2    # attempts before moving to next model
RETRY_DELAY           = 2    # seconds between retries
RATE_LIMIT_COOLDOWN   = 60   # seconds before retrying a rate-limited model

_rate_limited: dict[str, float] = {}

class MistralClient:

    def __init__(self) -> None:
        self._config = _load_config()
        self.provider = "mistral"
        keys = _mistral_keys(self._config)
        self.api_key = keys[0] if keys else ""

    def _is_rate_limited(self, model: str) -> bool:
        ts = _rate_limited.get(model)
        if ts is None:
            return False
        if time.time() - ts > RATE_LIMIT_COOLDOWN:
            del _rate_limited[model]
            return False
        return True

    def _mark_rate_limited(self, model: str) -> None:
        _rate_limited[model] = time.time()
        logger.warning(
            f"[Mistral] Rate limited: {model} — "
            f"cooling down for {RATE_LIMIT_COOLDOWN}s"
        )

    def _call_mistral(
        self,
        api_key: str,
        model: str,
        messages: list[dict],
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
    ) -> Optional[str]:
        payload: dict = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        for attempt in range(1, MAX_RETRIES_PER_MODEL + 1):
            try:
                resp = requests.post(
                    MISTRAL_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=REQUEST_TIMEOUT,
                )

                if resp.status_code == 429:
                    self._mark_rate_limited(model)
                    return None

                if resp.status_code == 200:
                    data = resp.json()
                    content = (
                        data.get("choices", [{}])[0]
                        .get("message", {})
                        .get("content", "")
                    )
                    return content.strip() if content else None

                logger.warning(
                    f"[Mistral] {model} → HTTP {resp.status_code} "
                    f"(attempt {attempt}/{MAX_RETRIES_PER_MODEL})"
                )

            except requests.exceptions.Timeout:
                logger.warning(
                    f"[Mistral] {model} → Timeout "
                    f"(attempt {attempt}/{MAX_RETRIES_PER_MODEL})"
                )
            except Exception as e:
                logger.error(f"[Mistral] {model} → Unexpected error: {e}")

            if attempt < MAX_RETRIES_PER_MODEL:
                time.sleep(RETRY_DELAY)

        return None

    def _call_with_fallback(
        self,
        pool: list[str],
        messages: list[dict],
        model: Optional[str] = None,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        response_format: Optional[dict] = None,
        *,
        prefer_secondary: bool = False,
    ) -> str:
        attempts = _build_mistral_attempts(
            self._config,
            model=model,
            prefer_secondary=prefer_secondary,
        )
        for api_key, resolved_model in attempts:
            if self._is_rate_limited(resolved_model):
                continue
            logger.info(f"[Mistral] Trying key=…{api_key[-4:]} model={resolved_model}")
            result = self._call_mistral(
                api_key, resolved_model, messages, max_tokens, temperature
            )
            if result:
                logger.info(f"[Mistral] ✓ Success: {resolved_model}")
                return result

        raise RuntimeError("Mistral API request failed (primary + secondary keys)")

    def chat(
        self,
        prompt: str,
        system: str = (
            "You are JARVIS, Erik's desktop AI assistant. "
            "Be concise, helpful, and precise."
        ),
        model: Optional[str] = None,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        *,
        use_code_model: bool = False,
        prefer_secondary: bool = False,
    ) -> str:
        resolved_model = model
        if use_code_model and not resolved_model:
            resolved_model = _model_from_config(
                self._config, "mistral_code_model", DEFAULT_CODE_MODEL
            )
        messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ]
        return self._call_with_fallback(
            [],
            messages,
            resolved_model,
            max_tokens,
            temperature,
            prefer_secondary=prefer_secondary,
        )

    def chat_json(
        self,
        prompt: str,
        system: str = (
            "Return ONLY valid JSON. "
            "No markdown fences, no extra text, no explanation."
        ),
        model: Optional[str] = None,
        max_tokens: int = DEFAULT_MAX_TOKENS,
    ) -> dict:
        messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ]
        raw = self._call_with_fallback([], messages, model, max_tokens, temperature=0.2)

        clean = raw.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip().rstrip("`").strip()

        try:
            return json.loads(clean)
        except json.JSONDecodeError as e:
            logger.error(
                f"[OpenRouter] JSON parse failed: {e}\n"
                f"Raw response (first 300 chars): {raw[:300]}"
            )
            raise ValueError(
                f"Model returned unparseable JSON: {e}\n"
                f"Raw output: {raw[:200]}"
            )

    def vision(
        self,
        prompt: str,
        image_b64: str,
        mime: str = "image/png",
        system: str = "Analyze the image and describe what you see clearly and concisely.",
        model: Optional[str] = None,
        max_tokens: int = 1024,
    ) -> str:
        messages = [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{image_b64}"
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            },
        ]
        vision_model = model or _model_from_config(
            self._config, "mistral_vision_model", DEFAULT_VISION_MODEL
        )
        return self._call_with_fallback(
            [], messages, vision_model, max_tokens, temperature=0.2
        )

    def vision_from_file(
        self,
        prompt: str,
        image_path: str,
        system: str = "Analyze the image and describe what you see clearly and concisely.",
        model: Optional[str] = None,
        max_tokens: int = 1024,
    ) -> str:
        path = Path(image_path)
        mime_map = {
            ".png":  "image/png",
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif":  "image/gif",
        }
        mime = mime_map.get(path.suffix.lower(), "image/png")

        with open(path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        return self.vision(prompt, image_b64, mime, system, model, max_tokens)

    def multi_turn(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
    ) -> str:
    
        return self._call_with_fallback([], messages, model, max_tokens, temperature)

    def available_models(self) -> dict:
        return {
            "text_model": _model_from_config(self._config, "mistral_text_model", DEFAULT_TEXT_MODEL),
            "text_model_fallback": _model_from_config(
                self._config, "mistral_text_model_fallback", DEFAULT_TEXT_MODEL_FALLBACK
            ),
            "code_model": _model_from_config(self._config, "mistral_code_model", DEFAULT_CODE_MODEL),
            "vision_model": _model_from_config(
                self._config, "mistral_vision_model", DEFAULT_VISION_MODEL
            ),
            "api_keys": len(_mistral_keys(self._config)),
            "rate_limited": list(_rate_limited.keys()),
        }

client = MistralClient()
OpenRouterClient = MistralClient  # backward-compatible alias

if __name__ == "__main__":
    print("=" * 55)
    print("  MARK XXV — OpenRouter Client Self-Test")
    print("=" * 55)

    print("\n[TEST 1] Basic chat...")
    try:
        reply = client.chat("Introduce yourself in one sentence.")
        print(f"  Response : {reply}")
        print(f"  Status   : PASS ✓")
    except Exception as e:
        print(f"  Status   : FAIL ✗ — {e}")

    print("\n[TEST 2] JSON mode...")
    try:
        data = client.chat_json(
            'List 3 programming languages. Format: {"languages": ["a", "b", "c"]}',
            system="Return only valid JSON. No extra text."
        )
        print(f"  Response : {data}")
        print(f"  Status   : PASS ✓")
    except Exception as e:
        print(f"  Status   : FAIL ✗ — {e}")

    print("\n[TEST 3] Multi-turn conversation...")
    try:
        history = [
            {"role": "system",    "content": "You are a helpful assistant. Be brief."},
            {"role": "user",      "content": "My name is Tony."},
            {"role": "assistant", "content": "Hello Tony, how can I help you?"},
            {"role": "user",      "content": "What is my name?"},
        ]
        reply = client.multi_turn(history)
        print(f"  Response : {reply}")
        print(f"  Status   : PASS ✓")
    except Exception as e:
        print(f"  Status   : FAIL ✗ — {e}")

    print("\n[TEST 4] Model pool info...")
    info = client.available_models()
    print(f"  Text models   : {info['total_text']}")
    print(f"  Vision models : {info['total_vision']}")
    print(f"  Rate limited  : {info['rate_limited'] or 'none'}")
    print(f"  Status        : PASS ✓")

    print("\n" + "=" * 55)
    print("  All tests complete.")
    print("=" * 55)