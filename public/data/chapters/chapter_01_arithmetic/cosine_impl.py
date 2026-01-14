# Custom Cosine Implementation using Taylor Series
# This script is designed to be embedded in a PCard


import json

def factorial(n):
    if n == 0:
        return 1
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

def custom_cos(x, terms=20):
    """
    Calculate cosine using Maclaurin series:
    cos(x) = 1 - x^2/2! + x^4/4! - x^6/6! + ...
    """
    # Normalize x to range [-2pi, 2pi] for better convergence
    # (Simple normalization, assuming math.pi is available or approx)
    pi_approx = 3.141592653589793
    x = x % (2 * pi_approx)
    
    result = 0
    for n in range(terms):
        term = ((-1) ** n) * (x ** (2 * n)) / factorial(2 * n)
        result += term
    return result


try:
    # print(f"DEBUG_COSINE: target type={type(target)}", file=sys.stderr)
    
    # 'target' is provided by the runtime
    angle = 0.0
    if isinstance(target, bytes):
        angle_str = target.decode('utf-8')
        angle = float(angle_str)
    elif isinstance(target, dict):
        # From when block
        # Check input or given (if passed)
        if 'input' in target:
            angle = float(target['input'])
        elif '__input_content__' in target:
            angle = float(target['__input_content__'])
        else:
             # Fallback if given passed as value?
             pass
    else:
        # String or other
        angle = float(target)
    
    # Calculate cosine
    result = custom_cos(angle)
    
except ValueError:
    result = "Error: Invalid input"
except Exception as e:
    result = f"Error: {str(e)}"
