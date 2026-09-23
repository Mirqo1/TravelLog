"""Regenerate the outlined wordmark (fontTools required; no font bundled in APK).
Usage: python scripts/generate-splash-wordmark.py /path/to/DejaVuSans-Bold.ttf
"""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parent.parent
font = TTFont(sys.argv[1])
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
scale = 32 / font['head'].unitsPerEm
width = sum(glyphs[cmap[ord(c)]].width for c in 'TravelLog') * scale
x = (200 - width) / 2
paths = []
for word, color in [('Travel', '#3B2D1F'), ('Log', '#8A5A19')]:
    pen = SVGPathPen(glyphs, ntos=lambda n: str(round(n, 3)))
    for char in word:
        glyph = glyphs[cmap[ord(char)]]
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x, 49)))
        x += glyph.width * scale
    paths.append((pen.getCommands(), color))
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">\n'
svg += '\n'.join(f'<path fill="{color}" d="{path}"/>' for path, color in paths) + '\n</svg>\n'
xml = '<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="200dp" android:height="80dp" android:viewportWidth="200" android:viewportHeight="80">\n'
xml += '\n'.join(f'  <path android:fillColor="{color}" android:pathData="{path}"/>' for path, color in paths) + '\n</vector>\n'
(root / 'assets/splash-wordmark.svg').write_text(svg)
(root / 'assets/splash-wordmark.xml').write_text(xml)
