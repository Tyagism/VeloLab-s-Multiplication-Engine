"""
Benchmark Engine Module.
Handles time and memory profiling, digit operation counting, input generation,
and algorithm verification.
"""

import sys
# Disable integer string conversion limit for large numbers (Python 3.11+)
if hasattr(sys, 'set_int_max_str_digits'):
    sys.set_int_max_str_digits(0)
import time
import tracemalloc
import gc
import random
import math
from vedic_maths import (
    urdhva_tiryakbhyam_multiply, nikhilam_multiply, is_nikhilam_suitable,
    is_ekadhikena_suitable, ekadhikena_multiply, is_ekanyunena_suitable, ekanyunena_multiply,
    kapatasandhi_multiply, khanda_ganita_multiply
)
from modern_maths import schoolbook_multiply, karatsuba_multiply, builtin_multiply, dp_multiply, fft_multiply

def generate_factorial(n):
    """Generates the factorial of n as a string."""
    if n < 0:
        return "0"
    return str(math.factorial(n))

def generate_random_number(num_digits):
    """Generates a random decimal number with a specific number of digits."""
    if num_digits <= 0:
        return "0"
    if num_digits == 1:
        return str(random.randint(0, 9))
    
    first_digit = str(random.randint(1, 9))
    remaining_digits = "".join(str(random.randint(0, 9)) for _ in range(num_digits - 1))
    return first_digit + remaining_digits

def generate_nikhilam_pair(num_digits, deviation_percentage=5):
    """
    Generates a pair of numbers suitable for Nikhilam multiplication.
    They will both be close to 10^num_digits.
    """
    base = 10 ** num_digits
    max_dev = (base * deviation_percentage) // 100
    if max_dev < 1:
        max_dev = 1
        
    dev1 = random.randint(-max_dev, max_dev)
    dev2 = random.randint(-max_dev, max_dev)
    
    # Avoid exactly base
    if dev1 == 0: dev1 = 1
    if dev2 == 0: dev2 = -1
    
    n1 = base + dev1
    n2 = base + dev2
    
    return str(n1), str(n2)

def profile_call(func, *args, iterations=1):
    """
    Profiles the time and memory of a function call.
    
    Returns:
        tuple: (result, time_ms, peak_memory_bytes)
    """
    # Warm up and GC
    gc.collect()
    
    # Start memory tracing
    tracemalloc.start()
    
    # Profile execution time (use multiple loops for short calls)
    if iterations > 1:
        start_time = time.perf_counter_ns()
        for _ in range(iterations):
            result = func(*args)
        end_time = time.perf_counter_ns()
        time_ms = ((end_time - start_time) / iterations) / 1_000_000.0
    else:
        start_time = time.perf_counter_ns()
        result = func(*args)
        end_time = time.perf_counter_ns()
        time_ms = (end_time - start_time) / 1_000_000.0
        
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    
    return result, time_ms, peak

