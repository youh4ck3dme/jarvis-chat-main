"""
Memory manager for JARVIS.
Stores memories locally in data/memory.json and synchronizes with the Next.js web application.
"""
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from or_client import client as or_client
from bridge.auth_store import get_auth_headers
from bridge.health_server import set_last_memory_sync
from memory.cloud_sync import pull_memory, push_memory

logger = logging.getLogger("memory_manager")

BASE_DIR = Path(__file__).resolve().parent.parent
MEMORY_FILE = BASE_DIR / "data" / "memory.json"
BRIDGE_CONFIG_PATH = BASE_DIR / "config" / "bridge.json"

# Ensure data directory exists
MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)

def _load_bridge_config() -> dict:
    try:
        return json.loads(BRIDGE_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {
            "web_base_url": "http://127.0.0.1:3141",
            "conversation_id": "desktop-voice-session",
        }

def load_memory() -> Dict[str, Any]:
    """Loads memory from local JSON file. Tries pulling from cloud if auth is active."""
    if not MEMORY_FILE.exists():
        # Try initial pull from cloud if authenticated
        headers = get_auth_headers()
        bridge = _load_bridge_config()
        if headers:
            cloud_data = pull_memory(bridge["web_base_url"], headers)
            if cloud_data:
                memory_data = _convert_cloud_to_local(cloud_data)
                _save_local(memory_data)
                set_last_memory_sync(datetime.utcnow().isoformat())
                return memory_data
        return {}

    try:
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error(f"Failed to read memory file: {e}")
        return {}

def _save_local(memory: Dict[str, Any]) -> None:
    try:
        MEMORY_FILE.write_text(json.dumps(memory, indent=2) + "\n", encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to save local memory: {e}")

def _convert_cloud_to_local(cloud_data: Dict[str, Any]) -> Dict[str, Any]:
    """Converts Supabase structure from cloud sync endpoint into local category dict."""
    local_mem = {}
    
    # 1. Handle conversations / desktop-voice-session entries
    conversations = cloud_data.get("memory", {}).get("conversations", [])
    bridge = _load_bridge_config()
    target_id = bridge.get("conversation_id", "desktop-voice-session")
    
    for conv in conversations:
        if conv.get("conversationId") == target_id:
            for entry in conv.get("entries", []):
                # Entries have a type like: fact, preference, user_info, summarization
                # Map them back into categorised memories
                m_type = entry.get("type", "notes")
                content = entry.get("content", "")
                if m_type and content:
                    # Synthesize a key from the content (snake_case)
                    key = content.split(":")[0].strip().lower().replace(" ", "_") if ":" in content else str(uuid.uuid4())[:8]
                    if m_type not in local_mem:
                        local_mem[m_type] = {}
                    local_mem[m_type][key] = {"value": content}
                    
    # Also parse userProfile if exists
    profile = cloud_data.get("memory", {}).get("userProfile", {})
    if profile:
        local_mem["identity"] = local_mem.get("identity", {})
        for k, v in profile.items():
            local_mem["identity"][k] = {"value": v}
            
    return local_mem

def update_memory(new_data: Dict[str, Any]) -> None:
    """
    Updates local memory cache with new categories, keys, and values.
    Triggers an asynchronous background cloud sync if authenticated.
    """
    memory = load_memory()
    
    # Deep merge new_data into memory
    for category, keys_dict in new_data.items():
        if category not in memory:
            memory[category] = {}
        for key, item in keys_dict.items():
            if isinstance(item, dict) and "value" in item:
                memory[category][key] = {"value": item["value"]}
            else:
                # Handle simplified input update_memory({"category": {"key": "value"}})
                memory[category][key] = {"value": str(item)}

    _save_local(memory)
    
    # Trigger Cloud Sync
    headers = get_auth_headers()
    if headers:
        bridge = _load_bridge_config()
        # Convert local memory format to cloud payload
        cloud_payload = _convert_local_to_cloud(memory)
        success = push_memory(bridge["web_base_url"], headers, cloud_payload)
        if success:
            set_last_memory_sync(datetime.utcnow().isoformat())

def _convert_local_to_cloud(local_mem: Dict[str, Any]) -> Dict[str, Any]:
    """Converts local category memory format into Next.js compatible cloud payload."""
    bridge = _load_bridge_config()
    conv_id = bridge.get("conversation_id", "desktop-voice-session")
    
    entries = []
    user_profile = {}

    for category, keys_dict in local_mem.items():
        for key, item in keys_dict.items():
            val = item.get("value", "")
            if not val:
                continue
                
            # If identity category, map to userProfile
            if category == "identity":
                user_profile[key] = val
                
            # Standard entry format
            # type maps: fact, preference, user_info, summarization
            m_type = "fact"
            if category in ("preferences", "preference"):
                m_type = "preference"
            elif category in ("identity", "user_info"):
                m_type = "user_info"
            elif category == "summarization":
                m_type = "summarization"
                
            entries.append({
                "id": str(uuid.uuid4()),
                "type": m_type,
                "content": f"{key}: {val}" if not key.startswith("uuid") else val,
                "metadata": {
                    "sourceConversationId": conv_id,
                    "tags": ["desktop-voice"],
                    "confidence": 0.9,
                },
                "importance": 70,
                "lastAccessed": datetime.utcnow().isoformat() + "Z",
                "createdAt": datetime.utcnow().isoformat() + "Z"
            })

    return {
        "memory": {
            "conversations": [{
                "conversationId": conv_id,
                "entries": entries,
                "conversationMemory": {}
            }],
            "userProfile": user_profile
        }
    }

def format_memory_for_prompt(memory: Dict[str, Any]) -> str:
    """Formats stored memories into a prompt block for the Gemini system instruction."""
    if not memory:
        return ""
        
    lines = ["[PERSONAL MEMORIES & CONTEXT]"]
    for category, keys_dict in memory.items():
        if not keys_dict:
            continue
        lines.append(f"- {category.upper()}:")
        for key, item in keys_dict.items():
            val = item.get("value", "")
            lines.append(f"  * {key.replace('_', ' ')}: {val}")
            
    return "\n".join(lines) + "\n"

def should_extract_memory(user_text: str, jarvis_text: str, api_key: str) -> bool:
    """
    Lightweight heuristic filter or quick LLM check using OpenRouter
    to see if conversation contains new personal information worth saving.
    """
    # Quick filter: check if context contains words like 'name', 'prefer', 'like', 'live', 'work', etc.
    trigger_words = [
        "volám", "meno", "bývam", "mám rád", "radšej", "preferujem", "robím", "práca",
        "hobby", "narodeniny", "vek", "brat", "sestra", "mama", "otec", "kamarát",
        "my name", "i live", "i work", "i prefer", "i like", "my birthday", "brother", "sister"
    ]
    user_lower = user_text.lower()
    return any(word in user_lower for word in trigger_words)

def extract_memory(user_text: str, jarvis_text: str, api_key: str) -> Optional[Dict[str, Any]]:
    """
    Extracts structured personal info using OpenRouter's free-tier LLM.
    Returns: {"category": {"key": {"value": "extracted fact"}}} or None
    """
    prompt = (
        f"Analyze the following conversation segment:\n"
        f"User: {user_text}\n"
        f"JARVIS: {jarvis_text}\n\n"
        f"Identify if the User has shared any long-term personal facts, preferences, identity details, relationships, or active projects.\n"
        f"Format the response ONLY as a JSON object of category, key (snake_case), value. "
        f"Category must be one of: identity, preferences, projects, relationships, wishes, notes.\n"
        f"Example output: {{\"preferences\": {{\"favorite_editor\": {{\"value\": \"Cursor\"}}}}}}\n"
        f"If nothing new is worth remembering, return exactly: {{}}"
    )
    
    try:
        response = or_client.chat_json(prompt)
        if response and isinstance(response, dict):
            # Clean empty keys
            return {k: v for k, v in response.items() if v}
        return None
    except Exception as e:
        logger.error(f"Failed to extract memory: {e}")
        return None
