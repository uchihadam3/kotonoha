#!/usr/bin/env python3
"""Builds data-src/wordbase.json: the JLPT lists (N5..N1) joined with JMdict (POS, glosses, frequency),
plus extra frequent JMdict words so the full game has well over 10 000 entries.
Inputs live in data-src/raw (downloaded, not committed)."""
import csv, json, re, gzip, os, sys, collections
import xml.etree.ElementTree as ET

RAW = 'data-src/raw'
# --- JMdict entity map (description -> code) from the DTD header
head = open(f'{RAW}/JMdict_e', encoding='utf-8').read(400000)
ent = {v: k for k, v in re.findall(r'<!ENTITY ([\w\-]+) "([^"]*)">', head)}

def code(desc):
    return ent.get(desc, desc)

entries = []
for ev, el in ET.iterparse(f'{RAW}/JMdict_e', events=('end',)):
    if el.tag != 'entry':
        continue
    kebs = [(k.findtext('keb'), [p.text for p in k.findall('ke_pri')], [code(i.text) for i in k.findall('ke_inf')]) for k in el.findall('k_ele')]
    rebs = []
    for r in el.findall('r_ele'):
        rebs.append((r.findtext('reb'), [p.text for p in r.findall('re_pri')], [s.text for s in r.findall('re_restr')], r.find('re_nokanji') is not None))
    senses = []
    lastpos = []
    for s in el.findall('sense'):
        pos = [code(p.text) for p in s.findall('pos')] or lastpos
        lastpos = pos
        misc = [code(m.text) for m in s.findall('misc')]
        gl = [g.text for g in s.findall('gloss') if g.text]
        stagr = [x.text for x in s.findall('stagr')]
        stagk = [x.text for x in s.findall('stagk')]
        senses.append({'pos': pos, 'misc': misc, 'gl': gl, 'stagr': stagr, 'stagk': stagk})
    entries.append({'seq': el.findtext('ent_seq'), 'k': kebs, 'r': rebs, 's': senses})
    el.clear()
print('JMdict entries', len(entries), file=sys.stderr)

byform = collections.defaultdict(list)
for i, e in enumerate(entries):
    for k in e['k']:
        byform[k[0]].append(i)
    for r in e['r']:
        byform[r[0]].append(i)

def freq(e):
    best = 99
    common = False
    for _, pri, *_ in e['k'] + e['r']:
        for p in pri:
            if p.startswith('nf'):
                best = min(best, int(p[2:]))
            if p in ('news1', 'ichi1', 'spec1', 'spec2', 'gai1'):
                common = True
    return best, common

POSMAP = {
    'n': 'n', 'n-adv': 'n', 'n-t': 'n', 'n-pr': 'pn', 'n-suf': 'suf', 'n-pref': 'pref', 'suf': 'suf', 'pref': 'pref',
    'adj-i': 'adj-i', 'adj-ix': 'adj-ix', 'adj-na': 'adj-na', 'adj-no': 'adj-no', 'adj-pn': 'adj-pn', 'adj-t': 'adj-na', 'adj-f': 'adj-pn',
    'adv': 'adv', 'adv-to': 'adv', 'aux': 'aux', 'aux-v': 'aux', 'aux-adj': 'aux', 'conj': 'conj', 'cop': 'cop', 'ctr': 'ctr',
    'exp': 'exp', 'int': 'int', 'num': 'num', 'pn': 'pron', 'prt': 'prt', 'unc': 'n',
    'v1': 'v1', 'v1-s': 'v1', 'v5aru': 'v5aru', 'v5b': 'v5b', 'v5g': 'v5g', 'v5k': 'v5k', 'v5k-s': 'v5k-s', 'v5m': 'v5m', 'v5n': 'v5n',
    'v5r': 'v5r', 'v5r-i': 'v5r-i', 'v5s': 'v5s', 'v5t': 'v5t', 'v5u': 'v5u', 'v5u-s': 'v5u', 'vk': 'vk', 'vs-i': 'vs-i', 'vs-s': 'vs-i', 'vz': 'vs-i',
}

def pick_pos(pos):
    p = [x for x in pos if x in POSMAP]
    if not p:
        return 'n'
    verbs = [x for x in p if x.startswith('v') and x not in ('vs', 'vi', 'vt')]
    if verbs:
        return POSMAP[verbs[0]]
    if p[0] in ('n', 'n-adv', 'n-t', 'unc'):
        if 'adj-na' in p and p.index('adj-na') == 1 and 'adj-no' not in p:
            return 'n'
        return 'vs' if 'vs' in pos else 'n'
    for pref in ('adj-i', 'adj-ix', 'adj-na', 'adj-pn', 'adv', 'exp', 'int', 'conj', 'prt', 'pn', 'ctr', 'num', 'suf', 'pref', 'cop', 'aux', 'adj-no'):
        if pref in p:
            return POSMAP[pref]
    return POSMAP[p[0]]

