import json
import math


def calculate(context):
    """Complex arithmetic calculator with multiple operations."""
    
    # Debug
    # print(f"DEBUG: context={context}, type={type(context)}", file=sys.stderr)

    # 1. Parse context/input
    if isinstance(context, bytes):
        try: context = context.decode('utf-8')
        except: pass
    
    if isinstance(context, str):
        try: context = json.loads(context)
        except: pass

    # Defaults
    op = 'power'
    params = {}
    value = 0
    
    if isinstance(context, dict):
        op = context.get('operation', context.get('op', 'power'))
        
        # Helper to get value
        val = context.get('value')
        if val is None:
            val = context.get('__input_content__') # From CLMLoader preservation
        
        value = val if val is not None else 0
        
        # params - since loader merges params into context, context IS params
        params = context
    else:
        # Primitive value input
        value = context
    
    # 2. Parse value to float
    try:
        if isinstance(value, bytes):
            value = value.decode('utf-8')
        x = float(value)
    except:
        return "Error: Invalid input value"
        
    try:
        if op == 'power':
            # x^n where n is the exponent
            # Check params for 'exponent'
            exponent = params.get('exponent', 2)
            result = x ** float(exponent)
        
        elif op == 'sqrt':
            # nth root of x
            n = params.get('n', 2)
            n = float(n)
            if x < 0 and n % 2 == 0:
                return "Error: Cannot compute even root of negative number"
            result = x ** (1/n)
        
        elif op == 'log':
            # logarithm of x with given base
            base = params.get('base', math.e)
            base = float(base)
            if x <= 0:
                return "Error: Logarithm undefined for non-positive numbers"
            result = math.log(x) / math.log(base)
        
        elif op == 'compound_interest':
            # A = P(1 + r/n)^(nt)
            rate = float(params.get('rate', 0.05))
            n = float(params.get('periods_per_year', 12))
            t = float(params.get('years', 1))
            result = x * ((1 + rate/n) ** (n * t))
        
        elif op == 'quadratic':
            # Solve ax^2 + bx + c = 0
            a = x
            b = float(params.get('b', 0))
            c = float(params.get('c', 0))
            discriminant = b**2 - 4*a*c
            if discriminant < 0:
                return {"discriminant": discriminant, "roots": "complex", "real_count": 0}
            elif discriminant == 0:
                root = -b / (2*a)
                return {"discriminant": discriminant, "roots": [root], "real_count": 1}
            else:
                root1 = (-b + math.sqrt(discriminant)) / (2*a)
                root2 = (-b - math.sqrt(discriminant)) / (2*a)
                return {"discriminant": discriminant, "roots": [root1, root2], "real_count": 2}
        
        elif op == 'geometric_mean':
            values = [x] + params.get('values', [])
            n = len(values)
            product = 1
            for v in values:
                v = float(v)
                if v < 0:
                    return "Error: Geometric mean undefined for negative numbers"
                product *= v
            result = product ** (1/n)
        
        elif op == 'harmonic_mean':
            values = [x] + params.get('values', [])
            n = len(values)
            if any(float(v) == 0 for v in values):
                return "Error: Harmonic mean undefined when any value is zero"
            reciprocal_sum = sum(1/float(v) for v in values)
            result = n / reciprocal_sum
        
        elif op == 'taylor_exp':
            terms = int(params.get('terms', 10))
            result = sum(x**n / math.factorial(n) for n in range(terms))
        
        else:
            return f"Error: Unknown operation '{op}'"
        
        # Round to avoid floating point precision issues
        if isinstance(result, float):
            result = round(result, 10)
        return result
        
    except Exception as e:
        return f"Error: {str(e)}"
