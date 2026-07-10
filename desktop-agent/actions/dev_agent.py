"""
Action: dev_agent
Acts as an autonomous development agent running inside a specific workspace.
"""
import os
import logging
from pathlib import Path
from or_client import client as or_client

logger = logging.getLogger("dev_agent")

def dev_agent(parameters: dict, player=None, speak=None) -> str:
    task = parameters.get("task", "").strip()
    project_path_str = parameters.get("project_path", "").strip()
    language = parameters.get("language", "").strip()

    if not task:
        return "Error: Task description is required."

    project_path = Path(project_path_str).expanduser().resolve() if project_path_str else Path.cwd()
    if not project_path.exists():
        return f"Error: Workspace path '{project_path}' does not exist."

    logger.info(f"Dev agent: task='{task}' in {project_path}")
    
    if speak:
        speak("Initializing development agent workspace.")

    # High-level dev agent prompt
    prompt = (
        f"You are the JARVIS Autonomous Developer Agent.\n"
        f"We are running inside workspace directory: {project_path}\n"
        f"Task to accomplish: {task}\n"
        f"Language context: {language}\n\n"
        f"List all the files in this directory and plan how you would execute this task. "
        f"Provide a step-by-step implementation guide or code changes."
    )

    try:
        reply = or_client.chat(
            prompt=prompt,
            system="You are an advanced, autonomous programming agent. Deliver exact file change plans and code implementations.",
            use_code_model=True,
            prefer_secondary=True,
        )
        return f"Developer Agent Plan & Execution:\n\n{reply}"
    except Exception as e:
        logger.error(f"Dev Agent failed: {e}")
        return f"Dev Agent failed: {e}"
