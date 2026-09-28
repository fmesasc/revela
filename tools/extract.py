#!/usr/bin/env python3
"""Move top-level declarations from one ES module to another, fixing imports.

    tools/extract.py SRC DEST "header comment" name1 name2 ...

Each named declaration (function, const, let, class; exported or not) moves
with the comment lines right above it. DEST gets the imports of SRC that the
moved code uses (paths rewritten if DEST is in another folder), plus imports
from SRC for the helpers that stay there (which become exported). SRC keeps
only the imports it still uses and imports back from DEST what it calls.
Other modules that imported a moved name from SRC are repointed to DEST.
If DEST exists, the declarations are appended to it.
"""
import os, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECL = re.compile(r'^(export\s+)?(?:async\s+)?(?:function\*?\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)|class\s+([\w$]+))')
STATEMENT = re.compile(r'^(?:for|if|while|do|try|switch|await|export\s+default|[\w$.]+\s*(?:\(|=[^=>]|\+\+|\.))')
IMPORT = re.compile(r'^import\s+(.+?)\s+from\s+[\'"]([^\'"]+)[\'"];?[ \t]*$', re.M | re.S)


def in_template(lines, i, j):
    """Whether line j is inside a template literal opened since line i."""
    return '\n'.join(lines[i:j]).replace('\\`', '').count('`') % 2 == 1


def blocks(lines):
    """[(name, start, end, exported)] of top-level declarations, comments included."""
    starts = [(i, DECL.match(l)) for i, l in enumerate(lines)]
    starts = [(i, m) for i, m in starts if m]
    out = []
    for k, (i, m) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
        # a loose top-level statement after the declaration is not part of it
        for j in range(i + 1, end):
            if STATEMENT.match(lines[j]) and not in_template(lines, i, j):
                end = j
                break
        # stop before the comment block of the next declaration / trailing blanks
        while end - 1 > i and (lines[end - 1].startswith('//') or not lines[end - 1].strip()):
            end -= 1
        s = i
        while s > 0 and lines[s - 1].startswith('//'):
            s -= 1
        out.append((m.group(2) or m.group(3) or m.group(4), s, end, bool(m.group(1))))
    return out


def parse_imports(text):
    res = []
    for m in IMPORT.finditer(text):
        spec, path = m.group(1).strip(), m.group(2)
        items = []
        star = re.match(r'\*\s+as\s+([\w$]+)$', spec)
        if star:
            items.append(('*', star.group(1)))
        else:
            default = re.match(r'([\w$]+)\s*(,|$)', spec)
            if default and not spec.startswith('{'):
                items.append(('default', default.group(1)))
            named = re.search(r'\{(.*)\}', spec, re.S)
            if named:
                for part in named.group(1).split(','):
                    part = part.strip()
                    if not part:
                        continue
                    a = re.match(r'([\w$]+)(?:\s+as\s+([\w$]+))?$', part)
                    items.append((a.group(1), a.group(2) or a.group(1)))
        res.append((m.start(), m.end(), path, items))
    return res


def code_only(text):
    """The code of a module without the text of quoted strings, template
    literal text and comments; the ${…} inside template literals is code."""
    out, i, n = [], 0, len(text)
    stack = []            # open template literals: brace depth of each ${
    while i < n:
        c = text[i]
        if stack and stack[-1] == -1:          # inside template text
            if c == '\\': i += 2; continue
            if c == '`': stack.pop(); out.append('``'); i += 1; continue
            if text.startswith('${', i): stack[-1] = 0; out.append(' '); i += 2; continue
            i += 1; continue
        if c in '\'"':
            j = i + 1
            while j < n and text[j] != c and text[j] != '\n':
                j += 2 if text[j] == '\\' else 1
            out.append("''"); i = j + 1; continue
        if c == '`': stack.append(-1); i += 1; continue
        if text.startswith('//', i):
            j = text.find('\n', i); i = n if j < 0 else j; continue
        if text.startswith('/*', i):
            j = text.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if stack:
            if c == '{': stack[-1] += 1
            elif c == '}':
                if stack[-1] == 0: stack[-1] = -1; i += 1; continue
                stack[-1] -= 1
        out.append(c); i += 1
    return ''.join(out)


def uses(name, text):
    text = code_only(text)
    # not a property (a.name), but a spread (...name) is a use
    return any(not (m.start() and text[m.start() - 1] == '.' and text[max(0, m.start() - 3):m.start()] != '...')
               for m in re.finditer(r'(?<![\w$])' + re.escape(name) + r'(?![\w$])', text))


def render_import(items, path):
    star = [l for k, l in items if k == '*']
    if star:
        return f"import * as {star[0]} from '{path}';"
    default = [l for k, l in items if k == 'default']
    named = [k if k == l else f'{k} as {l}' for k, l in items if k not in ('*', 'default')]
    spec = ', '.join(default + ([f"{{ {', '.join(named)} }}"] if named else []))
    return f"import {spec} from '{path}';"


