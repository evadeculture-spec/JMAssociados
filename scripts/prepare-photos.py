"""Prepara as fotografias do escritório a partir dos originais publicados no site atual.

Origem: static.wixstatic.com/media/16bb1d_<id> (ficheiros sem a sobreposição de cor do Wix).
Correção suave: reduz a dominante amarela/laranja (equilíbrio parcial por "mundo cinzento"),
mantendo o calor natural da madeira; recupera ligeiramente as altas luzes (iluminação do teto);
ajuste discreto de luminosidade, contraste e saturação. Sem retoque do espaço.
Gera também o recorte alternativo da biblioteca (equivalente ao enquadramento de IMG_1078).
Uso: python3 -I scripts/prepare-photos.py <pasta-com-originais> src/assets/photos
"""
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageStat

PHOTOS = {
    # id original                              : (destino, força do equilíbrio, brilho, contraste, saturação, joelho das altas luzes)
    '80f37da900514c05ab39eff5f9447311.jpg': ('sala-de-reunioes.jpg', 0.30, 1.03, 1.02, 0.84, 188),
    'cf25150661ff4b4f9b4ec6857b67bab8.jpg': ('biblioteca.jpg', 0.45, 1.05, 1.05, 0.95, 236),
}
MAX_W = 2800


def balance(img, strength):
    stat = ImageStat.Stat(img)
    means = stat.mean[:3]
    grey = sum(means) / 3
    factors = [(grey / m) ** strength for m in means]
    channels = [c.point(lambda v, f=f: max(0, min(255, round(v * f)))) for c, f in zip(img.split()[:3], factors)]
    return Image.merge('RGB', channels), factors


def main(src, dst):
    dst = Path(dst)
    dst.mkdir(parents=True, exist_ok=True)
    for name, (out, strength, bright, contrast, sat, knee) in PHOTOS.items():
        img = Image.open(Path(src) / name).convert('RGB')
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        img, factors = balance(img, strength)
        img = ImageEnhance.Brightness(img).enhance(bright)
        img = ImageEnhance.Contrast(img).enhance(contrast)
        img = ImageEnhance.Color(img).enhance(sat)
        # Compressão suave acima do joelho: devolve detalhe às zonas muito iluminadas.
        img = img.point(lambda v, k=knee: v if v <= k else round(k + (v - k) * 0.62))
        img.save(dst / out, quality=90, optimize=True, progressive=True)
        print(out, img.size, [round(f, 3) for f in factors])
        if out == 'biblioteca.jpg':
            cw = int(img.width * 0.86)
            ch = int(cw / 2.59)
            y = int((img.height - ch) * 0.42)
            img.crop((0, y, cw, y + ch)).save(dst / 'biblioteca-recorte.jpg', quality=90, optimize=True, progressive=True)
            print('biblioteca-recorte.jpg', (cw, ch))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
