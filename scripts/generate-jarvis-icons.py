#!/usr/bin/env python3
"""
Generate JARVIS mobile + desktop app icons (PNG + ICO) for web PWA and PyQt6.
Run: python scripts/generate-jarvis-icons.py
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
DESKTOP_ASSETS = ROOT / "desktop-agent" / "assets"

CYAN = (0, 212, 255)
CYAN_DIM = (0, 122, 153)
CORE = (216, 248, 255)
BG_MOBILE = (17, 17, 17)
BG_DESKTOP = (1, 13, 20)
PANEL = (1, 15, 24)


def _draw_arc_reactor(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float, detailed: bool) -> None:
    rings = [220, 160, 120, 60] if detailed else [200, 130, 70]
    for r in rings:
        rr = int(r * scale)
        alpha = 220 if rr > int(100 * scale) else 255
        width = max(2, int(4 * scale)) if rr > int(90 * scale) else max(3, int(6 * scale))
        color = (*CYAN, alpha)
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=color, width=width)

    inner = int(60 * scale)
    draw.ellipse(
        [cx - inner, cy - inner, cx + inner, cy + inner],
        fill=(*PANEL, 255),
        outline=(*CYAN, 255),
        width=max(3, int(6 * scale)),
    )
    core = int(28 * scale)
    draw.ellipse([cx - core, cy - core, cx + core, cy + core], fill=(*CORE, 255))

    step = 30 if detailed else 45
    ray_inner = int(62 * scale)
    ray_outer = int(120 * scale) if detailed else int(105 * scale)
    for angle in range(0, 360, step):
        rad = math.radians(angle)
        x1 = cx + int(ray_inner * math.cos(rad))
        y1 = cy + int(ray_inner * math.sin(rad))
        x2 = cx + int(ray_outer * math.cos(rad))
        y2 = cy + int(ray_outer * math.sin(rad))
        draw.line([x1, y1, x2, y2], fill=(*CYAN, 190), width=max(2, int(3 * scale)))


def _rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    return mask


def _draw_hud_brackets(draw: ImageDraw.ImageDraw, size: int, inset: int, color: tuple[int, int, int, int]) -> None:
    arm = max(18, size // 14)
    gap = inset
    corners = [
        (gap, gap, gap + arm, gap, gap, gap + arm),
        (size - gap - arm, gap, size - gap, gap, size - gap, gap + arm),
        (gap, size - gap - arm, gap, size - gap, gap + arm, size - gap),
        (size - gap, size - gap - arm, size - gap - arm, size - gap, size - gap, size - gap),
    ]
    w = max(2, size // 128)
    for seg in corners:
        draw.line(seg[:4], fill=color, width=w)
        draw.line(seg[2:], fill=color, width=w)


def _draw_hex_frame(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int, color: tuple[int, int, int, int]) -> None:
    pts = []
    for i in range(6):
        ang = math.radians(60 * i - 30)
        pts.append((cx + int(radius * math.cos(ang)), cy + int(radius * math.sin(ang))))
    draw.polygon(pts, outline=color)


def render_mobile(size: int = 512) -> Image.Image:
    img = Image.new("RGBA", (size, size), (*BG_MOBILE, 255))
    draw = ImageDraw.Draw(img)
    radius = int(size * 0.22)
    mask = _rounded_mask(size, radius)
    panel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(panel)
    pdraw.rounded_rectangle([0, 0, size, size], radius=radius, fill=(*BG_MOBILE, 255))

    # Soft outer glow
    for i in range(12, 0, -1):
        alpha = int(10 + i * 6)
        pad = int(i * (size / 80))
        pdraw.rounded_rectangle(
            [pad, pad, size - pad, size - pad],
            radius=max(8, radius - pad // 2),
            outline=(*CYAN, alpha),
            width=max(1, size // 180),
        )

    _draw_arc_reactor(pdraw, size // 2, size // 2, size / 512, detailed=False)
    img = Image.alpha_composite(img, panel)
    img.putalpha(mask)
    return img


def render_desktop(size: int = 512) -> Image.Image:
    img = Image.new("RGBA", (size, size), (*BG_DESKTOP, 255))
    draw = ImageDraw.Draw(img)
    radius = int(size * 0.14)
    mask = _rounded_mask(size, radius)
    panel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(panel)
    pdraw.rounded_rectangle([0, 0, size, size], radius=radius, fill=(*BG_DESKTOP, 255))
    pdraw.rounded_rectangle(
        [int(size * 0.04), int(size * 0.04), int(size * 0.96), int(size * 0.96)],
        radius=int(radius * 0.85),
        outline=(*CYAN_DIM, 255),
        width=max(2, size // 170),
    )

    _draw_hex_frame(pdraw, size // 2, size // 2, int(size * 0.36), (*CYAN, 120))
    _draw_hud_brackets(pdraw, size, int(size * 0.1), (*CYAN, 210))
    _draw_arc_reactor(pdraw, size // 2, size // 2, size / 512, detailed=True)

    # Scan line accent
    for y in range(0, size, max(6, size // 48)):
        pdraw.line([int(size * 0.12), y, int(size * 0.88), y], fill=(0, 212, 255, 8), width=1)

    img = Image.alpha_composite(img, panel)
    img.putalpha(mask)
    return img


def save_png(img: Image.Image, path: Path, size: int | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = img.resize((size, size), Image.Resampling.LANCZOS) if size else img
    if out.mode != "RGBA":
        out = out.convert("RGBA")
    out.save(path, "PNG")
    print(f"✅ {path.relative_to(ROOT)} ({out.size[0]}x{out.size[1]})")


def save_ico(mobile: Image.Image, path: Path) -> None:
    sizes = [16, 32, 48]
    images = [mobile.resize((s, s), Image.Resampling.LANCZOS).convert("RGBA") for s in sizes]
    path.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:],
    )
    print(f"✅ {path.relative_to(ROOT)} (multi-size ICO)")


def write_svg_mobile(path: Path) -> None:
    path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#111111"/>
  <circle cx="256" cy="256" r="180" stroke="#00d4ff" stroke-width="6" opacity="0.35"/>
  <circle cx="256" cy="256" r="130" stroke="#00d4ff" stroke-width="4"/>
  <circle cx="256" cy="256" r="70" fill="#010f18" stroke="#00d4ff" stroke-width="8"/>
  <circle cx="256" cy="256" r="28" fill="#d8f8ff"/>
  <g stroke="#00d4ff" stroke-width="4" opacity="0.75">
    <line x1="256" y1="186" x2="256" y2="146"/><line x1="256" y1="326" x2="256" y2="366"/>
    <line x1="186" y1="256" x2="146" y2="256"/><line x1="326" y1="256" x2="366" y2="256"/>
    <line x1="206" y1="206" x2="176" y2="176"/><line x1="306" y1="306" x2="336" y2="336"/>
    <line x1="306" y1="206" x2="336" y2="176"/><line x1="206" y1="306" x2="176" y2="336"/>
  </g>
</svg>
""",
        encoding="utf-8",
    )
    print(f"✅ {path.relative_to(ROOT)} (svg)")


