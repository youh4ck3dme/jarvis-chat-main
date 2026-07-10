"""
Generates a beautiful futuristic high-tech JARVIS Arc Reactor PNG image
using PIL/Pillow for the PyQt6 UI.
"""
from PIL import Image, ImageDraw

def generate_avatar(output_path: str):
    # Create a 512x512 image with black background
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    center = size // 2
    
    # Draw futuristic glow circles
    for r in range(220, 0, -2):
        alpha = int((220 - r) * 0.4)
        draw.ellipse(
            [center - r, center - r, center + r, center + r],
            outline=(0, 212, 255, alpha),
            width=2
        )

    # Core high-tech rings
    draw.ellipse([center - 160, center - 160, center + 160, center + 160], outline=(0, 212, 255, 200), width=4)
    draw.ellipse([center - 120, center - 120, center + 120, center + 120], outline=(0, 212, 255, 255), width=2)
    draw.ellipse([center - 60, center - 60, center + 60, center + 60], fill=(0, 31, 46, 255), outline=(0, 212, 255, 255), width=6)

    # Inner bright core
    draw.ellipse([center - 30, center - 30, center + 30, center + 30], fill=(216, 248, 255, 255))

    # Triangular/sector marks of an arc reactor
    import math
    for angle in range(0, 360, 30):
        rad = math.radians(angle)
        # Draw rays from inner ring to outer ring
        x1 = center + int(60 * math.cos(rad))
        y1 = center + int(60 * math.sin(rad))
        x2 = center + int(120 * math.cos(rad))
        y2 = center + int(120 * math.sin(rad))
        draw.line([x1, y1, x2, y2], fill=(0, 212, 255, 180), width=3)

    # Save image
    img.save(output_path, "PNG")
    print(f"✅ Generated premium HUD avatar at {output_path}")

if __name__ == "__main__":
    generate_avatar("/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main/desktop-agent/assets/face.png")
