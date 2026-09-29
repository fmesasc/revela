#!/usr/bin/env python3
"""Index of NASA's free 3D models (github.com/nasa/NASA-3D-Resources, "free and
without copyright"; NASA's media usage guidelines apply) for the 3D search.

    tools/nasa3d.py

Reads the repository's file list (GitHub API), takes every .glb with the
preview picture next to it, makes a small WebP thumbnail of each preview
(theirs weigh ~0.7 MB) into assets/nasa3d/ and writes
src/features/content/nasa3d.js. Run it again to pick up new models.
"""
import io, json, os, re, subprocess, sys, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/'
OUT_JS = os.path.join(ROOT, 'src/features/content/nasa3d.js')
OUT_IMG = os.path.join(ROOT, 'assets/nasa3d')

tree = json.loads(subprocess.run(['gh', 'api', 'repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1'], capture_output=True, text=True, check=True).stdout)
files = [t for t in tree['tree'] if t['type'] == 'blob']
by_dir = {}
for f in files: by_dir.setdefault(os.path.dirname(f['path']), []).append(f)
os.makedirs(OUT_IMG, exist_ok=True)
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
items, seen = [], set()
for g in sorted((f for f in files if f['path'].lower().endswith('.glb')), key=lambda f: f['path']):
    folder = os.path.dirname(g['path'])
    name = os.path.splitext(os.path.basename(g['path']))[0].strip()
    pics = sorted((f for f in by_dir[folder] if f['path'].lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))), key=lambda f: f['size'])
    s = slug(name)
    while s in seen: s += '-2'
    seen.add(s)
    thumb = f'assets/nasa3d/{s}.webp'
    if pics and not os.path.exists(os.path.join(ROOT, thumb)):
        try:
            data = urllib.request.urlopen(urllib.request.Request(RAW + urllib.parse.quote(pics[0]['path']), headers={'User-Agent': 'revela-tools'}), timeout=60).read()
            im = Image.open(io.BytesIO(data)).convert('RGBA'); im.thumbnail((200, 200))
            im.save(os.path.join(ROOT, thumb), 'WEBP', quality=78)
        except Exception as e:
            print('sin miniatura:', name, e, file=sys.stderr); thumb = ''
    elif not pics: thumb = ''
    kind = 'print' if g['path'].startswith('3D Printing/') else 'model'
    items.append({'id': s, 'name': name, 'src': RAW + urllib.parse.quote(g['path']), 'size': g['size'], 'thumb': thumb, 'kind': kind})
    print(len(items), name, file=sys.stderr)

with open(OUT_JS, 'w') as f:
    f.write('// NASA 3D Resources (github.com/nasa/NASA-3D-Resources): free and without copyright,\n'
            "// following NASA's media usage guidelines (no NASA logos implying endorsement).\n"
            '// Made by tools/nasa3d.py; thumbnails are ours, from their previews.\n'
            'export const NASA_3D = [\n' + ''.join('  ' + json.dumps(i, ensure_ascii=False) + ',\n' for i in items) + '];\n')
print(len(items), 'modelos')
