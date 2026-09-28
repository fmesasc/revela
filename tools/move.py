#!/usr/bin/env python3
"""Move source files and rewrite every import that points at them.

Usage: python3 tools/move.py old/path.js=new/path.js [...]
Relative imports (static `from '…'` and dynamic `import('…')`) in all JS files
under src/ and tests/ are recomputed; absolute references ('/src/…', 'src/…')
in HTML, the service worker, tests and docs are replaced textually.
Uses `git mv` so history follows the files.
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
moves = dict(a.split('=', 1) for a in sys.argv[1:])
IMPORT = re.compile(r"""((?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)['"])(\.{1,2}/[^'"]+)(['"])""")

def js_files():
    for base in ('src', 'tests'):
        for d, _, fs in os.walk(base):
            for f in fs:
                if f.endswith('.js'): yield os.path.normpath(os.path.join(d, f))

# 1) rewrite relative imports, knowing where each file will end up
contents = {f: open(f).read() for f in js_files()}
for f, s in contents.items():
    new_f = moves.get(f, f)
    def fix(m):
        target = os.path.normpath(os.path.join(os.path.dirname(f), m.group(2)))
        target = moves.get(target, target)
        rel = os.path.relpath(target, os.path.dirname(new_f))
        if not rel.startswith('.'): rel = './' + rel
        return m.group(1) + rel + m.group(3)
    out = IMPORT.sub(fix, s)
    if out != s: open(f, 'w').write(out)

# 2) absolute / textual references elsewhere
TEXT = ['index.html', 'vote.html', 'remote.html', 'sw.js', 'tests/index.html', 'tests/suite.js', 'tests/run.py',
        'docs/ARCHITECTURE.md', 'CONTRIBUTING.md', 'README.md', 'README.es.md']
for p in TEXT:
    if not os.path.exists(p): continue
    s = open(p).read(); o = s
    for a, b in moves.items(): s = s.replace(a, b)
    if s != o: open(p, 'w').write(s)

# 3) move the files (git keeps the history)
for a, b in moves.items():
    os.makedirs(os.path.dirname(b), exist_ok=True)
    subprocess.check_call(['git', 'mv', a, b])
print('moved', len(moves))
