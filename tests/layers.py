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

# Modules that are already in a cycle of static imports (a imports b, b imports a, directly or through others). ES modules
# allow it, and in the editor's canvas, ribbon and dialogs it grew with the features, but each new one makes the load order
# harder to reason about: no module outside this list may join a cycle (take what both need into a third module, or load
# the other with import() when it is used). Removing one from the list is always welcome.
CYCLES = {
    'features/ai/attach.js',
    'features/ai/authoring.js',
    'features/design/fonts.js',
    'features/design/palettes.js',
    'io/export/images.js',
    'io/export/objects.js',
    'ui/canvas/canvas.js',
    'ui/canvas/content.js',
    'ui/canvas/fittext.js',
    'ui/canvas/hover.js',
    'ui/canvas/interact.js',
    'ui/canvas/magnifyview.js',
    'ui/canvas/pathdraw.js',
    'ui/canvas/textruler.js',
    'ui/dialogs/account.js',
    'ui/dialogs/ai.js',
    'ui/dialogs/assistant.js',
    'ui/dialogs/cloud.js',
    'ui/dialogs/cloudlibrary.js',
    'ui/dialogs/diagram.js',
    'ui/dialogs/object.js',
    'ui/dialogs/team.js',
    'ui/dialogs/theme.js',
    'ui/ribbon/actions.js',
    'ui/ribbon/contextual.js',
    'ui/ribbon/ribbon.js',
    'ui/shell/backstage.js',
    'ui/shell/contextmenu.js',
    'ui/shell/openfile.js',
    'ui/shell/palette.js',
    'ui/shell/textaids.js',
}

IMPORT = re.compile(r"""(?:^\s*import\s[^'"]*?from\s*|^\s*import\s*|\bimport\()\s*['"](\.[^'"]+)['"]""", re.M)


STATIC = re.compile(r"^\s*(?:import|export)\s[^'\"\n]*?from\s*['\"](\.[^'\"]+)['\"]|^\s*import\s*['\"](\.[^'\"]+)['\"]", re.M)
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
    # the server is deployed when what it uses changes: every file of the app it imports (and what those import) must
    # be among server.yml's paths — else a version published with only that change leaves the server as it was
    paths = (ROOT / '.github' / 'workflows' / 'server.yml').read_text(encoding='utf-8')
    todo = [p for p in (ROOT / 'server' / 'cloudflare').glob('*.js')]; seen = set()
    while todo:
        f = todo.pop()
        for m in re.findall(r"from '(\.[^']+)'", f.read_text(encoding='utf-8')):
            t = (f.parent / m).resolve()
            if t in seen or not t.is_file(): continue
            seen.add(t); todo.append(t)
    for t in sorted(seen):
        rel = t.relative_to(ROOT).as_posix()
        if rel.startswith('src/') and f"'{rel}'" not in paths:
            errors.append(f'server.yml: el servidor usa {rel}, pero no está entre sus paths (no se desplegaría al cambiar)')
    # alarms only through brakes.js (scheduleAlarm: a minimum delay, a valid time, a budget per hour), and every alarm()
    # handler through its runAlarm — a Durable Object that set its alarm to «now» from its own alarm ran ~600 times a
    # second for two weeks (a $10,811 bill); here it would use up the free plan's daily quota and stop production
    for f in sorted((ROOT / 'server').rglob('*.js')):
        if 'node_modules' in f.parts or f.name == 'brakes.js':
            continue
        rel, text = f.relative_to(ROOT).as_posix(), f.read_text(encoding='utf-8')
        for i, line in enumerate(text.splitlines(), 1):
            if re.search(r'\bsetAlarm\b', line):
                errors.append(f'{rel}:{i}: setAlarm fuera de brakes.js — usa scheduleAlarm(ctx, env, kind, at)')
        for m in re.finditer(r'^\s+(?:async\s+)?alarm\s*\([^)]*\)\s*\{', text, re.M):
            if 'runAlarm(' not in text[m.end():m.end() + 200]:
                errors.append(f'{rel}:{text[:m.start()].count(chr(10)) + 1}: alarm() sin runAlarm (brakes.js)')
    # no new import cycles (see CYCLES)
    graph = {}
    for f in SRC.rglob('*.js'):
        outs = set()
        for m in STATIC.finditer(f.read_text(encoding='utf-8')):
            t = (f.parent / (m.group(1) or m.group(2))).resolve()
            if t.exists(): outs.add(t)
        graph[f.resolve()] = outs
    index, low, stack, on, counter, found = {}, {}, [], set(), [0], []
    sys.setrecursionlimit(10000)
    def visit(v):
        index[v] = low[v] = counter[0]; counter[0] += 1; stack.append(v); on.add(v)
        for w in graph.get(v, ()):
            if w not in index: visit(w); low[v] = min(low[v], low[w])
            elif w in on: low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = stack.pop(); on.discard(w); comp.append(w)
                if w == v: break
            if len(comp) > 1: found.append(comp)
    for v in graph:
        if v not in index: visit(v)
    for comp in found:
        new = sorted(m.relative_to(SRC.resolve()).as_posix() for m in comp if m.relative_to(SRC.resolve()).as_posix() not in CYCLES)
        if new:
            errors.append('ciclo de imports nuevo: ' + ', '.join(new) + ' (módulos que se importan entre sí; saca lo común a un tercero o carga con import() al usarlo)')
    # docs/ARCHITECTURE.md names every module (the map fell behind by a hundred of them before this check): the app's, the
    # server's and the tools', except the templates and the language tables, which have their own pipeline
    doc = (ROOT / 'docs' / 'ARCHITECTURE.md').read_text(encoding='utf-8')
    tracked = subprocess.run(['git', 'ls-files', 'src', 'server', 'tools', 'tests'], cwd=ROOT, capture_output=True, text=True).stdout.split()
    for f in tracked:
        if not f.endswith(('.js', '.mjs', '.py')) or '/templates/' in f or '/langs/' in f or '/suites/' in f or '/fixtures/' in f or 'node_modules' in f or '__pycache__' in f:
            continue
        name = f.rsplit('/', 1)[-1]; stem = name.rsplit('.', 1)[0]
        if name not in doc and not re.search(r'(?<![\w-])' + re.escape(stem) + r'(?![\w-])', doc):
            errors.append(f'docs/ARCHITECTURE.md: no nombra {f} (añade una línea en su sección)')
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
