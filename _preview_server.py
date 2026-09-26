#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HOST = "127.0.0.1"
PORT = 4173
ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

if not (DIST / "index.html").is_file():
    print(f"[Infinite Canvas] Missing build output: {DIST / 'index.html'}", file=sys.stderr)
    sys.exit(1)


class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        request_path = unquote(urlparse(self.path).path)
        relative = request_path.lstrip("/")
        candidate = DIST / relative

        # Vite/React SPA routes such as /canvas must fall back to index.html.
        # Real static-file requests keep normal 404 behaviour when missing.
        if request_path != "/" and not candidate.exists() and not Path(relative).suffix:
            self.path = "/index.html"

        super().do_GET()

    def log_message(self, fmt, *args):
        print(f"[Infinite Canvas] {self.address_string()} - {fmt % args}")


if __name__ == "__main__":
    try:
        server = ThreadingHTTPServer((HOST, PORT), SPAHandler)
    except OSError as exc:
        print(f"[Infinite Canvas] Could not listen on http://{HOST}:{PORT}: {exc}", file=sys.stderr)
        sys.exit(2)

    print(f"[Infinite Canvas] Preview server: http://{HOST}:{PORT}/canvas")
    print("[Infinite Canvas] Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
