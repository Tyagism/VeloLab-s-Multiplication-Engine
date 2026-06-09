"""
Vedic Mathematics Multiplication Module.
Implements Urdhva Tiryakbhyam (Vertically and Crosswise) and
Nikhilam Navatashcaramam Dashatah (All from 9 and last from 10).
"""

def urdhva_tiryakbhyam_multiply(num1_str, num2_str):
    """
    Performs Urdhva Tiryakbhyam (Vertically and Crosswise) multiplication.
    
    Args:
        num1_str (str): First number as a string.
        num2_str (str): Second number as a string.
        
    Returns:
        tuple: (result_str, ops_dict, traces_list)
            result_str: The product as a string.
            ops_dict: Counts of digit multiplications, additions, and writes.
            traces_list: List of dictionaries detailing steps for the visualizer.
    """
    # Clean inputs
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    # Handle simple zero cases
    if num1_str == "0" or num2_str == "0":
        return "0", {"multiplications": 0, "additions": 0, "writes": 1}, []
        
    a = [int(x) for x in reversed(num1_str)]
    b = [int(x) for x in reversed(num2_str)]
    len_a, len_b = len(a), len(b)
    
    # Store product sums for each crosswise position
    # The maximum number of digits will be len_a + len_b
    result_steps = [0] * (len_a + len_b - 1)
    
    # Track which digit pairs were multiplied for each position
    step_pairs = [[] for _ in range(len_a + len_b - 1)]
    
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    
    # Perform crosswise digit multiplications
    for i in range(len_a):
        for j in range(len_b):
            prod = a[i] * b[j]
            result_steps[i + j] += prod
            step_pairs[i + j].append({
                "idx_a": i,          # index from right in num1
                "idx_b": j,          # index from right in num2
                "digit_a": a[i],
                "digit_b": b[j],
                "product": prod
            })
            ops["multiplications"] += 1
            if result_steps[i + j] > prod:
                ops["additions"] += 1
            ops["writes"] += 1
            
    # Propagate carries from right to left
    carry = 0
    final_digits = []
    traces = []
    
    for k in range(len_a + len_b - 1):
        val = result_steps[k]
        total = val + carry
        
        write_digit = total % 10
        next_carry = total // 10
        
        traces.append({
            "step": k,
            "pairs": step_pairs[k],
            "step_sum": val,
            "prev_carry": carry,
            "total": total,
            "write_digit": write_digit,
            "next_carry": next_carry
        })
        
        final_digits.append(write_digit)
        if carry > 0:
            ops["additions"] += 1
        carry = next_carry
        ops["writes"] += 1
        
    # Process remaining carry
    k = len_a + len_b - 1
    while carry > 0:
        write_digit = carry % 10
        next_carry = carry // 10
        traces.append({
            "step": k,
            "pairs": [],
            "step_sum": 0,
            "prev_carry": carry,
            "total": carry,
            "write_digit": write_digit,
            "next_carry": next_carry
        })
        final_digits.append(write_digit)
        carry = next_carry
        ops["writes"] += 1
        k += 1
        
    # Construct final result
    result_str = "".join(str(d) for d in reversed(final_digits))
    result_str = result_str.lstrip('0')
    if not result_str:
        result_str = '0'
        
    return result_str, ops, traces


def is_nikhilam_suitable(num1_str, num2_str):
    """
    Checks if Nikhilam multiplication is suitable for the given numbers.
    Suitable if they are close to the same power of 10.
    """
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    try:
        n1 = int(num1_str)
        n2 = int(num2_str)
    except ValueError:
        return False
        
    if n1 <= 10 or n2 <= 10:
        return False
        
    # Find base (power of 10)
    d = max(len(num1_str), len(num2_str))
    base = 10 ** d
    
    # Deviations from base
    d1 = abs(n1 - base)
    d2 = abs(n2 - base)
    
    # Let's say if both are within 20% of the base, then Nikhilam is highly suitable
    threshold = base // 5
    return d1 < threshold and d2 < threshold


