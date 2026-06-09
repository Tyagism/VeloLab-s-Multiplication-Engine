"""
Vercel Serverless Function: /api/bench
Runs scaling benchmark across multiple digit sizes.
Named bench.py (not benchmark.py) to avoid shadowing the root benchmark module.
"""
import sys
import os

# Add project root to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Disable integer string conversion limit (Python 3.11+)
if hasattr(sys, 'set_int_max_str_digits'):
    sys.set_int_max_str_digits(0)

from http.server import BaseHTTPRequestHandler
import json
from benchmark import run_scaling_benchmark


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            self._send_json(400, {"error": "Invalid JSON payload"})
            return

        sizes = data.get("sizes", [5, 10, 20, 50, 100, 200])
        use_nikhilam = data.get("use_nikhilam_pairs", False)

        # Validate and cap sizes for serverless timeout safety (10s on Vercel free tier)
        clean_sizes = []
        for s in sizes:
            try:
                s_val = int(s)
                if 1 <= s_val <= 500:
                    clean_sizes.append(s_val)
                elif s_val > 500:
                    clean_sizes.append(500)  # Cap at 500 digits
            except ValueError:
                continue

        if not clean_sizes:
            self._send_json(400, {"error": "No valid digit sizes specified (must be between 1 and 500 for cloud execution)"})
            return

        # Limit total number of size points to avoid timeout
        if len(clean_sizes) > 8:
            clean_sizes = clean_sizes[:8]

        # Run scaling benchmark
        records = run_scaling_benchmark(clean_sizes, use_nikhilam_pairs=use_nikhilam)
        self._send_json(200, records)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def log_message(self, format, *args):
        pass
