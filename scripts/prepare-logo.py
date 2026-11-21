"""Variantes digitais do logótipo oficial JMA, a partir de IMG_1077.jpeg (fornecido pelo cliente).

O símbolo usa letras em negativo: J, M e «&a» são o branco da página visto através do bloco bordô.
Por isso:
  • dentro do retângulo do bloco bordô, tudo fica opaco e intacto (bordô + letras brancas);
  • fora dele (cauda do «a», denominação e inscrição), o branco exterior é removido com
    «cor para alfa» e desmultiplicação, o que preserva o antialiasing sem halos brancos.
Nenhuma letra é redesenhada.

Variantes:
  jma-official-transparent.png  cores oficiais, fundo transparente (fundos claros)
  jma-official-inverse.png      igual, mas a denominação passa de preto a branco e a inscrição
                                bordô passa a marfim, para leitura sobre fotografia ou fundo escuro;
                                o símbolo (bloco, letras e cauda) mantém-se inalterado.
Uso: python3 -I scripts/prepare-logo.py src/assets/brand/source/IMG_1077.jpeg src/assets/brand
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

src, out = sys.argv[1], Path(sys.argv[2])
rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
H, W, _ = rgb.shape

# Retângulo do bloco bordô (medido no original 2129×1193).
BX0, BX1, BY0, BY1 = 240, 1852, 219, 742
# Linhas da inscrição bordô «SOCIEDADE DE ADVOGADOS, RL».
TAG_Y0 = 910

# 1) Cor para alfa em relação ao branco (GIMP «color to alpha»).
white = 255.0
alpha = np.clip(np.max((white - rgb) / white, axis=2), 0, 1)
with np.errstate(divide='ignore', invalid='ignore'):
    col = (rgb - white * (1 - alpha[..., None])) / alpha[..., None]
col = np.nan_to_num(np.clip(col, 0, 255))
# Ruído JPEG quase branco no fundo exterior: elimina opacidades residuais (evita uma «caixa» ténue em fundo escuro).
alpha = np.where(alpha < 0.08, 0.0, (alpha - 0.08) / 0.92)
# Tinta sólida (núcleo das letras): opacidade total com a cor original.
solid = alpha > 0.80
alpha = np.where(solid, 1.0, alpha / 0.80)
col = np.where(solid[..., None], rgb, col)

# 2) O bloco bordô fica integralmente opaco e com as cores originais.
alpha[BY0:BY1 + 1, BX0:BX1 + 1] = 1.0
col[BY0:BY1 + 1, BX0:BX1 + 1] = rgb[BY0:BY1 + 1, BX0:BX1 + 1]

# 3) Recorte ao conteúdo, com margem uniforme.
ys, xs = np.where(alpha > 0.02)
m = 24
y0, y1, x0, x1 = max(0, ys.min() - m), min(H, ys.max() + 1 + m), max(0, xs.min() - m), min(W, xs.max() + 1 + m)


def save(name, colour):
    rgba = np.dstack([colour, alpha * 255.0])[y0:y1, x0:x1]
    rgba = np.round(rgba).astype(np.uint8)
    # Píxeis totalmente transparentes sem cor residual.
    rgba[rgba[..., 3] == 0, :3] = 0
    Image.fromarray(rgba, 'RGBA').save(out / name, optimize=True)
    print(out / name, (x1 - x0, y1 - y0))


save('jma-official-transparent.png', col)

# Variante inversa: só os elementos fora do bloco mudam de cor (a forma e o alfa ficam iguais).
inv = col.copy()
outside = np.ones((H, W), bool)
outside[BY0:BY1 + 1, BX0:BX1 + 1] = False
# Classificação pela linha de texto (e não pela cor), para que os píxeis de borda
# recebam a mesma cor do traço e o antialiasing fique só no canal alfa, sem contornos escuros.
rows = np.arange(H)[:, None]
black_text = outside & (rows > BY1 + 10) & (rows < TAG_Y0)
tagline = outside & (rows >= TAG_Y0)
inv[black_text] = (255, 255, 255)
inv[tagline] = (241, 229, 226)
save('jma-official-inverse.png', inv)
