"""
Main Entry Point Module.
Provides the Interactive CLI, verification suite, and web dashboard server launcher.
"""

import sys
# Disable integer string conversion limit for large numbers (Python 3.11+)
if hasattr(sys, 'set_int_max_str_digits'):
    sys.set_int_max_str_digits(0)
import os
import random
import argparse
from benchmark import (
    benchmark_single, run_scaling_benchmark, verify_all_algorithms,
    generate_factorial, generate_random_number, generate_nikhilam_pair
)
from server import start_server

# Enable ANSI color escape codes on Windows CMD/PowerShell
if sys.platform == "win32":
    os.system("")

# ANSI Color Utilities
USE_COLOR = True

def style(text, *codes):
    if not USE_COLOR:
        return text
    joined_codes = ";".join(str(c) for c in codes)
    return f"\033[{joined_codes}m{text}\033[0m"

# Style Codes
C_BOLD = 1
C_DIM = 2
C_GREEN = 92
C_CYAN = 96
C_YELLOW = 93
C_MAGENTA = 95
C_RED = 91
C_WHITE = 97

def print_header(title):
    border = "=" * len(title)
    print("\n" + style(border, C_CYAN, C_BOLD))
    print(style(title, C_WHITE, C_BOLD))
    print(style(border, C_CYAN, C_BOLD) + "\n")

def print_table(headers, rows):
    """Prints a beautiful formatted text table."""
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(val)))
            
    header_line = " | ".join(str(h).ljust(col_widths[i]) for i, h in enumerate(headers))
    separator = "-+-".join("-" * w for w in col_widths)
    
    print(style(header_line, C_WHITE, C_BOLD))
    print(style(separator, C_DIM))
    for row in rows:
        formatted_row = []
        for i, val in enumerate(row):
            val_str = str(val)
            # Add color tags depending on algorithm name if it is the first column
            if i == 0:
                if "Swami Bharati" in val_str:
                    val_str = style(val_str, C_GREEN, C_BOLD)
                elif "Indian" in val_str:
                    val_str = style(val_str, C_GREEN)
                elif "Schoolbook" in val_str:
                    val_str = style(val_str, C_MAGENTA)
                elif "Karatsuba" in val_str:
                    val_str = style(val_str, C_YELLOW)
                elif "Dynamic Programming" in val_str:
                    val_str = style(val_str, C_MAGENTA)
                elif "FFT" in val_str:
                    val_str = style(val_str, C_CYAN, C_BOLD)
                elif "Built-in" in val_str:
                    val_str = style(val_str, C_CYAN)
            formatted_row.append(val_str.ljust(col_widths[i]))
        print(" | ".join(formatted_row))
    print()

def format_bytes(bytes_val):
    if bytes_val is None:
        return "N/A"
    if bytes_val == 0:
        return "0 B"
    for unit in ["B", "KB", "MB"]:
        if bytes_val < 1024:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f} GB"

def run_cli_mode():
    """Launches the interactive Terminal menu interface."""
    while True:
        print_header(" Vedic Maths vs Modern Maths Benchmarker CLI ")
        print("1. Perform Single Multiplication & Compare")
        print("2. Run Scaling Benchmarks (Complexity Plots in text)")
        print("3. Run Algorithm Correctness Verifications")
        print("4. Start Interactive Web Dashboard & Visualizer")
        print("5. Exit")
        
        choice = input("\nSelect an option [1-5]: ").strip()
        
        if choice == "1":
            handle_single_multiplication()
        elif choice == "2":
            handle_scaling_benchmarks()
        elif choice == "3":
            verify_all_algorithms(30, 150)
            input("\nPress Enter to return to menu...")
        elif choice == "4":
            print("\nLaunching Web Server...")
            start_server()
            break
        elif choice == "5":
            print("\nGoodbye!")
            break
        else:
            print(style("\nInvalid choice! Please select between 1 and 5.", C_RED))

