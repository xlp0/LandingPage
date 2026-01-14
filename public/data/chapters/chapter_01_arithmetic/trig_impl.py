import math
import json


def parse_input(x):
    if isinstance(x, bytes):
        try:
            x = x.decode('utf-8')
        except:
            pass
    if isinstance(x, str):
        try:
            # Check if it looks like json dict or just number
            if x.strip().startswith('{'):
                d = json.loads(x)
                # If dict, try to find angle or value
                if isinstance(d, dict):
                    return float(d.get('angle', d.get('value', 0)))
            else:
                return float(x)
        except:
            pass
    # If dict (from loader merging)
    if isinstance(x, dict):
        return float(x.get('angle', x.get('value', x.get('__input_content__', 0))))
        
    return float(x)

def custom_sin(x):
    """Calculate sine of x (radians)."""
    return math.sin(parse_input(x))

def custom_cos(x):
    """Calculate cosine of x (radians)."""
    return math.cos(parse_input(x))

def custom_tan(x):
    """Calculate tangent of x (radians)."""
    return math.tan(parse_input(x))

def custom_cot(x):
    """Calculate cotangent of x (radians)."""
    val = math.tan(parse_input(x))
    if abs(val) < 1e-15: return float('inf')
    return 1.0 / val

def custom_sec(x):
    """Calculate secant of x (radians)."""
    val = math.cos(parse_input(x))
    if abs(val) < 1e-15: return float('inf')
    return 1.0 / val

def custom_csc(x):
    """Calculate cosecant of x (radians)."""
    parsed = parse_input(x)
    val = math.sin(parsed)
    if abs(val) < 1e-15: return float('inf')
    return 1.0 / val
