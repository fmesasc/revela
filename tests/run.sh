#!/usr/bin/env bash
# Headless regression run: serves the repo, opens tests/index.html in headless
# Chrome in real time (so camera/recording tests work with fake devices) and
# prints "REVELATEST PASS n/n" or the failing tests; then real touch checks on a
# phone-sized page, the equation keyboard and other real mouse and key checks. Exit 0 = all pass.
# --only=text,io runs just those areas of tests/suites/, --grep=text the tests whose name has it. --e2e adds the
# two-device checks. Checks the module layers first (tests/layers.py). Needs python3, Node.js 22+ and Chrome/Chromium (see tests/run.py).
cd "$(dirname "$0")/.."
# Layer rules first: quick, and no browser needed.
python3 tests/layers.py || exit 1
# The server (server/cloudflare) and the checks that run in Node.js: required (without Node.js the run would look
# green while skipping half of it).
command -v node >/dev/null || { echo 'Falta Node.js (22 o más): https://nodejs.org' >&2; exit 1; }
node tests/server.mjs || exit 1; node tests/server-api.mjs || exit 1; node tests/server-lti.mjs || exit 1; node tests/server-blender.mjs || exit 1
node tests/client-account.mjs || exit 1; node tests/templates-i18n.mjs || exit 1; node tools/template-texts.mjs --check || exit 1
exec python3 tests/run.py "$@"