def handle_single_multiplication():
    print_header(" Single Multiplication Benchmark ")
    print("Select input generation method:")
    print("1. Enter numbers manually")
    print("2. Generate random numbers by digit size")
    print("3. Generate factorials (n!)")
    print("4. Generate Nikhilam-suitable pairs (close to power of 10)")
    print("5. Generate Ekadhikena-suitable pairs (same prefix, units sum to 10)")
    print("6. Generate Ekanyunena-suitable pairs (one is all 9s)")
    
    gen_choice = input("\nSelect [1-6]: ").strip()
    
    num1, num2 = "", ""
    
    if gen_choice == "1":
        num1 = input("Enter Multiplicand (Num 1): ").strip()
        num2 = input("Enter Multiplier (Num 2): ").strip()
    elif gen_choice == "2":
        size = int(input("Enter number of digits: "))
        num1 = generate_random_number(size)
        num2 = generate_random_number(size)
        print(f"\nGenerated random numbers of {size} digits.")
    elif gen_choice == "3":
        n = int(input("Enter n for factorial (n!): "))
        print("Calculating factorial...")
        num1 = generate_factorial(n)
        num2 = generate_random_number(len(num1))
        print(f"\nGenerated Num 1 = {n}! ({len(num1)} digits)")
        print(f"Generated Num 2 = Random number ({len(num2)} digits)")
    elif gen_choice == "4":
        size = int(input("Enter digit size (e.g. 3 for close to 1000): "))
        num1, num2 = generate_nikhilam_pair(size)
        print(f"\nGenerated base-aligned pair close to 10^{size}:")
        print(f"Num 1: {num1}")
        print(f"Num 2: {num2}")
    elif gen_choice == "5":
        size = int(input("Enter digit size (>= 2): "))
        if size < 2: size = 2
        prefix = generate_random_number(size - 1)
        last1 = random.randint(1, 9)
        last2 = 10 - last1
        num1 = prefix + str(last1)
        num2 = prefix + str(last2)
        print(f"\nGenerated Ekadhikena-suitable pair:")
        print(f"Num 1: {num1}")
        print(f"Num 2: {num2}")
    elif gen_choice == "6":
        size = int(input("Enter digit size: "))
        num1 = "9" * size
        num2 = generate_random_number(random.randint(1, size))
        if random.random() < 0.5:
            num1, num2 = num2, num1
        print(f"\nGenerated Ekanyunena-suitable pair:")
        print(f"Num 1: {num1}")
        print(f"Num 2: {num2}")
    else:
        print(style("Invalid option. Returning to menu.", C_RED))
        return

    if not num1.isdigit() or not num2.isdigit():
        print(style("Error: Inputs must be digits only!", C_RED))
        return
        
    print(style("\nCalculating and profiling. Please wait...", C_DIM))
    
    # Run benchmark
    results = benchmark_single(num1, num2)
    
    # Show output details
    print_header(" Benchmarking Results ")
    print(f"Multiplicand length: {len(num1)} digits")
    print(f"Multiplier length:   {len(num2)} digits\n")
    
    headers = ["Algorithm Name", "Status", "Time (ms)", "Peak Memory", "Multiplys", "Additions", "Writes"]
    rows = []
    
    algs = [
        ("urdhva", "Vedic (Swami Bharati Krishna Tirtha Ji): Urdhva (General)"),
        ("nikhilam", "Vedic (Swami Bharati Krishna Tirtha Ji): Nikhilam (Special)"),
        ("ekadhikena", "Vedic (Swami Bharati Krishna Tirtha Ji): Ekadhikena (Special)"),
        ("ekanyunena", "Vedic (Swami Bharati Krishna Tirtha Ji): Ekanyunena (Special)"),
        ("kapatasandhi", "Indian Lattice: Kapatasandhi (Aryabhata/Sridharacharya)"),
        ("khanda_ganita", "Indian Distributive: Khanda Ganita (Bhaskara II)"),
        ("schoolbook", "Schoolbook (Modern)"),
        ("karatsuba", "Karatsuba (Modern)"),
        ("dp", "Dynamic Programming (Modern)"),
        ("fft", "FFT (Schönhage-Strassen)"),
        ("builtin", "Built-in (Baseline)")
    ]
    
    for key, name in algs:
        res = results[key]
        if res.get("active"):
            status_str = style("Correct", C_GREEN) if res.get("correct", True) else style("Incorrect", C_RED)
            time_str = f"{res['time_ms']:.4f} ms" if res['time_ms'] >= 0.01 else f"{res['time_ms'] * 1000.0:.2f} µs"
            mem_str = format_bytes(res['memory_bytes'])
            
            ops = res.get("ops")
            muls = ops.get("multiplications", 0) if ops else 0
            adds = ops.get("additions", 0) if ops else 0
            writes = ops.get("writes", 0) if ops else 0
            
            rows.append([name, status_str, time_str, mem_str, muls, adds, writes])
        else:
            if key in ["nikhilam", "ekadhikena", "ekanyunena"] and not res.get("suitable"):
                status_str = style("Not Suitable", C_DIM)
            else:
                status_str = style("Skipped", C_YELLOW)
            rows.append([name, status_str, "--", "--", "--", "--", "--"])
            
    print_table(headers, rows)
    
    # Result verification
    correct_val = results["builtin"]["result"]
    if len(correct_val) < 150:
        print(style(f"Result Product: {correct_val}", C_WHITE, C_BOLD))
    else:
        print(style(f"Result Product: {correct_val[:75]}... [{len(correct_val) - 150} digits omitted] ... {correct_val[-75:]}", C_WHITE))
        
    input("\nPress Enter to return to menu...")

