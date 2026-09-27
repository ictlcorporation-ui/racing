#!/usr/bin/env python3
"""Primește randări din tools/view.html (POST /save?name=x.png) și le scrie în build/renders/. Doar local, 127.0.0.1."""
import http.server, os, sys, urllib.parse
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build", "renders")
os.makedirs(ROOT, exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers", "*")
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(q.get("name", ["render.png"])[0])
        data = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        with open(os.path.join(ROOT, name), "wb") as f: f.write(data)
        self.send_response(200); self.cors(); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8779), H).serve_forever()
