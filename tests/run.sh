#!/usr/bin/env bash
# Headless regression run: serves the repo, opens tests/index.html in headless
# Chrome in real time (so camera/recording tests work with fake devices) and
# prints "REVELATEST PASS n/n" or the failing tests; then real touch checks on a
# phone-sized page and the equation keyboard with real mouse clicks. Exit 0 = all pass.
# --only=text,io runs just those areas of tests/suites/. --e2e adds the
# two-device checks. Checks the module layers first (tests/layers.py). Needs only python3 and Chrome/Chromium (see tests/run.py).
cd "$(dirname "$0")/.."
# Layer rules first: quick, and no browser needed.
python3 tests/layers.py || exit 1
# The share server (server/cloudflare), when Node.js is installed.
if command -v node >/dev/null; then node tests/server.mjs || exit 1; fi
exec python3 tests/run.py "$@"
