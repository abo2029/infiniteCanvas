#!/bin/bash
set -u
cd "$(dirname "$0")"

URL="http://127.0.0.1:4173/canvas"
HEALTH="http://127.0.0.1:4173/"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to run the local preview."
  echo "Install Python 3, then run this file again."
  read -r -p "Press Enter to close..."
  exit 1
fi

python3 "_preview_server.py" > ".preview-server.log" 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

READY=0
for _ in $(seq 1 60); do
  if curl -fsS "$HEALTH" >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if [ "$READY" -ne 1 ]; then
  echo "Infinite Canvas preview server failed to start."
  echo "Log: $(pwd)/.preview-server.log"
  cat ".preview-server.log" 2>/dev/null || true
  read -r -p "Press Enter to close..."
  exit 1
fi

open "$URL"
echo "Infinite Canvas is running at: $URL"
echo "Keep this window open. Press Control+C to stop the preview server."
wait "$SERVER_PID"
