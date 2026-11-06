"""Превью (обложка) 1280x720 для YouTube."""
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import render as R

OUT = sys.argv[1]
tl = json.load(open(f"{OUT}/timeline.json"))["sections"]
sec = next(s for s in tl if s["visual"] == "iron")
sc = R.SCENES["iron"](sec, 60)
sc.keys = [(0, 520, 560, 470)]          # планета слева, крупно
fr = sc.draw(12, 0.3)
# вторая планета — синяя «стеклянная», маленькая справа сверху
g = R.SCENES["glass"](dict(sec, id="g"), 60)
R.render_planet(fr, 1660, 190, 120, g.tex, 0.5, g.light, None, ((.35, .6, 1.0), 14, 1.0))
img = Image.fromarray((np.clip(fr, 0, 1) * 255).astype(np.uint8))

# затемнение справа под текст
grad = Image.linear_gradient("L").rotate(90).resize((1920, 1080))
img = Image.composite(img, Image.new("RGB", img.size, (0, 0, 0)), grad.point(lambda v: 255 - int(v * 0.55)))
d = ImageDraw.Draw(img)
B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def text(xy, s, size, fill, stroke=10):
    f = ImageFont.truetype(B, size)
    d.text(xy, s, font=f, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0))

text((1010, 300), "ДОЖДЬ", 150, (255, 255, 255))
text((1010, 470), "ИЗ ЖЕЛЕЗА", 120, (255, 170, 40))
text((1010, 640), "и ещё 9 самых", 72, (255, 255, 255), 7)
text((1010, 730), "странных мест", 72, (255, 255, 255), 7)
text((1010, 820), "во Вселенной", 72, (120, 200, 255), 7)
# крупная цифра
f = ImageFont.truetype(B, 260)
d.text((60, 40), "10", font=f, fill=(255, 220, 60), stroke_width=14, stroke_fill=(0, 0, 0))
img.resize((1280, 720), Image.LANCZOS).save(f"{OUT}/thumbnail.jpg", quality=92)
print("ok")
