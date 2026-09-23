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

# Android's masked splash icon: both compass and lettering fit inside the central
# 192 px circle of the 288 px viewport. The combined mark is centered as one unit.
import xml.etree.ElementTree as ET
ns = '{http://schemas.android.com/apk/res/android}'
compass = [
 ('#3B2D1F', 'M194,126 A50,50 0,1 1,94,126 A50,50 0,1 1,194,126'),
 ('#D6A540', 'M185.15,126 A41.15,41.15 0,1 1,102.85,126 A41.15,41.15 0,1 1,185.15,126'),
 ('#3B2D1F', 'M182.45,126 A38.45,38.45 0,1 1,105.55,126 A38.45,38.45 0,1 1,182.45,126'),
 ('#F6F0E4', 'M164.77,100.62 L151.5,133.31 L123.23,151.38 L136.5,118.69 Z'),
 ('#D6A540', 'M164.77,100.62 L151.5,133.31 L136.5,118.69 Z'),
 ('#3B2D1F', 'M147.85,126 A3.85,3.85 0,1 1,140.15,126 A3.85,3.85 0,1 1,147.85,126'),
]
scale = 135 / (width / (32 / font['head'].unitsPerEm))
x = (288 - 135) / 2
combined = list(compass)
for word, color in [('Travel', '#3B2D1F'), ('Log', '#8A5A19')]:
    pen = SVGPathPen(glyphs, ntos=lambda n: str(round(n, 3)))
    for char in word:
        glyph = glyphs[cmap[ord(char)]]
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x, 210)))
        x += glyph.width * scale
    combined.append((color, pen.getCommands()))
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288">\n'
svg += '\n'.join(f'<path fill="{color}" d="{path}"/>' for color, path in combined) + '\n</svg>\n'
xml = '<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="288dp" android:height="288dp" android:viewportWidth="288" android:viewportHeight="288">\n'
xml += '\n'.join(f'<path android:fillColor="{color}" android:pathData="{path}"/>' for color, path in combined) + '\n</vector>\n'
(root / 'assets/splash-centered.svg').write_text(svg)
(root / 'assets/splash-centered.xml').write_text(xml)
