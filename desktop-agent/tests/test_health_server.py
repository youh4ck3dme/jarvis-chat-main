import pytest
from fastapi.testclient import TestClient
from bridge.health_server import create_app

client = TestClient(create_app())

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "agent_version" in data
    assert "platform" in data
    assert "tools_available" in data

def test_tools_endpoint():
    response = client.get("/tools")
    assert response.status_code == 200
    tools = response.json()
    assert isinstance(tools, list)
    assert len(tools) > 0
    # Check that open_app tool is registered in manifest
    tool_names = [t["name"] for t in tools]
    assert "open_app" in tool_names

def test_memory_status_endpoint():
    response = client.get("/status/memory")
    assert response.status_code == 200
    data = response.json()
    assert "sync_enabled" in data
    assert "conversation_id" in data