def write_svg_desktop(path: Path) -> None:
    path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="72" fill="#010d14"/>
  <rect x="20" y="20" width="472" height="472" rx="60" stroke="#007a99" stroke-width="3"/>
  <polygon points="256,88 394,168 394,344 256,424 118,344 118,168" stroke="#00d4ff" stroke-width="2" opacity="0.45" fill="none"/>
  <circle cx="256" cy="256" r="160" stroke="#00d4ff" stroke-width="5" opacity="0.5"/>
  <circle cx="256" cy="256" r="120" stroke="#00d4ff" stroke-width="3"/>
  <circle cx="256" cy="256" r="60" fill="#010f18" stroke="#00d4ff" stroke-width="7"/>
  <circle cx="256" cy="256" r="28" fill="#d8f8ff"/>
  <g stroke="#00d4ff" stroke-width="3" opacity="0.8">
    <line x1="256" y1="196" x2="256" y2="136"/><line x1="256" y1="316" x2="256" y2="376"/>
    <line x1="196" y1="256" x2="136" y2="256"/><line x1="316" y1="256" x2="376" y2="256"/>
    <line x1="214" y1="214" x2="168" y2="168"/><line x1="298" y1="298" x2="344" y2="344"/>
    <line x1="298" y1="214" x2="344" y2="168"/><line x1="214" y1="298" x2="168" y2="344"/>
  </g>
  <path d="M52 52 H88 V88" stroke="#00d4ff" stroke-width="4"/><path d="M460 52 H424 V88" stroke="#00d4ff" stroke-width="4"/>
  <path d="M52 460 H88 V424" stroke="#00d4ff" stroke-width="4"/><path d="M460 460 H424 V424" stroke="#00d4ff" stroke-width="4"/>
</svg>
""",
        encoding="utf-8",
    )
    print(f"✅ {path.relative_to(ROOT)} (svg)")


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    DESKTOP_ASSETS.mkdir(parents=True, exist_ok=True)

    write_svg_mobile(ICONS / "jarvis-mobile.svg")
    write_svg_desktop(ICONS / "jarvis-desktop.svg")

    mobile_master = render_mobile(512)
    desktop_master = render_desktop(512)

    # Masters in public/icons
    save_png(mobile_master, ICONS / "jarvis-mobile-512.png")
    save_png(desktop_master, ICONS / "jarvis-desktop-512.png")

    # Web / PWA — mobile variant
    save_png(mobile_master, PUBLIC / "apple-touch-icon.png", 180)
    save_png(mobile_master, PUBLIC / "android-chrome-192x192.png", 192)
    save_png(mobile_master, PUBLIC / "android-chrome-512x512.png", 512)
    save_png(mobile_master, PUBLIC / "favicon-16x16.png", 16)
    save_png(mobile_master, PUBLIC / "favicon-32x32.png", 32)
    save_png(mobile_master, ICONS / "jarvis-mobile-180.png", 180)
    save_ico(mobile_master, PUBLIC / "favicon.ico")

    # Desktop agent assets
    save_png(desktop_master, DESKTOP_ASSETS / "jarvis-desktop-icon.png", 512)
    save_png(desktop_master, DESKTOP_ASSETS / "jarvis-desktop-icon-256.png", 256)
    save_png(desktop_master, DESKTOP_ASSETS / "face.png", 512)  # HUD avatar in PyQt6

    print("\n🎯 JARVIS icons ready — mobile (PWA) + desktop (PyQt6/macOS)")


if __name__ == "__main__":
    main()