def benchmark_single(num1_str, num2_str):
    """
    Benchmarks all multiplication algorithms for a single pair of numbers.
    All algorithms are always executed regardless of input size.
    """
    n1_len = len(num1_str)
    n2_len = len(num2_str)
    max_len = max(n1_len, n2_len)
    
    # Determine iterations to get stable timing
    if max_len < 50:
        iterations = 50
    elif max_len < 200:
        iterations = 5
    else:
        iterations = 1
        

    
    results = {}
    
    # 1. Built-in multiplication (Baseline)
    res_builtin, time_builtin, mem_builtin = profile_call(
        lambda: builtin_multiply(num1_str, num2_str),
        iterations=iterations
    )
    results["builtin"] = {
        "result": res_builtin[0],
        "ops": res_builtin[1],
        "time_ms": time_builtin,
        "memory_bytes": mem_builtin,
        "active": True
    }
    
    # 2. Karatsuba
    # For very large numbers, Karatsuba recursion might hit recursion limit.
    # Python recursion limit is usually 1000. Max len of 5000 has recursion depth ~13, so it's safe.
    try:
        res_karatsuba, time_karatsuba, mem_karatsuba = profile_call(
            lambda: karatsuba_multiply(num1_str, num2_str),
            iterations=iterations
        )
        results["karatsuba"] = {
            "result": res_karatsuba[0],
            "ops": res_karatsuba[1],
            "time_ms": time_karatsuba,
            "memory_bytes": mem_karatsuba,
            "active": True
        }
    except Exception as e:
        results["karatsuba"] = {"active": False, "error": str(e)}
        
    # 3. Urdhva Tiryakbhyam (Vedic General)
    try:
        res_urdhva, time_urdhva, mem_urdhva = profile_call(
            lambda: urdhva_tiryakbhyam_multiply(num1_str, num2_str),
            iterations=iterations
        )
        results["urdhva"] = {
            "result": res_urdhva[0],
            "ops": res_urdhva[1],
            "time_ms": time_urdhva,
            "memory_bytes": mem_urdhva,
            "active": True,
            "trace_len": len(res_urdhva[2])
        }
    except Exception as e:
        results["urdhva"] = {"active": False, "error": str(e)}
        
    # 4. Schoolbook Long Multiplication
    try:
        res_school, time_school, mem_school = profile_call(
            lambda: schoolbook_multiply(num1_str, num2_str),
            iterations=iterations
        )
        results["schoolbook"] = {
            "result": res_school[0],
            "ops": res_school[1],
            "time_ms": time_school,
            "memory_bytes": mem_school,
            "active": True
        }
    except Exception as e:
        results["schoolbook"] = {"active": False, "error": str(e)}
        
    # 5. Nikhilam (Vedic Specialized)
    # Check if Nikhilam is suitable
    nikhilam_ok = is_nikhilam_suitable(num1_str, num2_str)
    if nikhilam_ok:
        try:
            res_nikhilam, time_nikhilam, mem_nikhilam = profile_call(
                lambda: nikhilam_multiply(num1_str, num2_str),
                iterations=iterations
            )
            results["nikhilam"] = {
                "result": res_nikhilam[0],
                "ops": res_nikhilam[1],
                "time_ms": time_nikhilam,
                "memory_bytes": mem_nikhilam,
                "active": True,
                "suitable": True
            }
        except Exception as e:
            results["nikhilam"] = {"active": False, "error": str(e), "suitable": True}
    else:
        results["nikhilam"] = {
            "active": False,
            "suitable": False,
            "error": "Not suitable (numbers not close enough to the same power of 10)"
        }
        
    # 6. Ekadhikena (Vedic Specialized)
    ekadhikena_ok = is_ekadhikena_suitable(num1_str, num2_str)
    if ekadhikena_ok:
        try:
            res_ekadhikena, time_ekadhikena, mem_ekadhikena = profile_call(
                lambda: ekadhikena_multiply(num1_str, num2_str),
                iterations=iterations
            )
            results["ekadhikena"] = {
                "result": res_ekadhikena[0],
                "ops": res_ekadhikena[1],
                "time_ms": time_ekadhikena,
                "memory_bytes": mem_ekadhikena,
                "active": True,
                "suitable": True
            }
        except Exception as e:
            results["ekadhikena"] = {"active": False, "error": str(e), "suitable": True}
    else:
        results["ekadhikena"] = {
            "active": False,
            "suitable": False,
            "error": "Not suitable (last digits do not sum to 10 or preceding digits differ)"
        }
        
    # 7. Ekanyunena (Vedic Specialized)
    ekanyunena_ok = is_ekanyunena_suitable(num1_str, num2_str)
    if ekanyunena_ok:
        try:
            res_ekanyunena, time_ekanyunena, mem_ekanyunena = profile_call(
                lambda: ekanyunena_multiply(num1_str, num2_str),
                iterations=iterations
            )
            results["ekanyunena"] = {
                "result": res_ekanyunena[0],
                "ops": res_ekanyunena[1],
                "time_ms": time_ekanyunena,
                "memory_bytes": mem_ekanyunena,
                "active": True,
                "suitable": True
            }
        except Exception as e:
            results["ekanyunena"] = {"active": False, "error": str(e), "suitable": True}
    else:
        results["ekanyunena"] = {
            "active": False,
            "suitable": False,
            "error": "Not suitable (neither number consists entirely of 9s with length suitable)"
        }
        
    # 8. Kapatasandhi (Lattice)
    try:
        res_kapatasandhi, time_kapatasandhi, mem_kapatasandhi = profile_call(
            lambda: kapatasandhi_multiply(num1_str, num2_str),
            iterations=iterations
        )
        results["kapatasandhi"] = {
            "result": res_kapatasandhi[0],
            "ops": res_kapatasandhi[1],
            "time_ms": time_kapatasandhi,
            "memory_bytes": mem_kapatasandhi,
            "active": True
        }
    except Exception as e:
        results["kapatasandhi"] = {"active": False, "error": str(e)}

    # 9. Khanda Ganita (Bhaskara II Distributive)
    try:
        res_khanda, time_khanda, mem_khanda = profile_call(
            lambda: khanda_ganita_multiply(num1_str, num2_str),
            iterations=iterations
        )
        results["khanda_ganita"] = {
            "result": res_khanda[0],
            "ops": res_khanda[1],
            "time_ms": time_khanda,
            "memory_bytes": mem_khanda,
            "active": True
        }
    except Exception as e:
        results["khanda_ganita"] = {"active": False, "error": str(e)}

    # 10. Dynamic Programming
    try:
        res_dp, time_dp, mem_dp = profile_call(
            lambda: dp_multiply(num1_str, num2_str),
            iterations=iterations
        )
        results["dp"] = {
            "result": res_dp[0],
            "ops": res_dp[1],
            "time_ms": time_dp,
            "memory_bytes": mem_dp,
            "active": True
        }
    except Exception as e:
        results["dp"] = {"active": False, "error": str(e)}

    # 11. FFT (Schönhage-Strassen)
    try:
        res_fft, time_fft, mem_fft = profile_call(
            lambda: fft_multiply(num1_str, num2_str),
            iterations=iterations
        )
        results["fft"] = {
            "result": res_fft[0],
            "ops": res_fft[1],
            "time_ms": time_fft,
            "memory_bytes": mem_fft,
            "active": True
        }
    except Exception as e:
        results["fft"] = {"active": False, "error": str(e)}

    # Verify correctness against built-in
    correct_val = results["builtin"]["result"]
    for alg in ["karatsuba", "urdhva", "schoolbook", "nikhilam", "ekadhikena", "ekanyunena", "kapatasandhi", "khanda_ganita", "dp", "fft"]:
        if results[alg].get("active") and results[alg]["result"] != correct_val:
            results[alg]["correct"] = False
            results[alg]["error"] = f"Correctness check failed! Expected {correct_val[:20]}..., got {results[alg]['result'][:20]}..."
        elif results[alg].get("active"):
            results[alg]["correct"] = True
            
    return results

