"""
Arithmetic Logic for Python Runtime.
Context is injected into the global scope by the runtime.
"""

def add(target_content):
    """
    Compute sum of 'a' and 'b' from context.
    """
    # 'context' is available in the global scope
    a = context.get("a", 0)
    b = context.get("b", 0)
    return a + b

def multiply(target_content):
    """
    Compute product of 'a' and 'b' from context.
    """
    a = context.get("a", 1)
    b = context.get("b", 1)
    return a * b
