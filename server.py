"""
HTTP Server Module.
Hosts the web dashboard and provides API endpoints for calculations, benchmarking, and number generation.
Uses only Python standard libraries.
"""

import sys
# Disable integer string conversion limit for large numbers (Python 3.11+)
if hasattr(sys, 'set_int_max_str_digits'):
    sys.set_int_max_str_digits(0)
import http.server
import socketserver
import os
import json
import socket
import webbrowser
import random
from benchmark import (
    benchmark_single, run_scaling_benchmark, generate_factorial,
    generate_random_number, generate_nikhilam_pair
)
from vedic_maths import (
    urdhva_tiryakbhyam_multiply, nikhilam_multiply, is_nikhilam_suitable,
    ekadhikena_multiply, is_ekadhikena_suitable, ekanyunena_multiply, is_ekanyunena_suitable,
    kapatasandhi_multiply, khanda_ganita_multiply
)
from modern_maths import schoolbook_multiply, dp_multiply, fft_multiply

PORT = 8000
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

class APIHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Override to suppress standard HTTP logging in console
        # to keep the terminal output clean and beautiful
        pass

    def send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        # Allow CORS just in case
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split("?")[0]
        
        # Route static files
        if clean_path in ["/", "/index.html"]:
            filepath = os.path.join(STATIC_DIR, "index.html")
            content_type = "text/html"
        elif clean_path == "/style.css":
            filepath = os.path.join(STATIC_DIR, "style.css")
            content_type = "text/css"
        elif clean_path == "/app.js":
            filepath = os.path.join(STATIC_DIR, "app.js")
            content_type = "application/javascript"
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return
            
        if not os.path.exists(filepath):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(f"File not found: {filepath}".encode("utf-8"))
            return
            
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            self.send_json(400, {"error": "Invalid JSON payload"})
            return
            
        # Route API requests
        if self.path == "/api/generate":
            self.handle_generate(data)
        elif self.path == "/api/multiply":
            self.handle_multiply(data)
        elif self.path == "/api/benchmark":
            self.handle_benchmark(data)
        else:
            self.send_json(404, {"error": "API Endpoint not found"})

    def handle_generate(self, data):
        gen_type = data.get("type", "random") # factorial, random, nikhilam
        val = data.get("value", 10)
        
        try:
            val = int(val)
        except ValueError:
            self.send_json(400, {"error": "Value must be an integer"})
            return
            
        if gen_type == "factorial":
            if val < 0 or val > 5000:
                self.send_json(400, {"error": "Factorial value must be between 0 and 5000"})
                return
            num1 = generate_factorial(val)
            num2 = "2" # factorials are usually multiplied by something, let's generate factorial and multiply by a random number of similar length
            num2 = generate_random_number(len(num1))
        elif gen_type == "nikhilam":
            if val < 1 or val > 1000:
                self.send_json(400, {"error": "Nikhilam digit size must be between 1 and 1000"})
                return
            num1, num2 = generate_nikhilam_pair(val)
        elif gen_type == "ekadhikena":
            if val < 2 or val > 2000:
                self.send_json(400, {"error": "Ekadhikena digit size must be between 2 and 2000"})
                return
            prefix = generate_random_number(val - 1)
            last1 = random.randint(1, 9)
            last2 = 10 - last1
            num1 = prefix + str(last1)
            num2 = prefix + str(last2)
        elif gen_type == "ekanyunena":
            if val < 1 or val > 2000:
                self.send_json(400, {"error": "Ekanyunena digit size must be between 1 and 2000"})
                return
            num1 = "9" * val
            num2 = generate_random_number(random.randint(1, val))
        else: # random
            if val < 1 or val > 5000:
                self.send_json(400, {"error": "Digit size must be between 1 and 5000"})
                return
            num1 = generate_random_number(val)
            num2 = generate_random_number(val)
            
        self.send_json(200, {
            "num1": num1,
            "num2": num2,
            "length1": len(num1),
            "length2": len(num2)
        })

    def handle_multiply(self, data):
        num1 = data.get("num1", "").strip()
        num2 = data.get("num2", "").strip()
        
        if not num1 or not num2 or not num1.isdigit() or not num2.isdigit():
            self.send_json(400, {"error": "Inputs must be non-empty digits-only strings"})
            return
            
        # Benchmark single runs
        metrics = benchmark_single(num1, num2)
        
        # Fetch step-by-step traces for visualizer (if within visualizable size, e.g. <= 12 digits)
        # Visualizing 50 digits is too cluttered, so we cap step visualization details
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
                
        self.send_json(200, {
            "metrics": metrics,
            "can_visualize": can_visualize,
            "traces": traces
        })

    def handle_benchmark(self, data):
        sizes = data.get("sizes", [5, 10, 20, 50, 100, 200, 500])
        use_nikhilam = data.get("use_nikhilam_pairs", False)
        
        # Validate sizes
        clean_sizes = []
        for s in sizes:
            try:
                s_val = int(s)
                if 1 <= s_val <= 3000:
                    clean_sizes.append(s_val)
            except ValueError:
                continue
                
        if not clean_sizes:
            self.send_json(400, {"error": "No valid digit sizes specified (must be between 1 and 3000)"})
            return
            
        # Run scaling benchmark
        records = run_scaling_benchmark(clean_sizes, use_nikhilam_pairs=use_nikhilam)
        self.send_json(200, records)


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    # Enable socket re-use to avoid "Address already in use" errors on restart
    allow_reuse_address = True


def is_port_available(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return True
        except socket.error:
            return False


def start_server():
    global PORT
    port = PORT
    while not is_port_available(port):
        print(f"Port {port} is occupied. Trying {port + 1}...")
        port += 1
        if port > PORT + 20:
            print("Could not find an available port to launch server.")
            return
            
    PORT = port
    
    # Check if web directory exists, create it
    if not os.path.exists(STATIC_DIR):
        os.makedirs(STATIC_DIR)
        
    server = ThreadedTCPServer(("127.0.0.1", PORT), APIHandler)
    url = f"http://127.0.0.1:{PORT}"
    
    print(f"\n=========================================")
    print(f" Vedic vs Modern Maths Web Dashboard Server")
    print(f"=========================================")
    print(f" Server running at: {url}")
    print(f" Press Ctrl+C in terminal to stop.")
    print(f"=========================================\n")
    
    # Open browser automatically
    webbrowser.open(url)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping web server...")
        server.shutdown()
        server.server_close()
        print("Server stopped.")