def run_scaling_benchmark(sizes, use_nikhilam_pairs=False):
    """
    Runs benchmarks across multiple digit sizes to track scalability.
    
    Args:
        sizes (list of int): Digit sizes to benchmark.
        use_nikhilam_pairs (bool): Generate pairs close to base (to test Nikhilam efficiency).
        
    Returns:
        dict: Scaling benchmark records.
    """
    records = {
        "sizes": sizes,
        "builtin": {"time": [], "memory": [], "ops": []},
        "karatsuba": {"time": [], "memory": [], "ops": []},
        "urdhva": {"time": [], "memory": [], "ops": []},
        "schoolbook": {"time": [], "memory": [], "ops": []},
        "nikhilam": {"time": [], "memory": [], "ops": []},
        "ekadhikena": {"time": [], "memory": [], "ops": []},
        "ekanyunena": {"time": [], "memory": [], "ops": []},
        "kapatasandhi": {"time": [], "memory": [], "ops": []},
        "khanda_ganita": {"time": [], "memory": [], "ops": []},
        "dp": {"time": [], "memory": [], "ops": []},
        "fft": {"time": [], "memory": [], "ops": []}
    }
    
    for size in sizes:
        if use_nikhilam_pairs:
            n1, n2 = generate_nikhilam_pair(size)
        else:
            n1 = generate_random_number(size)
            n2 = generate_random_number(size)
            
        res = benchmark_single(n1, n2)
        
        for alg in ["builtin", "karatsuba", "urdhva", "schoolbook", "nikhilam", "ekadhikena", "ekanyunena", "kapatasandhi", "khanda_ganita", "dp", "fft"]:
            if res[alg].get("active"):
                records[alg]["time"].append(res[alg]["time_ms"])
                records[alg]["memory"].append(res[alg]["memory_bytes"])
                records[alg]["ops"].append(res[alg]["ops"])
            else:
                records[alg]["time"].append(None)
                records[alg]["memory"].append(None)
                records[alg]["ops"].append(None)
                
    return records

