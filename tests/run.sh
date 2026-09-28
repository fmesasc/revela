#!/usr/bin/env bash
# Headless regression run: serves the repo, opens tests/index.html in headless
# Chrome in real time (so camera/recording tests work with fake devices) and
# prints "REVELATEST PASS n/n" or the failing tests. Exit 0 = all pass.
# Needs only python3 and Chrome/Chromium (see tests/run.py).
cd "$(dirname "$0")/.."
exec python3 tests/run.py