def rel(from_file, to_file):
    r = os.path.relpath(to_file, os.path.dirname(from_file)).replace(os.sep, '/')
    return r if r.startswith('.') else './' + r


def main():
    src, dest, header, *names = sys.argv[1:]
    src, dest = pathlib.Path(src).resolve(), pathlib.Path(dest).resolve()
    text = src.read_text(encoding='utf-8')
    imports = parse_imports(text)
    body_start = imports[-1][1] if imports else 0
    head, body = text[:body_start], text[body_start:]
    lines = body.split('\n')
    bl = blocks(lines)
    known = {b[0] for b in bl}
    missing = [n for n in names if n not in known]
    if missing:
        sys.exit(f'no encontrado en {src.name}: {missing}')
    moved_idx = set()
    for name, s, e, _ in bl:
        if name in names:
            moved_idx.update(range(s, e))
    moved = '\n'.join(l for i, l in enumerate(lines) if i in moved_idx).strip('\n') + '\n'
    rest_lines = [l for i, l in enumerate(lines) if i not in moved_idx]
    rest = re.sub(r'\n{3,}', '\n\n', '\n'.join(rest_lines))

    # helpers that stay in SRC but the moved code needs
    stay = [b for b in bl if b[0] not in names]
    need_back = [b[0] for b in stay if uses(b[0], moved)]
    for name in need_back:
        rest = re.sub(r'^((?:async\s+)?(?:function\*?|const|let|var|class)\s+' + re.escape(name) + r'\b)', r'export \1', rest, count=1, flags=re.M)
    # moved names that SRC still calls
    call_moved = [n for n in names if uses(n, rest)]
    moved = re.sub(r'^((?:async\s+)?(?:function\*?|const|let|var|class)\s+)', r'export \1', moved, flags=re.M)

    dest_imports, src_imports = [], []
    for _, _, path, items in imports:
        target = (src.parent / path).resolve() if path.startswith('.') else None
        for_dest = [(k, l) for k, l in items if uses(l, moved)]
        for_src = [(k, l) for k, l in items if uses(l, rest)]
        if for_dest:
            p = rel(dest, target) if target else path
            if target != dest:
                dest_imports.append(render_import(for_dest, p))
        if for_src:
            src_imports.append(render_import(for_src, path))
    if need_back:
        dest_imports.append(render_import([(n, n) for n in need_back], rel(dest, src)))
    if call_moved:
        src_imports.append(render_import([(n, n) for n in call_moved], rel(src, dest)))

    # leading file comment of SRC stays
    if not imports:   # no imports: the file's leading comment is at the top of the body
        m = re.match(r'((?:[ \t]*//[^\n]*\n)+)\n*', rest)
        if m:
            head, rest = m.group(1), rest[m.end():]
    lead = re.match(r'((?:\s*//[^\n]*\n)*)', head).group(1).strip('\n')
    src.write_text((lead + '\n\n' if lead else '') + '\n'.join(src_imports) + '\n' + rest.rstrip('\n').lstrip('\n').join(['\n', '\n']), encoding='utf-8')

    if dest.exists():
        old = dest.read_text(encoding='utf-8')
        old_imports = parse_imports(old)
        have = {l for _, _, _, its in old_imports for _, l in its}
        extra = [i for i in dest_imports if not all(uses(x, ' '.join(have)) for x in re.findall(r'[\w$]+', i.split(' from ')[0].replace('import', '').replace(' as ', ' ')))]
        cut = old_imports[-1][1] if old_imports else 0
        new = old[:cut] + ('\n' + '\n'.join(extra) if extra else '') + old[cut:].rstrip('\n') + '\n\n' + moved
    else:
        new = '\n'.join('// ' + h if h else '//' for h in header.split('\n')) + '\n\n' + ('\n'.join(dest_imports) + '\n\n' if dest_imports else '') + moved
    dest.write_text(new, encoding='utf-8')

    # repoint other importers of the moved names
    for f in ROOT.joinpath('src').rglob('*.js'):
        f = f.resolve()
        if f in (src, dest):
            continue
        t = f.read_text(encoding='utf-8')
        changed = False
        for start, end, path, items in reversed(parse_imports(t)):
            if not path.startswith('.') or (f.parent / path).resolve() != src:
                continue
            if any(k == '*' for k, _ in items):
                star = items[0][1]
                if any(re.search(re.escape(star) + r'\.' + re.escape(n) + r'\b', t) for n in names):
                    print(f'AVISO: {f.relative_to(ROOT)} usa {star}.<movido>; revísalo a mano')
                continue
            mv = [(k, l) for k, l in items if k in names]
            if not mv:
                continue
            keep = [(k, l) for k, l in items if k not in names]
            repl = (render_import(keep, path) + '\n' if keep else '') + render_import(mv, rel(f, dest))
            t = t[:start] + repl + t[end:]
            changed = True
        if changed:
            f.write_text(t, encoding='utf-8')
    print(f'{len(names)} declaraciones → {dest.relative_to(ROOT)}; vuelven de {src.name}: {need_back}; {src.name} importa: {call_moved}')


if __name__ == '__main__':
    main()
