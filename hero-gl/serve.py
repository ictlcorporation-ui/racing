#!/usr/bin/env python3
import http.server, sys, os, subprocess, time
os.chdir(os.path.dirname(os.path.abspath(__file__)))
# /api/season: aceeași funcție ca pe Vercel (api/_ewrc.mjs), rulată cu node; păstrată 30 min în memorie
_season = {"t": 0, "body": b""}
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] == "/api/season":
            if time.time() - _season["t"] > 1800 or not _season["body"]:
                try:
                    _season["body"] = subprocess.run(["node", "tools/season.mjs"], capture_output=True, timeout=60, check=True).stdout
                    _season["t"] = time.time()
                except Exception as e:
                    self.send_response(502); self.end_headers(); self.wfile.write(str(e).encode()); return
            self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8"); self.end_headers(); self.wfile.write(_season["body"]); return
        return super().do_GET()
    def end_headers(self):
        self.send_header("Cache-Control","no-store"); super().end_headers()
    def log_message(self,*a): pass
# al doilea argument opțional: adresa (ex. 0.0.0.0 ca să fie accesibil din rețeaua locală, de pe telefon)
http.server.ThreadingHTTPServer((sys.argv[2] if len(sys.argv)>2 else "127.0.0.1", int(sys.argv[1]) if len(sys.argv)>1 else 8765), H).serve_forever()
