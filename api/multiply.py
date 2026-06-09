"""
Vercel Serverless Function: /api/multiply
Runs all 11 multiplication algorithms with profiling and step traces.
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
from benchmark import benchmark_single
from vedic_maths import (
    urdhva_tiryakbhyam_multiply, nikhilam_multiply, is_nikhilam_suitable,
    ekadhikena_multiply, is_ekadhikena_suitable, ekanyunena_multiply, is_ekanyunena_suitable,
    kapatasandhi_multiply, khanda_ganita_multiply
)
from modern_maths import schoolbook_multiply, dp_multiply, fft_multiply


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

        num1 = data.get("num1", "").strip()
        num2 = data.get("num2", "").strip()

        if not num1 or not num2 or not num1.isdigit() or not num2.isdigit():
            self._send_json(400, {"error": "Inputs must be non-empty digits-only strings"})
            return

        # Cap input size for serverless timeout safety (10s on Vercel free tier)
        if len(num1) > 2000 or len(num2) > 2000:
            self._send_json(400, {"error": "Input too large for cloud execution. Max 2000 digits. Use local server for larger inputs."})
            return

        # Benchmark all algorithms
        metrics = benchmark_single(num1, num2)

        # Fetch step-by-step traces for visualizer (max 12 digits)
        max_visual_len = 12
        can_visualize = len(num1) <= max_visual_len and len(num2) <= max_visual_len

        traces = {}
        if can_visualize:
            _, _, urdhva_trace = urdhva_tiryakbhyam_multiply(num1, num2)
            _, _, school_trace = schoolbook_multiply(num1, num2)
            _, _, kapatasandhi_trace = kapatasandhi_multiply(num1, num2)
            _, _, khanda_trace = khanda_ganita_multiply(num1, num2)
            _, _, dp_trace = dp_multiply(num1, num2)
            _, _, fft_trace = fft_multiply(num1, num2)
            traces["urdhva"] = urdhva_trace
            traces["schoolbook"] = school_trace
            traces["kapatasandhi"] = kapatasandhi_trace
            traces["khanda_ganita"] = khanda_trace
            traces["dp"] = dp_trace
            traces["fft"] = fft_trace

            if is_nikhilam_suitable(num1, num2):
                _, _, nikhilam_trace = nikhilam_multiply(num1, num2)
                traces["nikhilam"] = nikhilam_trace

            if is_ekadhikena_suitable(num1, num2):
                _, _, ekadhikena_trace = ekadhikena_multiply(num1, num2)
                traces["ekadhikena"] = ekadhikena_trace

            if is_ekanyunena_suitable(num1, num2):
                _, _, ekanyunena_trace = ekanyunena_multiply(num1, num2)
                traces["ekanyunena"] = ekanyunena_trace

        self._send_json(200, {
            "metrics": metrics,
            "can_visualize": can_visualize,
            "traces": traces
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
        pass
