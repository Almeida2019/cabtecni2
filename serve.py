import functools
import http.server
import socketserver

DIRECTORY = "/Users/almeidajose/Documents/A/App/C"
PORT = 4599

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)

with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Serving {DIRECTORY} at http://127.0.0.1:{PORT}")
    httpd.serve_forever()
