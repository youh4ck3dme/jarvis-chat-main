"""
Action: browser_control
Uses Playwright to automate Chromium browser navigation, typing, clicking, and page analysis.
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger("browser_control")

# Persistent browser instance context across calls would require a running daemon.
# Instead, we execute individual self-contained runs.
def browser_control(parameters: dict, player=None) -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return "Error: Playwright is not installed. Please run 'make setup' inside the desktop-agent folder first."

    action = parameters.get("action", "").lower().strip()
    url = parameters.get("url", "").strip()
    selector = parameters.get("selector", "").strip()
    text = parameters.get("text", "").strip()
    direction = parameters.get("direction", "down").lower().strip()

    if not action:
        return "Error: Action parameter is required."

    logger.info(f"Browser control: action={action}, url={url}")

    try:
        with sync_playwright() as p:
            # Launch Chromium in headful or headless mode depending on workspace needs
            # We use headful so the user can see what the assistant is doing.
            browser = p.chromium.launch(headless=False)
            page = browser.new_page()
            
            if action == "navigate":
                if not url:
                    return "Error: URL is required to navigate."
                if not url.startswith(("http://", "https://")):
                    url = "https://" + url
                
                page.goto(url)
                # Wait for network idle or load
                page.wait_for_load_state("load")
                title = page.title()
                content = page.locator("body").inner_text()
                browser.close()
                return f"Successfully navigated to '{title}'. Page content:\n{content[:800]}..."

            elif action == "extract_text":
                if not url:
                    return "Error: URL is required to extract text."
                if not url.startswith(("http://", "https://")):
                    url = "https://" + url
                
                page.goto(url)
                page.wait_for_load_state("domcontentloaded")
                content = page.locator("body").inner_text()
                browser.close()
                # Return limited text response
                return content[:5000]

            elif action == "screenshot":
                if not url:
                    return "Error: URL is required for screenshot."
                if not url.startswith(("http://", "https://")):
                    url = "https://" + url
                
                page.goto(url)
                page.wait_for_load_state("load")
                
                tmp_dir = Path.home() / ".jarvis" / "tmp"
                tmp_dir.mkdir(parents=True, exist_ok=True)
                scr_path = tmp_dir / "browser_screenshot.png"
                
                page.screenshot(path=str(scr_path))
                browser.close()
                return f"Screenshot saved successfully at {scr_path}."

            else:
                browser.close()
                return f"Browser action '{action}' is not supported in simple execution mode."

    except Exception as e:
        logger.error(f"Browser control failed: {e}")
        return f"Browser action failed: {e}"
