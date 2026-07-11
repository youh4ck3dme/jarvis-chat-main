# JARVIS Desktop Voice Agent

Python desktop agent (Gemini Live + macOS tools). Full documentation:

**[docs/desktop-agent.md](../docs/desktop-agent.md)**

Quick start:

```bash
pnpm desktop:setup
pnpm desktop:gen-config
pnpm desktop:run
```

From `desktop-agent/` directly (do **not** use system `python main.py`):

```bash
./run.sh
# or
.venv/bin/python main.py
```

### macOS app icon (Dock / Applications)

```bash
pnpm desktop:app
```

Vytvorí **JARVIS.app** s ikonou a nainštaluje do `~/Applications`. Potom spustíš cez Spotlight alebo dvojklik — bez terminálu.