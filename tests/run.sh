#!/usr/bin/env bash
# Headless regression run. Serves the repo, opens tests/index.html in headless
# Chrome, and reports the result. Exit code 0 = all pass, 1 = failure.
set -u
cd "$(dirname "$0")/.."

PORT=8974
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
if [ -z "$CHROME" ]; then echo "No se encontró Chrome/Chromium"; exit 2; fi

python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/revela-test-srv.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1

OUT="$("$CHROME" --headless --no-sandbox --disable-gpu --virtual-time-budget=12000 \
  --dump-dom "http://127.0.0.1:$PORT/tests/index.html" 2>/dev/null \
  | grep -oE 'REVELATEST (PASS|FAIL)[^<"]*' | head -1)"

echo "${OUT:-REVELATEST FAIL (sin resultado)}"
case "$OUT" in
  *PASS*) exit 0 ;;
  *)      exit 1 ;;
esac