def verify_all_algorithms(num_tests=50, max_digits=200):
    """
    Runs automated verification checks across randomly generated inputs.
    """
    print(f"Running {num_tests} verification tests (inputs up to {max_digits} digits)...")
    
    success = True
    for i in range(num_tests):
        digits = random.randint(2, max_digits)
        case_type = i % 4
        
        if case_type == 0:
            # 1. Normal Random
            n1 = generate_random_number(digits)
            n2 = generate_random_number(digits)
        elif case_type == 1:
            # 2. Nikhilam Suitable
            n1, n2 = generate_nikhilam_pair(digits, deviation_percentage=random.randint(1, 15))
        elif case_type == 2:
            # 3. Ekadhikena Suitable
            prefix = generate_random_number(digits - 1) if digits > 1 else ""
            last1 = random.randint(1, 9)
            last2 = 10 - last1
            n1 = prefix + str(last1)
            n2 = prefix + str(last2)
        else:
            # 4. Ekanyunena Suitable
            n9 = "9" * digits
            other = generate_random_number(random.randint(1, digits))
            if random.random() < 0.5:
                n1, n2 = n9, other
            else:
                n1, n2 = other, n9
            
        res = benchmark_single(n1, n2)
        
        # Verify
        expected = res["builtin"]["result"]
        
        for alg in ["karatsuba", "urdhva", "schoolbook", "kapatasandhi", "khanda_ganita", "dp", "fft"]:
            if not res[alg].get("active") or res[alg]["result"] != expected:
                print(f"FAIL: Test {i+1} failed for {alg} on {digits}-digit numbers!")
                print(f"Num1: {n1}")
                print(f"Num2: {n2}")
                print(f"Expected: {expected}")
                if res[alg].get("active"):
                    print(f"Got:      {res[alg]['result']}")
                else:
                    print(f"Error:    {res[alg].get('error')}")
                success = False
                break
                
        if not success:
            break
            
        # Verify specialized Vedic sutras if active
        for sutra in ["nikhilam", "ekadhikena", "ekanyunena"]:
            if res[sutra].get("active") and res[sutra]["result"] != expected:
                print(f"FAIL: Test {i+1} failed for {sutra} on {digits}-digit numbers!")
                print(f"Num1: {n1}")
                print(f"Num2: {n2}")
                print(f"Expected: {expected}")
                print(f"Got:      {res[sutra]['result']}")
                success = False
                break
                
        if not success:
            break
            
    if success:
        print("SUCCESS: All algorithms match Python's built-in multiplication exactly!")
    return success

if __name__ == "__main__":
    # Self-test
    verify_all_algorithms(10, 50)