def nikhilam_multiply(num1_str, num2_str):
    """
    Performs Nikhilam multiplication (All from 9 and last from 10).
    Best for numbers close to a base (power of 10).
    
    Args:
        num1_str (str): First number.
        num2_str (str): Second number.
        
    Returns:
        tuple: (result_str, ops_dict, trace_dict)
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    n1 = int(num1_str)
    n2 = int(num2_str)
    
    d = max(len(num1_str), len(num2_str))
    base = 10 ** d
    
    # Deviations
    d1 = n1 - base
    d2 = n2 - base
    
    ops["additions"] += 2  # n1 - base and n2 - base
    
    # Left part of result: A + D2
    left_part = n1 + d2
    ops["additions"] += 1
    
    # Right part of result: D1 * D2
    # In Nikhilam, the multiplication of deviations is simple since they are small.
    right_part = d1 * d2
    ops["multiplications"] += 1
    ops["writes"] += 1
    
    # Combined: left_part * base + right_part
    result = left_part * base + right_part
    ops["additions"] += 1
    ops["writes"] += 1
    
    result_str = str(result)
    
    trace = {
        "base": base,
        "d": d,
        "num1": n1,
        "num2": n2,
        "deviation1": d1,
        "deviation2": d2,
        "left_part": left_part,
        "right_part": right_part,
        "formula": f"({n1} + ({d2})) * {base} + ({d1} * {d2})"
    }
    
    return result_str, ops, trace


def is_ekadhikena_suitable(num1_str, num2_str):
    """
    Checks suitability for Ekadhikena Purvena:
    Last digits sum to 10 and all preceding digits are identical.
    """
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    if len(num1_str) != len(num2_str) or len(num1_str) < 2:
        return False
        
    prefix1 = num1_str[:-1]
    prefix2 = num2_str[:-1]
    if prefix1 != prefix2:
        return False
        
    try:
        last1 = int(num1_str[-1])
        last2 = int(num2_str[-1])
        return (last1 + last2) == 10
    except ValueError:
        return False


def ekadhikena_multiply(num1_str, num2_str):
    """
    Performs Ekadhikena Purvena multiplication.
    Prefix * (Prefix + 1) | Product of last digits.
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    prefix_str = num1_str[:-1]
    prefix = int(prefix_str)
    
    last1 = int(num1_str[-1])
    last2 = int(num2_str[-1])
    
    # Left part: prefix * (prefix + 1)
    prefix_plus_1 = prefix + 1
    left_part = prefix * prefix_plus_1
    ops["additions"] += 1
    ops["multiplications"] += 1
    ops["writes"] += 1
    
    # Right part: last1 * last2
    right_part = last1 * last2
    ops["multiplications"] += 1
    ops["writes"] += 1
    
    # Combined (pad right part to 2 digits since single digits sum to 10)
    right_part_str = str(right_part).zfill(2)
    result_str = f"{left_part}{right_part_str}"
    ops["writes"] += 1
    
    trace = {
        "prefix": prefix,
        "last1": last1,
        "last2": last2,
        "left_part": left_part,
        "right_part": right_part,
        "right_part_str": right_part_str,
        "formula": f"{prefix} * ({prefix} + 1) | {last1} * {last2}"
    }
    
    return result_str, ops, trace


def is_ekanyunena_suitable(num1_str, num2_str):
    """
    Checks suitability for Ekanyunena Purvena:
    One of the numbers consists entirely of the digit 9, and the other number has length <= that number.
    """
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    if not num1_str.isdigit() or not num2_str.isdigit():
        return False
    if len(num1_str) == 0 or len(num2_str) == 0:
        return False
        
    all_9_1 = all(c == '9' for c in num1_str)
    all_9_2 = all(c == '9' for c in num2_str)
    
    if all_9_1 and len(num2_str) <= len(num1_str):
        return True
    if all_9_2 and len(num1_str) <= len(num2_str):
        return True
        
    return False


