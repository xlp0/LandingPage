import json
import sys

def string_operations(context):
    """String operations."""
    
    # 1. Parse context/input
    if isinstance(context, bytes):
        try: context = context.decode('utf-8')
        except: pass
    
    if isinstance(context, str):
        try: context = json.loads(context)
        except: pass
        
    text = ""
    func = "unknown"
    
    if isinstance(context, dict):
        text = context.get('text', context.get('__input_content__', ''))
        func = context.get('func', 'unknown')
    else:
        text = str(context)
        
    if func == 'reverse':
        return text[::-1]
    elif func == 'len':
        return len(text)
    elif func == 'upper':
        return text.upper()
    elif func == 'lower':
        return text.lower()
    else:
        # Fallback if just text is passed without func?
        # The CLM seems to require func.
        return f"Error: Unknown function '{func}'"
