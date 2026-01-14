"""
Sine function implementation using Taylor Series expansion.
"""
import math

def sine_taylor(x, terms=20):
    """
    Calculate sine(x) using Taylor series expansion:
    sin(x) = x - x^3/3! + x^5/5! - x^7/7! + ...
    
    Args:
        x: Angle in radians
        terms: Number of terms in the series (default 20 for high precision)
        
    Returns:
        Approximated sine value
    """
    # Normalize x to [-pi, pi] for better convergence
    # First reduce to [0, 2*pi]
    x = x % (2 * math.pi)
    # Then shift to [-pi, pi]
    if x > math.pi:
        x -= 2 * math.pi
        
    sine_val = 0.0
    power = x
    factorial_inv = 1.0 # 1/n!
    
    # Optimization: Iteratively update power and factorial
    # term_0 = x / 1!
    # term_n = term_{n-1} * (-1) * x^2 / ((2n)*(2n+1))
    
    current_term = x
    sine_val = current_term
    
    x_squared = x * x
    
    for n in range(1, terms):
        # Update current_term for the next degree (2n+1)
        # Previous degree was (2(n-1)+1) = 2n-1
        # We multiply by -x^2
        # We divide by (2n)*(2n+1)
        
        current_term *= -x_squared / ((2 * n) * (2 * n + 1))
        sine_val += current_term
        
    return sine_val
