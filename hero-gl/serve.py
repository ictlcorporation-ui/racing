#!/usr/bin/env python3
import http.server, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control","no-store"); super().end_headers()
    def log_message(self,*a): pass
# al doilea argument opțional: adresa (ex. 0.0.0.0 ca să fie accesibil din rețeaua locală, de pe telefon)
http.server.ThreadingHTTPServer((sys.argv[2] if len(sys.argv)>2 else "127.0.0.1", int(sys.argv[1]) if len(sys.argv)>1 else 8765), H).serve_forever()
