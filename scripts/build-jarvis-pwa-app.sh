#!/usr/bin/env bash
# Builds JARVIS Chat.app — macOS launcher for the web/PWA chat (Chrome/Edge app window).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="JARVIS Chat"
APP_BUNDLE="$ROOT/build/${APP_NAME}.app"
ICON_PNG="$ROOT/public/icons/jarvis-mobile-512.png"
ICONSET_DIR="$ROOT/build/PwaAppIcon.iconset"
ICNS_PATH="$ROOT/build/PwaAppIcon.icns"
INSTALL_DIR="${JARVIS_PWA_INSTALL_DIR:-$HOME/Applications}"
CONFIG_DIR="$HOME/.jarvis"
CONFIG_FILE="$CONFIG_DIR/pwa-config.json"
DEFAULT_URL="${JARVIS_PWA_URL:-https://jarvis-ten-omega.vercel.app/chat}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "❌ JARVIS Chat.app build is macOS only."
  exit 1
fi

if [[ ! -f "$ICON_PNG" ]]; then
  echo "⚠️  Missing $ICON_PNG — generating icons..."
  if [[ -x "$ROOT/desktop-agent/.venv/bin/python" ]]; then
    "$ROOT/desktop-agent/.venv/bin/python" "$ROOT/scripts/generate-jarvis-icons.py"
  else
    echo "❌ Run: pnpm icons:generate (or pnpm desktop:setup)"
    exit 1
  fi
fi

mkdir -p "$ROOT/build" "$ICONSET_DIR" "$CONFIG_DIR"

if [[ ! -f "$CONFIG_FILE" ]]; then
  printf '%s\n' "{\"url\":\"$DEFAULT_URL\"}" > "$CONFIG_FILE"
  echo "📝 Created $CONFIG_FILE (url=$DEFAULT_URL)"
fi

build_icon() {
  local size=$1
  local name=$2
  sips -z "$size" "$size" "$ICON_PNG" --out "$ICONSET_DIR/$name" >/dev/null
}

build_icon 16  icon_16x16.png
build_icon 32  icon_16x16@2x.png
build_icon 32  icon_32x32.png
build_icon 64  icon_32x32@2x.png
build_icon 128 icon_128x128.png
build_icon 256 icon_128x128@2x.png
build_icon 256 icon_256x256.png
build_icon 512 icon_256x256@2x.png
build_icon 512 icon_512x512.png
build_icon 1024 icon_512x512@2x.png

iconutil -c icns "$ICONSET_DIR" -o "$ICNS_PATH"

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"
cp "$ICNS_PATH" "$APP_BUNDLE/Contents/Resources/AppIcon.icns"

cat > "$APP_BUNDLE/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>jarvis-chat</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.pandorabox.jarvis.chat</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>JARVIS Chat</string>
  <key>CFBundleDisplayName</key>
  <string>JARVIS Chat</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

cat > "$APP_BUNDLE/Contents/MacOS/jarvis-chat" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail

CONFIG="$HOME/.jarvis/pwa-config.json"
URL="https://jarvis-ten-omega.vercel.app/chat"

if [[ -f "$CONFIG" ]]; then
  PARSED="$(python3 - <<'PY'
import json, os
path = os.path.expanduser("~/.jarvis/pwa-config.json")
try:
    with open(path) as f:
        print(json.load(f).get("url", "").strip())
except Exception:
    pass
PY
)"
  if [[ -n "$PARSED" ]]; then
    URL="$PARSED"
  fi
fi

if [[ -n "${JARVIS_PWA_URL:-}" ]]; then
  URL="$JARVIS_PWA_URL"
fi

open_pwa() {
  local browser=$1
  shift
  open -na "$browser" --args "$@"
}

if [[ -d "/Applications/Google Chrome.app" ]]; then
  open_pwa "Google Chrome" --app="$URL" --window-size=420,912
elif [[ -d "/Applications/Microsoft Edge.app" ]]; then
  open_pwa "Microsoft Edge" --app="$URL" --window-size=420,912
elif [[ -d "/Applications/Chromium.app" ]]; then
  open_pwa "Chromium" --app="$URL" --window-size=420,912
else
  open "$URL"
fi
LAUNCHER

chmod +x "$APP_BUNDLE/Contents/MacOS/jarvis-chat"

mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/${APP_NAME}.app"
cp -R "$APP_BUNDLE" "$INSTALL_DIR/"

echo "✅ Built: $APP_BUNDLE"
echo "✅ Installed: $INSTALL_DIR/${APP_NAME}.app"
echo ""
echo "Spustenie:"
echo "  • Spotlight → „JARVIS Chat“"
echo "  • open \"$INSTALL_DIR/${APP_NAME}.app\""
echo ""
echo "URL (uprav v $CONFIG_FILE):"
python3 -c "import json; print(' ', json.load(open('$CONFIG_FILE'))['url'])"