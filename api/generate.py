"""
Vercel Serverless Function: /api/generate
Generates number pairs for various multiplication algorithms.
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
import random
from benchmark import generate_factorial, generate_random_number, generate_nikhilam_pair


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

        gen_type = data.get("type", "random")
        val = data.get("value", 10)

        try:
            val = int(val)
        except ValueError:
            self._send_json(400, {"error": "Value must be an integer"})
            return

        if gen_type == "factorial":
            if val < 0 or val > 5000:
                self._send_json(400, {"error": "Factorial value must be between 0 and 5000"})
                return
            num1 = generate_factorial(val)
            num2 = generate_random_number(len(num1))
        elif gen_type == "nikhilam":
            if val < 1 or val > 1000:
                self._send_json(400, {"error": "Nikhilam digit size must be between 1 and 1000"})
                return
            num1, num2 = generate_nikhilam_pair(val)
        elif gen_type == "ekadhikena":
            if val < 2 or val > 2000:
                self._send_json(400, {"error": "Ekadhikena digit size must be between 2 and 2000"})
                return
            prefix = generate_random_number(val - 1)
            last1 = random.randint(1, 9)
            last2 = 10 - last1
            num1 = prefix + str(last1)
            num2 = prefix + str(last2)
        elif gen_type == "ekanyunena":
            if val < 1 or val > 2000:
                self._send_json(400, {"error": "Ekanyunena digit size must be between 1 and 2000"})
                return
            num1 = "9" * val
            num2 = generate_random_number(random.randint(1, val))
        else:  # random
            if val < 1 or val > 2000:
                self._send_json(400, {"error": "Digit size must be between 1 and 2000"})
                return
            num1 = generate_random_number(val)
            num2 = generate_random_number(val)

        self._send_json(200, {
            "num1": num1,
            "num2": num2,
            "length1": len(num1),
            "length2": len(num2)
        })

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
        pass  # Suppress request logging
