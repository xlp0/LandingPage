import json

def arithmetic(context):
    """
    Perform arithmetic based on context.
    Expects context to be a dict with:
    - value: number (the starting value)
    - op: string ('add', 'sub', 'mul', 'div')
    - operand: number (the value to operate with)
    """
    # import sys
    # print(f"DEBUG: context={context}, type={type(context)}", file=sys.stderr)

    # If context is bytes (from PythonRuntime), decode it
    if isinstance(context, bytes):
        try:
            context = json.loads(context.decode('utf-8'))
        except:
            pass

    # If context is a string, try to parse it
    if isinstance(context, str):
        try:
            context = json.loads(context)
        except:
            pass

    if not isinstance(context, dict):
        # Allow passing value directly if params are not merged (though loader merges them)
        return {"error": f"Invalid input, expected dictionary, got {type(context)}"}

    # Handle value from 'value' key or maybe '_given' if we modify loader?
    # For now assume updated CLM passes 'value' in params.
    value = context.get('value')
    
    # Try to find value from other keys or defaults?
    if value is None and 'input' in context:
        value = context['input']

    op = context.get('op')
    operand = context.get('operand')

    if value is None:
         return {"error": "Missing 'value' in input"}
    
    try:
        value = float(value)
        if operand is not None:
            operand = float(operand)
    except ValueError:
        return {"error": "Value or operand must be numbers"}

    if op == 'add':
        return value + operand
    elif op == 'sub':
        return value - operand
    elif op == 'mul':
        return value * operand
    elif op == 'div':
        if operand == 0:
            return {"error": "Division by zero"}
        return value / operand
    else:
        return {"error": f"Unknown operation: {op}"}
