"""A browser profile for the tools that drive a headless Chrome (pictures, playbacks, audits): its own folder, removed
when the tool ends — and, first, the ones earlier runs left behind (a run cut short, a killed process), so they never
pile up. Left there, each one — pages, models and pictures cached — took up hundreds of megabytes: 15 GB in a week
of checking templates, until the disk filled.

    from chromeprof import profile
    prof = profile('revela-shot')          # → /tmp/…/revela-shot-<pid>, gone at exit
"""
import atexit, glob, os, re, shutil, subprocess, tempfile, time

STALE = 2 * 3600          # (a profile untouched for two hours, and no Chrome using it, is a leftover)


def _in_use():
    """The profile folders the Chrome processes now running use."""
    try:
        out = subprocess.run(['ps', '-eo', 'args'], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return None
    return set(re.findall(r'--user-data-dir=(\S+)', out))


def sweep(base=None):
    """Removes the leftover profiles of these tools (revela-*, under the temp folders they use)."""
    used = _in_use()
    if used is None:
        return
    now = time.time()
    roots = {base or tempfile.gettempdir(), '/tmp', os.environ.get('TMPDIR') or '/tmp', '/tmp/claude-1000'}
    for root in roots:
        for d in glob.glob(os.path.join(root, 'revela-*')):
            try:
                if not os.path.isdir(d) or any(u.rstrip('/').startswith(d.rstrip('/')) for u in used):
                    continue
                if now - os.path.getmtime(d) > STALE:
                    shutil.rmtree(d, ignore_errors=True)
            except OSError:
                pass


def profile(prefix='revela-chrome', base=None):
    """A new profile folder, removed when this process ends; sweeps the leftovers first."""
    base = base or os.environ.get('TMPDIR') or tempfile.gettempdir()
    sweep(base)
    d = os.path.join(base, f'{prefix}-{os.getpid()}')
    os.makedirs(d, exist_ok=True)
    def gone():
        for _ in range(10):
            shutil.rmtree(d, ignore_errors=True)
            if not os.path.exists(d):
                return
            time.sleep(0.3)                      # (its helpers write on a moment after it is closed)
    atexit.register(gone)
    return d
