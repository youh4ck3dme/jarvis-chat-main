"""
Action: code_helper
Analyzes, reviews, optimizes, and generates code using OpenRouter.
"""
import logging
from or_client import client as or_client

logger = logging.getLogger("code_helper")

def code_helper(parameters: dict, player=None, speak=None) -> str:
    action = parameters.get("action", "").lower().strip()
    code = parameters.get("code", "").strip()
    language = parameters.get("language", "").strip()
    instruction = parameters.get("instruction", "").strip()

    if not action:
        return "Error: Action parameter is required."

    logger.info(f"Code helper: action={action}, language={language}")

    prompt = ""
    if action == "generate":
        prompt = f"Write some {language} code based on this instruction: {instruction}."
    elif action == "explain":
        prompt = f"Explain the following {language} code:\n\n{code}\n\nAdditional instruction: {instruction}"
    elif action == "optimize":
        prompt = f"Optimize the following {language} code for efficiency and readability:\n\n{code}\n\nAdditional instruction: {instruction}"
    elif action == "fix":
        prompt = f"Identify and fix bugs or syntax errors in the following {language} code:\n\n{code}\n\nAdditional instruction: {instruction}"
    elif action == "review":
        prompt = f"Perform a comprehensive code review of the following {language} code:\n\n{code}\n\nAdditional instruction: {instruction}"
    else:
        prompt = f"Analyze the following code/instruction:\n\nCode:\n{code}\n\nInstruction: {instruction}"

    try:
        reply = or_client.chat(
            prompt=prompt,
            system="You are JARVIS's developer core assistant. Write elegant, efficient, and well-commented code.",
            use_code_model=True,
            prefer_secondary=True,
        )
        return reply if reply else "Failed to get a response from the LLM client."
    except Exception as e:
        logger.error(f"Code helper LLM call failed: {e}")
        return f"Code Helper failed: {e}"
