
from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        response = {
            "success": True,
            "project": "CasaHome",
            "language": "Python",
            "service": "Backend API",
            "message": "CasaHome Python backend is running."
        }

        body = json.dumps(response).encode("utf-8")

        self.send_response(200)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

