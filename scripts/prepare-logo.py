"""Prepara o logótipo oficial (IMG_1077.jpeg, fornecido pelo cliente) sem o redesenhar.

Apenas: recorte ao limite do desenho com margem uniforme e normalização do fundo
quase branco (>= 246 em todos os canais) para branco puro, para assentar sem
diferenças de tom sobre superfícies brancas. Letras, símbolo, proporções e cores ficam intactos.
Uso: python3 -I scripts/prepare-logo.py <IMG_1077.jpeg> src/assets/brand/logo-jma.png
"""
import sys
from PIL import Image, ImageChops

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
bg = im.getpixel((5, 5))
mask = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L').point(lambda v: 255 if v > 40 else 0)
x0, y0, x1, y1 = mask.getbbox()
m = round((y1 - y0) * 0.06)
im = im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b = px[x, y]
        if r >= 246 and g >= 246 and b >= 246:
            px[x, y] = (255, 255, 255)
im.save(dst, optimize=True)
print(dst, im.size)
