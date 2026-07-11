import pytest
from unittest.mock import patch, MagicMock
import subprocess

from actions.open_app import open_app
from actions.web_search import web_search
from actions.weather_report import weather_action
from actions.reminder import reminder

@patch("subprocess.run")
def test_open_app_success(mock_run):
    # Mock subprocess.run to succeed
    mock_run.return_value = MagicMock(returncode=0)
    
    res = open_app({"app_name": "Safari"})
    assert "Successfully opened" in res or "Opened" in res
    mock_run.assert_called_with(["open", "-a", "Safari"], check=True, capture_output=True)

@patch("subprocess.run")
def test_open_app_failure(mock_run):
    # Mock subprocess.run to raise exception on first open -a, but succeed on fallback open
    mock_run.side_effect = [
        subprocess.CalledProcessError(1, cmd=["open", "-a", "NonExistent"], stderr=b"App not found"),
        MagicMock(returncode=0)
    ]
    
    res = open_app({"app_name": "NonExistent"})
    assert "Opened NonExistent" in res

@patch("actions.web_search.DDGS")
def test_web_search_success(mock_ddgs):
    # Mock DDGS text results
    mock_instance = MagicMock()
    mock_instance.text.return_value = [
        {"title": "Test Result 1", "href": "https://test1.com", "body": "Snippet 1"},
        {"title": "Test Result 2", "href": "https://test2.com", "body": "Snippet 2"}
    ]
    mock_ddgs.return_value.__enter__.return_value = mock_instance
    
    res = web_search({"query": "python developer"})
    assert "Test Result 1" in res
    assert "https://test1.com" in res
    assert "Snippet 2" in res

@patch("requests.get")
def test_weather_report_success(mock_get):
    # Mock wttr.in JSON API response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "current_condition": [{
            "temp_C": "22",
            "weatherDesc": [{"value": "Sunny"}],
            "humidity": "60",
            "windspeedKmph": "10"
        }]
    }
    mock_get.return_value = mock_response
    
    res = weather_action({"city": "Bratislava"})
    assert "Bratislava" in res
    assert "22°C" in res
    assert "Sunny" in res
    assert "60%" in res

@patch("subprocess.run")
def test_reminder_no_date(mock_run):
    mock_run.return_value = MagicMock(returncode=0)
    
    res = reminder({"message": "Buy milk"})
    assert "Successfully created" in res
    assert "osascript" in mock_run.call_args[0][0]
