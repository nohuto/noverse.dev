#!/usr/bin/env python3
"""Serve the site locally with GitHub Pages-style 404 handling."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PagesPreviewHandler(SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code != 404:
            return super().send_error(code, message, explain)

        fallback = Path(self.directory) / "404.html"
        try:
            content = fallback.read_bytes()
        except OSError:
            return super().send_error(code, message, explain)

        self.send_response(code, message)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)


def main():
    parser = ArgumentParser()
    parser.add_argument("--bind", default="localhost")
    parser.add_argument("--port", default=8888, type=int)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    handler = partial(PagesPreviewHandler, directory=str(root))
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    print(f"Serving {root} at http://{args.bind}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
