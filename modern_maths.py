"""
Modern Mathematics Multiplication Module.
Implements Schoolbook Long Multiplication, Karatsuba Algorithm,
and Python's Built-in baseline multiplication.
"""

def schoolbook_multiply(num1_str, num2_str):
    """
    Performs the standard Schoolbook long multiplication.
    
    Args:
        num1_str (str): First number as a string.
        num2_str (str): Second number as a string.
        
    Returns:
        tuple: (result_str, ops_dict, trace_dict)
            result_str: The product as a string.
            ops_dict: Counts of digit multiplications, additions, and writes.
            trace_dict: Dictionary containing details of intermediate rows and column sums.
    """
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    if num1_str == "0" or num2_str == "0":
        return "0", {"multiplications": 0, "additions": 0, "writes": 1}, {"rows": [], "sum_cols": []}
        
    a = [int(x) for x in reversed(num1_str)]
    b = [int(x) for x in reversed(num2_str)]
    len_a, len_b = len(a), len(b)
    
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    
    # Store intermediate rows
    # Each row is stored as a list of digits (reversed)
    intermediate_rows = []
    row_details = []
    
    for j in range(len_b):
        bj = b[j]
        row_digits = [0] * j  # Padding for shift
        carry = 0
        digit_steps = []
        
        for i in range(len_a):
            prod = a[i] * bj + carry
            ops["multiplications"] += 1
            if carry > 0:
                ops["additions"] += 1  # Adding carry
            ops["writes"] += 1
            
            write_digit = prod % 10
            carry = prod // 10
            row_digits.append(write_digit)
            
            digit_steps.append({
                "idx_a": i,
                "digit_a": a[i],
                "digit_b": bj,
                "product": a[i] * bj,
                "carry_in": carry - (prod // 10), # previous carry
                "total": prod,
                "write_digit": write_digit,
                "carry_out": carry
            })
            
        if carry > 0:
            row_digits.append(carry)
            ops["writes"] += 1
            digit_steps.append({
                "idx_a": -1,
                "digit_a": 0,
                "digit_b": bj,
                "product": 0,
                "carry_in": carry,
                "total": carry,
                "write_digit": carry,
                "carry_out": 0
            })
            
        intermediate_rows.append(row_digits)
        
        # Convert row to normal representation (most significant digit first)
        row_str = "".join(str(d) for d in reversed(row_digits))
        row_details.append({
            "multiplier_digit": bj,
            "shift": j,
            "row_digits": row_str,
            "steps": digit_steps
        })
        
    # Sum the intermediate rows column by column
    max_len = max(len(r) for r in intermediate_rows)
    final_digits = []
    carry = 0
    sum_cols = []
    
    for pos in range(max_len):
        col_sum = carry
        col_digits = []
        for r in intermediate_rows:
            if pos < len(r):
                col_digits.append(r[pos])
                col_sum += r[pos]
                ops["additions"] += 1
            else:
                col_digits.append(0)
                
        write_digit = col_sum % 10
        next_carry = col_sum // 10
        
        sum_cols.append({
            "col_index": pos,
            "digits": col_digits,
            "prev_carry": carry,
            "total": col_sum,
            "write_digit": write_digit,
            "next_carry": next_carry
        })
        
        final_digits.append(write_digit)
        carry = next_carry
        ops["writes"] += 1
        
    while carry > 0:
        write_digit = carry % 10
        next_carry = carry // 10
        sum_cols.append({
            "col_index": len(sum_cols),
            "digits": [],
            "prev_carry": carry,
            "total": carry,
            "write_digit": write_digit,
            "next_carry": next_carry
        })
        final_digits.append(write_digit)
        carry = next_carry
        ops["writes"] += 1
        
    result_str = "".join(str(d) for d in reversed(final_digits))
    result_str = result_str.lstrip('0')
    if not result_str:
        result_str = '0'
        
    trace = {
        "rows": row_details,
        "column_sums": sum_cols
    }
    
    return result_str, ops, trace


def karatsuba_multiply(num1_str, num2_str):
    """
    Performs multiplication using the Karatsuba divide-and-conquer algorithm.
    
    Args:
        num1_str (str): First number.
        num2_str (str): Second number.
        
    Returns:
        tuple: (result_str, ops_dict)
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    
    def _karatsuba(x, y):
        # Base case
        if x < 10 or y < 10:
            ops["multiplications"] += 1
            ops["writes"] += 1
            return x * y
            
        x_str = str(x)
        y_str = str(y)
        n = max(len(x_str), len(y_str))
        m = n // 2
        
        # Split number
        power = 10 ** m
        x1 = x // power
        x0 = x % power
        y1 = y // power
        y0 = y % power
        
        ops["writes"] += 4 # Writing 4 split parts
        
        # 3 recursive multiplications
        z2 = _karatsuba(x1, y1)
        z0 = _karatsuba(x0, y0)
        
        x1_plus_x0 = x1 + x0
        y1_plus_y0 = y1 + y0
        ops["additions"] += 2
        
        z1_temp = _karatsuba(x1_plus_x0, y1_plus_y0)
        
        # z1 = (x1+x0)*(y1+y0) - z2 - z0
        z1 = z1_temp - z2 - z0
        ops["additions"] += 2 # Two subtractions
        
        # Combine
        result = z2 * (10 ** (2 * m)) + z1 * (10 ** m) + z0
        ops["additions"] += 2  # Two additions
        ops["multiplications"] += 2 # Two shifts/multiplications by power of 10
        ops["writes"] += 1
        
        return result

    # Convert inputs
    n1 = int(num1_str.strip() or "0")
    n2 = int(num2_str.strip() or "0")
    
    res = _karatsuba(n1, n2)
    return str(res), ops


def builtin_multiply(num1_str, num2_str):
    """
    Performs multiplication using Python's native implementation.
    Used as the performance baseline.
    """
    ops = {"multiplications": 1, "additions": 0, "writes": 1}
    n1 = int(num1_str.strip() or "0")
    n2 = int(num2_str.strip() or "0")
    res = n1 * n2
    return str(res), ops


import cmath

def _fft(a):
    n = len(a)
    if n <= 1:
        return a
    even = _fft(a[0::2])
    odd = _fft(a[1::2])
    T = [cmath.exp(-2j * cmath.pi * k / n) * odd[k] for k in range(n // 2)]
    return [even[k] + T[k] for k in range(n // 2)] + [even[k] - T[k] for k in range(n // 2)]

def _ifft(a):
    n = len(a)
    if n <= 1:
        return a
    even = _ifft(a[0::2])
    odd = _ifft(a[1::2])
    T = [cmath.exp(2j * cmath.pi * k / n) * odd[k] for k in range(n // 2)]
    return [even[k] + T[k] for k in range(n // 2)] + [even[k] - T[k] for k in range(n // 2)]

def fft_multiply(num1_str, num2_str):
    """
    Performs Fast Fourier Transform (FFT) multiplication (Schönhage-Strassen baseline).
    Converts numbers into polynomial coefficient frequency arrays to achieve O(N log N) speed.
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    if num1_str == "0" or num2_str == "0":
        return "0", {"multiplications": 0, "additions": 0, "writes": 1}, {}
        
    n = 1
    while n < len(num1_str) + len(num2_str):
        n *= 2
        
    a = [int(x) for x in reversed(num1_str)] + [0] * (n - len(num1_str))
    b = [int(x) for x in reversed(num2_str)] + [0] * (n - len(num2_str))
    
    fa = _fft(a)
    fb = _fft(b)
    ops["multiplications"] += 2 * n  # approximate operations
    
    fc = [fa[i] * fb[i] for i in range(n)]
    ops["multiplications"] += n
    
    c = _ifft(fc)
    c = [x / n for x in c]
    ops["multiplications"] += n
    
    carry = 0
    res_digits = []
    
    for val in c:
        val_rounded = int(round(val.real))
        total = val_rounded + carry
        res_digits.append(total % 10)
        carry = total // 10
        ops["additions"] += 2
        ops["writes"] += 1
        
    while carry > 0:
        res_digits.append(carry % 10)
        carry //= 10
        ops["writes"] += 1
        
    res_str = "".join(str(d) for d in reversed(res_digits))
    res_str = res_str.lstrip('0') or "0"
    
    trace = {
        "num1": num1_str,
        "num2": num2_str,
        "fft_size": n,
        "first_fft_slice": [str(round(x.real, 2)) + "+" + str(round(x.imag, 2)) + "j" for x in fa[:4]],
        "result": res_str,
        "formula": "FFT(A) * FFT(B) -> IFFT -> Carry Propagate"
    }
    
    return res_str, ops, trace


def dp_multiply(num1_str, num2_str):
    """
    Performs multiplication using Dynamic Programming.
    State dp[i] represents the product of num1 with the suffix num2[i:].
    Transitions use a precalculated 10x10 digit product table (DP cache) to prevent redundant digit multiplications.
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    if num1_str == "0" or num2_str == "0":
        return "0", {"multiplications": 0, "additions": 0, "writes": 1}, {}
        
    # Precalculated 10x10 digit product DP table
    digit_dp = [[i * j for j in range(10)] for i in range(10)]
    ops["writes"] += 100  # writing the DP table
    
    len_b = len(num2_str)
    
    # State list to store suffix products
    dp = [0] * (len_b + 1)
    ops["writes"] += len_b + 1
    
    # Bottom-up DP transitions
    for i in range(len_b - 1, -1, -1):
        d2 = int(num2_str[i])
        
        # Calculate num1 * d2 using digit DP table
        carry = 0
        digits = []
        for char in reversed(num1_str):
            d1 = int(char)
            # Fetch from DP lookup table rather than multiplying
            prod = digit_dp[d1][d2] + carry
            ops["additions"] += 1
            digits.append(prod % 10)
            carry = prod // 10
            ops["writes"] += 1
            
        if carry > 0:
            digits.append(carry)
            ops["writes"] += 1
            
        digit_mult_val = int("".join(str(x) for x in reversed(digits)))
        
        # Shift and accumulate
        place_value = 10 ** (len_b - 1 - i)
        shifted_val = digit_mult_val * place_value
        
        dp[i] = shifted_val + dp[i+1]
        ops["additions"] += len(str(dp[i]))
        ops["writes"] += 1
        
    res_str = str(dp[0])
    
    trace = {
        "num1": num1_str,
        "num2": num2_str,
        "dp_states": [str(x) for x in dp],
        "digit_dp_size": 100,
        "result": res_str,
        "formula": "dp[i] = (num1 * num2[i]) * 10^(N-1-i) + dp[i+1]"
    }
    
    return res_str, ops, trace