def handle_scaling_benchmarks():
    print_header(" Scaling Performance Benchmark ")
    sizes_str = input("Enter digit sizes to benchmark (comma separated, e.g. 5, 20, 100, 500, 1000): ").strip()
    if not sizes_str:
        sizes_str = "5, 20, 100, 500, 1000"
        
    try:
        sizes = [int(s.strip()) for s in sizes_str.split(",") if s.strip().isdigit()]
    except Exception:
        print(style("Invalid sizes configuration.", C_RED))
        return
        
    nikhilam_check = input("Use Nikhilam base-aligned numbers? (y/n): ").strip().lower() == "y"
    
    print(style(f"\nRunning benchmark suite for sizes {sizes}... This might take a moment.", C_DIM))
    records = run_scaling_benchmark(sizes, use_nikhilam_pairs=nikhilam_check)
    
    print_header(" Scalability Complexity Records (Time in ms / Peak Memory) ")
    
    headers = ["Digit Size (N)", "Built-in", "Karatsuba", "Swami Bharati: Urdhva", "Schoolbook", "Swami Bharati: Nikhilam", "Swami Bharati: Ekadhikena", "Swami Bharati: Ekanyunena", "Kapatasandhi", "Khanda Ganita", "DP", "FFT"]
    rows = []
    
    for idx, size in enumerate(sizes):
        row = [size]
        for alg in ["builtin", "karatsuba", "urdhva", "schoolbook", "nikhilam", "ekadhikena", "ekanyunena", "kapatasandhi", "khanda_ganita", "dp", "fft"]:
            time_val = records[alg]["time"][idx]
            mem_val = records[alg]["memory"][idx]
            
            if time_val is not None:
                time_str = f"{time_val:.2f}ms" if time_val >= 0.01 else f"{time_val*1000.0:.0f}µs"
                mem_str = format_bytes(mem_val)
                row.append(f"{time_str} / {mem_str}")
            else:
                row.append("--")
        rows.append(row)
        
    print_table(headers, rows)
    input("\nPress Enter to return to menu...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vedic vs Modern Mathematics Multiplication Benchmarker")
    parser.add_argument("--web", action="store_true", help="Start the web dashboard interface")
    parser.add_argument("--verify", action="store_true", help="Run automated verification checks on all algorithms")
    parser.add_argument("--cli", action="store_true", help="Force interactive terminal mode")
    
    args = parser.parse_args()
    
    if args.web:
        print("Starting Web Dashboard...")
        start_server()
    elif args.verify:
        success = verify_all_algorithms(50, 200)
        sys.exit(0 if success else 1)
    else:
        # If no arguments are provided, launch CLI mode
        run_cli_mode()
