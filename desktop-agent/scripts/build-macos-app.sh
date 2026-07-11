#!/usr/bin/env bash
# Builds JARVIS.app — double-click launcher for macOS (Dock / Applications / Spotlight).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="JARVIS"
APP_BUNDLE="$ROOT/${APP_NAME}.app"
ICON_PNG="$ROOT/assets/jarvis-desktop-icon.png"
ICONSET_DIR="$ROOT/build/AppIcon.iconset"
ICNS_PATH="$ROOT/build/AppIcon.icns"
INSTALL_DIR="${JARVIS_APP_INSTALL_DIR:-$HOME/Applications}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "❌ JARVIS.app build is macOS only."
  exit 1
fi

if [[ ! -f "$ICON_PNG" ]]; then
  echo "⚠️  Missing $ICON_PNG — generating icons first..."
  if [[ -x "$ROOT/.venv/bin/python" ]]; then
    "$ROOT/.venv/bin/python" "$ROOT/../scripts/generate-jarvis-icons.py"
  else
    echo "❌ Run pnpm desktop:setup first."
    exit 1
  fi
fi

mkdir -p "$ROOT/build" "$ICONSET_DIR"
rm -rf "$APP_BUNDLE"

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
  <string>jarvis</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.pandorabox.jarvis.desktop</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>JARVIS</string>
  <key>CFBundleDisplayName</key>
  <string>JARVIS Voice</string>
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
  <key>LSUIElement</key>
  <false/>
</dict>
</plist>
PLIST

cat > "$APP_BUNDLE/Contents/MacOS/jarvis" <<LAUNCHER
#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$ROOT"
PY="\$AGENT_DIR/.venv/bin/python"
MAIN="\$AGENT_DIR/main.py"

if [[ ! -x "\$PY" ]]; then
  osascript -e 'display alert "JARVIS: chýba setup" message "V termináli spusti:\ncd $ROOT/..\npnpm desktop:setup" as critical' || true
  exit 1
fi

cd "\$AGENT_DIR"
exec "\$PY" "\$MAIN"
LAUNCHER

chmod +x "$APP_BUNDLE/Contents/MacOS/jarvis"

mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/${APP_NAME}.app"
cp -R "$APP_BUNDLE" "$INSTALL_DIR/"

echo "✅ Built: $APP_BUNDLE"
echo "✅ Installed: $INSTALL_DIR/${APP_NAME}.app"
echo ""
echo "Spustenie:"
echo "  • Spotlight → „JARVIS“"
echo "  • Finder → Applications → JARVIS"
echo "  • alebo: open \"$INSTALL_DIR/${APP_NAME}.app\""