def ekanyunena_multiply(num1_str, num2_str):
    """
    Performs Ekanyunena Purvena multiplication.
    (A - 1) | (999... - (A - 1))
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    # Determine which is the 9s multiplier
    if all(c == '9' for c in num2_str) and len(num1_str) <= len(num2_str):
        a_str = num1_str
        n9_str = num2_str
    else:
        a_str = num2_str
        n9_str = num1_str
        
    a = int(a_str)
    n9 = int(n9_str)
    len_9 = len(n9_str)
    
    # Pad input A to match length of 9s multiplier
    a_padded = a_str.zfill(len_9)
    a_val = int(a_padded)
    
    # Left part: A - 1
    left_part = a_val - 1
    ops["additions"] += 1
    ops["writes"] += 1
    
    # Right part: 999... - Left part
    right_part = n9 - left_part
    ops["additions"] += 1
    ops["writes"] += 1
    
    # Combine
    result = left_part * (10 ** len_9) + right_part
    result_str = str(result)
    ops["additions"] += 1 # shift/add
    ops["writes"] += 1
    
    trace = {
        "a": a,
        "n9": n9,
        "len_9": len_9,
        "left_part": left_part,
        "right_part": right_part,
        "formula": f"({a} - 1) * 10^{len_9} + ({n9} - ({a} - 1))"
    }
    
    return result_str, ops, trace


def kapatasandhi_multiply(num1_str, num2_str):
    """
    Performs Kapatasandhi (Lattice) multiplication, an ancient Indian method.
    Popularized by Aryabhata and Sridharacharya.
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    if num1_str == "0" or num2_str == "0":
        return "0", {"multiplications": 0, "additions": 0, "writes": 1}, {}
        
    a = [int(x) for x in num1_str]
    b = [int(x) for x in num2_str]
    len_a, len_b = len(a), len(b)
    
    # Create the grid
    grid = [[(0, 0)] * len_b for _ in range(len_a)]
    
    for i in range(len_a):
        for j in range(len_b):
            prod = a[i] * b[j]
            grid[i][j] = (prod // 10, prod % 10)
            ops["multiplications"] += 1
            ops["writes"] += 2  # writing tens and units digit to cell
            
    # Accumulate cell products into diagonals
    # Diagonal indices run from 0 to len_a + len_b - 1
    diag_vals = [0] * (len_a + len_b)
    for i in range(len_a):
        for j in range(len_b):
            tens, units = grid[i][j]
            diag_vals[i + j] += tens
            diag_vals[i + j + 1] += units
            ops["additions"] += 2
            
    # Carry propagation from right to left
    carry = 0
    final_digits = []
    
    for d_val in reversed(diag_vals):
        total = d_val + carry
        if carry > 0:
            ops["additions"] += 1
        final_digits.append(total % 10)
        carry = total // 10
        ops["writes"] += 1
        
    while carry > 0:
        final_digits.append(carry % 10)
        carry = carry // 10
        ops["writes"] += 1
        
    result_str = "".join(str(d) for d in reversed(final_digits))
    result_str = result_str.lstrip('0')
    if not result_str:
        result_str = '0'
        
    trace = {
        "num1": num1_str,
        "num2": num2_str,
        "grid": grid,
        "diag_vals": diag_vals,
        "result_digits": list(reversed(final_digits)),
        "formula": "Lattice Grid Diagonal Addition (Kapatasandhi)"
    }
    
    return result_str, ops, trace


def khanda_ganita_multiply(num1_str, num2_str):
    """
    Performs Khanda Ganita, Bhaskara II's distributive multiplication method
    from his book Lilavati.
    """
    ops = {"multiplications": 0, "additions": 0, "writes": 0}
    num1_str = num1_str.strip() or "0"
    num2_str = num2_str.strip() or "0"
    
    if num1_str == "0" or num2_str == "0":
        return "0", {"multiplications": 0, "additions": 0, "writes": 1}, {}
        
    a = int(num1_str)
    b_digits = [int(x) for x in reversed(num2_str)] # LSB first
    
    total = 0
    parts = []
    
    for j, b_digit in enumerate(b_digits):
        if b_digit == 0:
            continue
            
        # Place value multiplier
        place_value = 10 ** j
        
        # Intermediate product: A * b_digit
        prod = a * b_digit
        ops["multiplications"] += len(num1_str)
        ops["writes"] += 1
        
        # Shifted product
        shifted_prod = prod * place_value
        parts.append({
            "digit": b_digit,
            "place": place_value,
            "product": prod,
            "shifted_product": shifted_prod
        })
        
        # Add to total
        total += shifted_prod
        if j > 0:
            ops["additions"] += len(str(total))
        ops["writes"] += 1
        
    result_str = str(total)
    
    trace = {
        "num1": num1_str,
        "num2": num2_str,
        "parts": parts,
        "result": total,
        "formula": f"Sum of {num1_str} multiplied by place-value digits of {num2_str}"
    }
    
    return result_str, ops, trace
