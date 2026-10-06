#!/usr/bin/env python3
"""Architecture check: every module in src/ imports only from its own layer or
the ones below (see docs/ARCHITECTURE.md), and every name it imports exists.
Exit 1 and list the offending imports otherwise. Run by tests/run.sh before the browser suite.

    apps  →  ui  →  api  →  io  →  features  →  render · i18n  →  core
"""
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'

# Layer of each top-level folder of src/; a module may import a lower or
# equal rank. The API (window.Revela) opens no dialogs; the UI uses it for the
# plugin and macro manager.
RANK = {'core': 0, 'i18n': 1, 'render': 1, 'features': 2, 'io': 3, 'api': 4, 'ui': 5, 'apps': 6}
# Pairs of the same rank that must not know each other.
APART = {('render', 'i18n')}
# Code that runs inside the exported presentation cannot import at all.
SELF_CONTAINED = {'io/runtime/ink.js', 'io/runtime/camera.js', 'io/runtime/puppet.js'}

IMPORT = re.compile(r"""(?:^\s*import\s[^'"]*?from\s*|^\s*import\s*|\bimport\()\s*['"](\.[^'"]+)['"]""", re.M)


NAMED = re.compile(r"^\s*import\s*\{([^}]*)\}\s*from\s*['\"](\.[^'\"]+)['\"]", re.M)
EXPORT = re.compile(r"^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)|^export\s*\{([^}]*)\}", re.M)


def exports_of(path, cache={}):
    if path not in cache:
        names = set()
        text = path.read_text(encoding='utf-8')
        for m in EXPORT.finditer(text):
            if m.group(1):
                names.add(m.group(1))
            else:
                names.update(x.split(' as ')[-1].strip() for x in m.group(2).split(',') if x.strip())
        # (and the others of one line: export const DAY = 864e5, HOUR = 36e5;)
        for m in re.finditer(r'^export\s+(?:const|let|var)\s+(.+)$', text, re.M):
            names.update(re.findall(r',\s*([\w$]+)\s*=(?!=|>)', m.group(1)))
        cache[path] = names
    return cache[path]


def layer(path):
    return path.relative_to(SRC).parts[0]


def main():
    errors = []
    for f in sorted(SRC.rglob('*.js')):
        rel = f.relative_to(SRC).as_posix()
        if layer(f) not in RANK:
            errors.append(f'{rel}: carpeta fuera de las capas {sorted(RANK)}')
            continue
        for m in IMPORT.finditer(f.read_text(encoding='utf-8')):
            target = (f.parent / m.group(1)).resolve()
            if not target.exists():
                errors.append(f'{rel}: importa {m.group(1)}, que no existe')
                continue
            if rel in SELF_CONTAINED:
                errors.append(f'{rel}: se incrusta en la presentación y no puede importar ({m.group(1)})')
                continue
            if SRC not in target.parents:
                errors.append(f'{rel}: importa fuera de src/ ({m.group(1)})')
                continue
            a, b = layer(f), layer(target)
            if RANK[b] > RANK[a] or (a, b) in APART:
                errors.append(f'{rel} ({a}) → {target.relative_to(SRC).as_posix()} ({b})')
    # every name imported with { … } must be exported by its module (the app's and the server's)
    for f in sorted([*SRC.rglob('*.js'), *(ROOT / 'server').rglob('*.js')]):
        if 'node_modules' in f.parts:
            continue
        rel = f.relative_to(ROOT).as_posix()
        for m in NAMED.finditer(f.read_text(encoding='utf-8')):
            target = (f.parent / m.group(2)).resolve()
            if not target.exists():
                continue
            for part in m.group(1).split(','):
                name = part.strip().split(' as ')[0].strip()
                if name and name not in exports_of(target):
                    errors.append(f'{rel}: importa {name} de {m.group(2)}, que no lo exporta')
    # files the pages and the service worker point to must exist
    for page in ['index.html', 'vote.html', 'remote.html', 'view.html', 'sw.js']:
        text = (ROOT / page).read_text(encoding='utf-8')
        refs = re.findall(r'(?:src|href)="((?:src|icons)/[^"]+)"', text) + re.findall(r"'((?:src|icons)/[^']+)'", text)
        for ref in refs:
            if not (ROOT / ref).exists():
                errors.append(f'{page}: {ref} no existe')
    # the server's test environment (test.revelaslides.com) binds the same Durable Objects as production
    toml = (ROOT / 'server' / 'cloudflare' / 'wrangler.toml').read_text(encoding='utf-8')
    top = toml.split('[env.')[0]
    prod = set(re.findall(r'\[\[durable_objects\.bindings\]\]\nname = "(\w+)"\nclass_name = "(\w+)"', top))
    stage = set(re.findall(r'\[\[env\.staging\.durable_objects\.bindings\]\]\nname = "(\w+)"\nclass_name = "(\w+)"', toml))
    if prod != stage:
        errors.append(f'wrangler.toml: [env.staging] no tiene los mismos objetos que producción: faltan {sorted(prod - stage)}, sobran {sorted(stage - prod)}')
    # one version: package.json's and the app's (src/core/config.js; the desktop builds take package.json's)
    pkg = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    app = re.search(r"APP_VERSION = '([^']+)'", (SRC / 'core' / 'config.js').read_text(encoding='utf-8'))
    if not app or app.group(1) != pkg:
        errors.append(f'versión: package.json dice {pkg} y src/core/config.js {app and app.group(1)}')
    # every file of the app must be committable: an ignored one works locally
    # but is missing (404) once published
    ignored = subprocess.run(['git', 'check-ignore', '--no-index', '--stdin'], cwd=ROOT, capture_output=True, text=True,
                             input='\n'.join(p.relative_to(ROOT).as_posix() for p in SRC.rglob('*') if p.is_file())).stdout.split()
    errors += [f'{f}: lo ignora .gitignore (no se publicaría)' for f in ignored]
    if errors:
        print('ARQUITECTURA: problemas\n  ' + '\n  '.join(errors))
        return 1
    print('ARQUITECTURA OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
