"""
Action: file_processor
Handles local file analysis, conversions, and extractions (images, PDFs, DOCX, CSV/Excel).
"""
import os
import mimetypes
import logging
from pathlib import Path
from or_client import client as or_client

logger = logging.getLogger("file_processor")

def file_processor(parameters: dict, player=None, speak=None) -> str:
    file_path_str = parameters.get("file_path", "").strip()
    action = parameters.get("action", "summarize").lower().strip()
    instruction = parameters.get("instruction", "").strip()

    if not file_path_str:
        return "Error: No file path provided."

    file_path = Path(file_path_str).expanduser().resolve()
    if not file_path.exists():
        return f"Error: File at {file_path} does not exist."

    logger.info(f"File processor: processing {file_path.name} with action={action}")

    # Determine MIME type
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    try:
        # Check image files
        if mime_type.startswith("image/"):
            if action == "describe" or action == "ocr" or action == "summarize":
                # Use OpenRouter Vision API
                prompt = instruction if instruction else "Perform OCR and describe this image."
                reply = or_client.vision_from_file(prompt=prompt, image_path=str(file_path))
                return f"Image analysis result:\n\n{reply}"
            else:
                return f"Action '{action}' is not supported for images yet."

        # Check PDF files
        elif mime_type == "application/pdf":
            try:
                import pypdf
            except ImportError:
                return "Error: pypdf is not installed. Run 'pip install pypdf' to enable PDF processing."

            reader = pypdf.PdfReader(str(file_path))
            text = ""
            for idx, page in enumerate(reader.pages):
                text += page.extract_text() or ""
                if len(text) > 12000:  # Truncate to avoid context window blowup
                    break

            if action == "summarize":
                prompt = f"Summarize the following PDF text content:\n\n{text[:10000]}"
                if instruction:
                    prompt += f"\n\nInstruction: {instruction}"
                reply = or_client.chat(prompt)
                return f"PDF Summary:\n\n{reply}"
            elif action == "extract_text":
                return text[:5000] + ("\n\n[Truncated...]" if len(text) > 5000 else "")
            else:
                return f"Action '{action}' is not supported for PDFs."

        # Check plain text files or code files
        elif mime_type.startswith("text/") or file_path.suffix in (".py", ".js", ".ts", ".tsx", ".json", ".xml", ".html", ".css", ".md"):
            text = file_path.read_text(encoding="utf-8", errors="replace")
            
            if action == "summarize":
                prompt = f"Summarize the following text document:\n\n{text[:10000]}"
                if instruction:
                    prompt += f"\n\nInstruction: {instruction}"
                reply = or_client.chat(prompt)
                return f"Document Summary:\n\n{reply}"
            elif action == "explain" or action == "review":
                prompt = f"Please {action} the following code/content:\n\n{text[:10000]}"
                if instruction:
                    prompt += f"\n\nInstruction: {instruction}"
                reply = or_client.chat(prompt)
                return f"Code review/explanation:\n\n{reply}"
            else:
                return text[:5000] + ("\n\n[Truncated...]" if len(text) > 5000 else "")

        else:
            return f"Unsupported file type for processing: {mime_type} ({file_path.suffix})"

    except Exception as e:
        logger.error(f"File processing failed: {e}")
        return f"Failed to process file: {e}"
