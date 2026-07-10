"""
Action: send_message
Sends a message using macOS Messages or platform specific protocols.
"""
import subprocess
import logging

logger = logging.getLogger("send_message")

def send_message(parameters: dict, response=None, player=None, session_memory=None) -> str:
    receiver = parameters.get("receiver", "").strip()
    message_text = parameters.get("message_text", "").strip()
    platform = parameters.get("platform", "imessage").lower().strip()

    if not receiver or not message_text:
        return "Error: Recipient name and message body are required."

    logger.info(f"Sending message to {receiver} via {platform}: '{message_text}'")

    try:
        if "whatsapp" in platform:
            # Open WhatsApp Web or WhatsApp Desktop scheme
            # https://wa.me/number?text=msg
            # If receiver contains a number, use wa.me, otherwise open WhatsApp Desktop
            import urllib.parse
            encoded_msg = urllib.parse.quote(message_text)
            
            # Simple check if receiver is a number
            clean_rec = "".join(filter(str.isdigit, receiver))
            if clean_rec:
                url = f"https://wa.me/{clean_rec}?text={encoded_msg}"
                subprocess.run(["open", url], check=True)
                return f"Opened WhatsApp message draft to number {clean_rec}."
            else:
                subprocess.run(["open", "-a", "WhatsApp"], check=True)
                return "Opened WhatsApp client (Note: search for receiver manually)."
                
        else:
            # Default to Apple iMessage / Messages.app using AppleScript
            # Note: receiver can be a contact name or a phone number/email
            applescript = f"""
            tell application "Messages"
                set targetService to 1st service whose service type is iMessage
                set targetBuddy to buddy "{receiver}" of targetService
                send "{message_text}" to targetBuddy
            end tell
            """
            # As a simpler safety fallback that doesn't error out on unknown buddy names,
            # we can open a draft: SMS URL scheme: imessage://receiver
            # Or attempt to run the script.
            try:
                subprocess.run(["osascript", "-e", applescript], check=True, capture_output=True)
                return f"Sent iMessage to '{receiver}' successfully."
            except subprocess.CalledProcessError:
                # Open SMS composer scheme
                url = f"imessage://{receiver}"
                subprocess.run(["open", url], check=True)
                return f"Opened iMessage draft to contact '{receiver}'."

    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        return f"Failed to draft or send message: {e}"
