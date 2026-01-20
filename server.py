
import http.server
import socketserver
import urllib.parse
import os

PORT = 3000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # DISABLE CACHING - kritické pre NEW GAME funktionalitu!
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_POST(self):
        if self.path.startswith('/save-json'):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            filename = params.get('file', [None])[0]
            if not filename:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Missing file parameter')
                return
            length = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(length)
            try:
                # Uloží JSON do www adresára
                with open(os.path.join(os.path.dirname(__file__), filename), 'wb') as f:
                    f.write(data)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'OK')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not found')

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
