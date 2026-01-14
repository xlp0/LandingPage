"""
Advanced Arithmetic Logic for Python Runtime.
Supports add, mul, sin, cos.
"""
import math

def calculate(target_content):
    """
    Compute based on 'op' in context.
    """
    # 'context' is injected into the global scope by the runtime
    global context
    
    try:
        if context.get("batch"):
            results = []
            for ex in context.get("examples", []):
                op = ex.get("op", "add")
                a = ex.get("a", 0)
                b = ex.get("b", 0)
                res = 0
                if op == "add": res = a + b
                elif op == "mul": res = a * b
                elif op == "sin": res = math.sin(a)
                elif op == "cos": res = math.cos(a)
                results.append(res)
            return results

        op = context.get("op", "add")
        a = context.get("a", 0)
        b = context.get("b", 0)
        
        if op == "add":
            return a + b
        elif op == "mul":
            return a * b
        elif op == "sin":
            return math.sin(a)
        elif op == "cos":
            return math.cos(a)
        return 0
    except Exception as e:
        return f"Error in Python: {str(e)}"


