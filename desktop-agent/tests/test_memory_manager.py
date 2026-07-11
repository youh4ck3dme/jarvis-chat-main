import pytest
import json
from unittest.mock import patch, MagicMock
from pathlib import Path

from memory.memory_manager import (
    load_memory,
    update_memory,
    format_memory_for_prompt,
    should_extract_memory
)

@pytest.fixture(autouse=True)
def clean_memory_file(tmp_path):
    # Mock MEMORY_FILE to point to a temporary test file path
    test_file = tmp_path / "test_memory.json"
    with patch("memory.memory_manager.MEMORY_FILE", test_file):
        yield

def test_load_empty_memory():
    mem = load_memory()
    assert mem == {}

def test_update_and_load_memory():
    # Update local memory
    update_memory({
        "preferences": {
            "favorite_language": {"value": "Python"}
        }
    })
    
    # Reload and assert values
    mem = load_memory()
    assert "preferences" in mem
    assert mem["preferences"]["favorite_language"]["value"] == "Python"

def test_format_memory_for_prompt():
    update_memory({
        "identity": {
            "name": {"value": "Erik"}
        },
        "preferences": {
            "theme": {"value": "dark"}
        }
    })
    
    mem = load_memory()
    prompt_str = format_memory_for_prompt(mem)
    assert "[PERSONAL MEMORIES & CONTEXT]" in prompt_str
    assert "name: Erik" in prompt_str
    assert "theme: dark" in prompt_str

def test_should_extract_memory_triggers():
    assert should_extract_memory("My name is Erik", "Nice to meet you", "dummy-key") == True
    assert should_extract_memory("Volám sa Erik", "Ahoj", "dummy-key") == True
    assert should_extract_memory("Hello, how are you?", "I am fine", "dummy-key") == False
