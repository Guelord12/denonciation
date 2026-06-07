from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs(os.path.dirname(__file__) + '/../assets', exist_ok=True)
ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))

# Simple gradient background
def gradient_bg(size, color1=(239,68,68), color2=(185,28,28)):
    img = Image.new('RGB', size, color1)
    draw = ImageDraw.Draw(img)
    for y in range(size[1]):
        ratio = y / (size[1] - 1)
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, y), (size[0], y)], fill=(r, g, b))
    return img

# Draw centered letter D
def draw_letter(img, letter='D'):
    draw = ImageDraw.Draw(img)
    w, h = img.size
    # Try to use a default bold font; fallback to a simple pillow default
    try:
        font = ImageFont.truetype('arialbd.ttf', int(w * 0.55))
    except Exception:
        font = ImageFont.load_default()
    try:
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
    except Exception:
        # Fallback for older/newer pillow APIs
        try:
            tw, th = font.getsize(letter)
        except Exception:
            tw, th = (int(w * 0.5), int(h * 0.5))

    draw.text(((w - tw) / 2, (h - th) / 2 - th*0.05), letter, font=font, fill=(255,255,255))
    return img

# Sizes
sizes = {
    'icon.png': (1024, 1024),
    'adaptive-icon.png': (512, 512),
    'favicon.png': (48, 48),
    'splash.png': (1242, 2436)
}

for name, size in sizes.items():
    img = gradient_bg(size)
    img = draw_letter(img, 'D')
    out = os.path.join(ASSETS_DIR, name)
    img.save(out, format='PNG')
    print('Wrote', out)

print('Done')
