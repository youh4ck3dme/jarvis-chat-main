"""
Action: youtube_video
Controls YouTube video playback and transcript retrieval.
"""
import logging
import subprocess
import requests
from urllib.parse import urlparse, parse_qs
from actions.web_search import web_search

logger = logging.getLogger("youtube_video")

def youtube_video(parameters: dict, response=None, player=None) -> str:
    action = parameters.get("action", "play").lower().strip()
    query = parameters.get("query", "").strip()
    url = parameters.get("url", "").strip()
    save = parameters.get("save", False)
    region = parameters.get("region", "US").strip()

    logger.info(f"YouTube Video Action: {action}, query={query}, url={url}")

    try:
        if action == "play":
            if url:
                video_url = url
            elif query:
                # Search for video URL first using duckduckgo site:youtube.com
                search_res = web_search({"query": f"site:youtube.com {query}"})
                # Simple extraction of the first YouTube link
                import re
                urls = re.findall(r'(https?://(?:www\.)?youtube\.com/watch\?v=\S+)', search_res)
                if urls:
                    video_url = urls[0]
                else:
                    return f"Could not find any YouTube videos matching query: {query}"
            else:
                return "Error: Play action requires either a query or a direct video URL."

            # Open standard YouTube URL in the default browser on macOS
            subprocess.run(["open", video_url], check=True)
            return f"Playing YouTube video: {video_url}"

        elif action == "summarize" or action == "get_info":
            video_url = url
            if not video_url and query:
                # Fallback to search
                search_res = web_search({"query": f"site:youtube.com {query}"})
                import re
                urls = re.findall(r'(https?://(?:www\.)?youtube\.com/watch\?v=\S+)', search_res)
                if urls:
                    video_url = urls[0]

            if not video_url:
                return "Error: Could not identify video URL to summarize."

            # Parse video ID
            parsed_url = urlparse(video_url)
            video_id = None
            if parsed_url.hostname in ('youtu.be', 'www.youtu.be'):
                video_id = parsed_url.path[1:]
            elif parsed_url.hostname in ('youtube.com', 'www.youtube.com'):
                if parsed_url.path == '/watch':
                    video_id = parse_qs(parsed_url.query).get('v', [None])[0]
                elif parsed_url.path.startswith(('/embed/', '/v/')):
                    video_id = parsed_url.path.split('/')[2]

            if not video_id:
                return f"Could not parse valid Video ID from URL: {video_url}"

            # Fetch transcript using youtube-transcript-api
            from youtube_transcript_api import YouTubeTranscriptApi
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'sk'])
                full_text = " ".join([t['text'] for t in transcript_list])
                
                # Perform a basic truncation or summarize using OpenRouter
                if action == "summarize":
                    from or_client import client as or_client
                    prompt = (
                        f"Summarize the transcript of this YouTube video in bullet points:\n\n"
                        f"{full_text[:6000]}"
                    )
                    summary = or_client.chat(prompt)
                    
                    if save:
                        from pathlib import Path
                        save_path = Path.home() / "Desktop" / f"youtube_summary_{video_id}.txt"
                        save_path.write_text(summary, encoding="utf-8")
                        return f"YouTube video transcript summarized and saved to desktop:\n\n{summary}"
                    
                    return f"YouTube Transcript Summary:\n\n{summary}"
                else:
                    return f"Successfully retrieved transcript ({len(full_text)} characters):\n\n{full_text[:1000]}..."

            except Exception as e:
                logger.error(f"Transcript fetch failed: {e}")
                return f"Failed to retrieve transcript for video ID {video_id}. It might not have closed captions enabled. (Error: {e})"

        else:
            return f"Unknown YouTube action: {action}"

    except Exception as e:
        logger.error(f"YouTube action failed: {e}")
        return f"Failed to process YouTube action: {e}"