def kata2hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

def lookup(forms, readings):
    cands = []
    for f in forms:
        cands += byform.get(f, [])
    best = None
    for i in dict.fromkeys(cands):
        e = entries[i]
        rset = {r[0] for r in e['r']}
        kset = {k[0] for k in e['k']}
        score = 0
        if any(r in rset for r in readings):
            score += 10
        if any(f in kset for f in forms):
            score += 5
        if any(f in rset for f in forms):
            score += 3
        fq, common = freq(e)
        score += (2 if common else 0) - fq / 100
        kana_form = all(not ('\u4e00' <= ch <= '\u9fff') for f in forms for ch in f)
        if kana_form:
            if not e['k'] or any('uk' in s['misc'] for s in e['s'][:2]):
                score += 4
            if any(r[0] in forms and r[1] for r in e['r']):
                score += 2
        if best is None or score > best[0]:
            best = (score, i)
    return entries[best[1]] if best and best[0] >= 10 else None

out = []
seen = set()
missing = 0
for n in [5, 4, 3, 2, 1]:
    with open(f'{RAW}/jlpt-n{n}.csv', newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            forms = [x.strip().lstrip('～~').rstrip('～~') for x in row['expression'].split(';') if x.strip()]
            reads = [x.strip().lstrip('～~').rstrip('～~') for x in row['reading'].split(';') if x.strip()]
            if not forms or not reads:
                continue
            affix = row['expression'].strip().startswith(('～', '~')) or row['expression'].strip().endswith(('～', '~'))
            w, r = forms[0], reads[0]
            if (w, r) in seen:
                continue
            seen.add((w, r))
            e = lookup(forms, reads + [kata2hira(x) for x in reads])
            pos, en, uk, fq = None, row['meaning'], False, 99
            if e:
                # sense restricted to this reading/form
                ss = [s for s in e['s'] if (not s['stagr'] or r in s['stagr']) and (not s['stagk'] or w in s['stagk'])] or e['s']
                pos = pick_pos(ss[0]['pos'])
                uk = 'uk' in ss[0]['misc']
                fq, _ = freq(e)
                glosses = []
                for s in ss[:3]:
                    glosses.append(', '.join(s['gl'][:3]))
                en = '; '.join(glosses)
            else:
                missing += 1
            if affix and pos in (None, 'n'):
                pos = 'suf' if row['expression'].strip().startswith(('～', '~')) else 'pref'
            out.append({'w': w, 'alt': forms[1:] or None, 'r': r, 'n': n, 'pos': pos or 'n', 'en': en, 'uk': uk or None, 'nf': fq, 'src': 'jlpt'})
print('JLPT rows kept', len(out), 'without JMdict match', missing, file=sys.stderr)

# --- extra frequent words (not in JLPT lists) to go beyond 10 000
have_w = {o['w'] for o in out} | {a for o in out for a in (o['alt'] or [])}
extra = []
for e in entries:
    fq, common = freq(e)
    if fq > 30 and not common:
        continue
    s0 = e['s'][0]
    if any(p in ('n-pr',) for p in s0['pos']) or any(m in ('arch', 'obs', 'rare', 'derog', 'vulg', 'X', 'sens') for m in s0['misc']):
        continue
    kebs = [k for k in e['k'] if not set(k[2]) & {'iK', 'oK', 'rK', 'sK', 'ateji'}]
    if e['k'] and not kebs:
        continue
    if 'uk' in s0['misc'] or not kebs:
        w = e['r'][0][0]
    else:
        w = kebs[0][0]
    r = e['r'][0][0]
    if w in have_w or len(w) > 8:
        continue
    if re.search(r'[A-Za-zＡ-Ｚａ-ｚ0-9０-９]', w):
        continue
    extra.append({'w': w, 'alt': None, 'r': r, 'n': 1, 'pos': pick_pos(s0['pos']), 'en': '; '.join(', '.join(s['gl'][:3]) for s in e['s'][:3]), 'uk': ('uk' in s0['misc']) or None, 'nf': fq, 'src': 'freq'})
    have_w.add(w)
extra.sort(key=lambda o: (o['nf'] if o['nf'] < 99 else 33))
print('extra candidates', len(extra), file=sys.stderr)
json.dump({'jlpt': out, 'extra': extra[:6500]}, open('data-src/wordbase.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
c = collections.Counter(o['pos'] for o in out)
print(c.most_common(), file=sys.stderr)
