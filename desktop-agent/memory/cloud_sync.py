"""
Cloud memory sync adapter.
Communicates with the web application's memory sync API.
"""
import json
import logging
import requests
from typing import Optional

logger = logging.getLogger("cloud_sync")

def pull_memory(web_base_url: str, headers: dict) -> Optional[dict]:
    """
    GET {web_base_url}/api/memory/sync
    Retrieves the complete cloud memory bundle (conversations & profile).
    """
    url = f"{web_base_url.rstrip('/')}/api/memory/sync"
    try:
        logger.info(f"[MemorySync] Pulling from {url}...")
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            return resp.json()
        else:
            logger.warning(f"[MemorySync] Pull failed with status: {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"[MemorySync] Pull exception: {e}")
        return None

def push_memory(web_base_url: str, headers: dict, bundle: dict) -> bool:
    """
    POST {web_base_url}/api/memory/sync
    Sends the local memory bundle to the cloud.
    """
    url = f"{web_base_url.rstrip('/')}/api/memory/sync"
    try:
        logger.info(f"[MemorySync] Pushing to {url}...")
        resp = requests.post(url, headers=headers, json=bundle, timeout=10)
        if resp.status_code in (200, 201):
            logger.info("[MemorySync] Push successful!")
            return True
        else:
            logger.warning(f"[MemorySync] Push failed with status: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        logger.error(f"[MemorySync] Push exception: {e}")
        return False
