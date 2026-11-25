#!/usr/bin/env python3
"""Subsets the Japanese fonts to the characters the game actually uses (UI, story, data, all jōyō kanji)
and writes small WOFF2 files to src/assets/fonts. Run after the data changes: `npm run fonts`."""
import glob, json, os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = 'data-src/fonts-src'
OUT = 'src/assets/fonts'
os.makedirs(OUT, exist_ok=True)

def chars_in_files(patterns):
    s = set()
    for pat in patterns:
        for f in glob.glob(pat, recursive=True):
            try:
                s |= set(open(f, encoding='utf-8').read())
            except Exception:
                pass
    return s

base = set(chr(c) for c in range(0x20, 0x7f)) | set(chr(c) for c in range(0xa0, 0x180))
base |= set('“”‘’—–…•·×÷→←↑↓★☆♪♫〜～「」『』（）【】〈〉《》、。・ー！？：；・〃々〆〇ゝゞヽヾ　①②③④⑤⑥⑦⑧⑨⑩')
kana = set(chr(c) for c in range(0x3041, 0x3097)) | set(chr(c) for c in range(0x30a1, 0x30fb)) | set('ゝゞヽヾーゔヴ')
joyo = set()
kd = 'data-src/raw/kanji-data.json'
if os.path.exists(kd):
    for k, v in json.load(open(kd, encoding='utf-8')).items():
        if v.get('grade') is not None and v['grade'] <= 8:
            joyo.add(k)
code = chars_in_files(['src/**/*.ts', 'src/**/*.css', 'index.html'])
data = chars_in_files(['src/data/**/*.json', 'data-src/vocab/*.json'])
story = chars_in_files(['src/data/story*.ts', 'src/data/regions.ts', 'src/ui/logo.ts', 'src/game/cutscene*.ts'])

def keep(s):
    return {c for c in s if ord(c) >= 0x20 and not (0xd800 <= ord(c) <= 0xdfff)}

sets = {
    # family file, source ttf, character set
    'kt-ui-400': ('ZenMaruGothic-Regular.ttf', keep(base | kana | joyo | code | data)),
    'kt-ui-700': ('ZenMaruGothic-Bold.ttf', keep(base | kana | code)),
    'kt-learn-600': ('KleeOne-SemiBold.ttf', keep(base | kana | joyo | data | code)),
    'kt-brush': ('YujiSyuku-Regular.ttf', keep(base | kana | story | set('言の葉万語霊樹花月風雪桜夢心光影道'))),
    'kt-mincho': ('ShipporiMinchoB1-Bold.ttf', keep(base | kana | story | code)),
}
total = 0
for name, (ttf, chars) in sets.items():
    path = os.path.join(SRC, ttf)
    if not os.path.exists(path):
        print('missing', path)
        continue
    font = TTFont(path)
    cmap = font.getBestCmap()
    have = [c for c in chars if ord(c) in cmap]
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'palt', 'vert', 'liga', 'calt']
    opts.name_IDs = ['*']
    opts.hinting = False
    opts.desubroutinize = True
    sub = subset.Subsetter(options=opts)
    sub.populate(unicodes=[ord(c) for c in have])
    sub.subset(font)
    out = os.path.join(OUT, f'{name}.woff2')
    font.flavor = 'woff2'
    font.save(out)
    size = os.path.getsize(out)
    total += size
    print(f'{name}: {len(have)} chars, {size/1024:.0f} KB')
print(f'total {total/1024/1024:.2f} MB')
