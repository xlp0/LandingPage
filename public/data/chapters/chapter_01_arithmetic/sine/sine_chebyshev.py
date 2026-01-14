"""
Sine function implementation using Fourier-Chebyshev Series expansion.

Relation to Fourier Series:
A Chebyshev series expansion of f(x) on [-1, 1] is equivalent to a Fourier Cosine series 
of g(theta) = f(cos(theta)) where x = cos(theta).

This provides a 'minimax' approximation that distributes error uniformly across the interval,
unlike Taylor series which is very accurate at 0 but degrades rapidly away from it.
"""
import math

class SineChebyshev:
    def __init__(self, terms=10):
        """
        Initialize Chebyshev coefficients for sin(x) on range [-pi, pi].
        We map x in [-pi, pi] to u in [-1, 1] via x = u * pi.
        Function to approximate: f(u) = sin(u * pi)
        """
        self.terms = terms
        self.coeffs = self._compute_coeffs(terms)
        
    def _compute_coeffs(self, N):
        """
        Compute coefficients using Discrete Chebyshev Transform (DCT-Type II equivalent).
        c_k = (2/N) * sum_{j=0}^{N-1} f(x_j) * T_k(x_j)
        where x_j are roots of T_N(x).
        """
        coeffs = [0.0] * N
        
        # Precompute roots (Chebyshev nodes)
        nodes = []
        for j in range(N):
            # Roots of T_N(x) are cos( (2j+1)pi / 2N )
            nodes.append(math.cos(math.pi * (2 * j + 1) / (2 * N)))
            
        for k in range(N):
            sum_val = 0.0
            for j in range(N):
                u_j = nodes[j]
                # f(u_j) = sin(u_j * pi)
                f_val = math.sin(u_j * math.pi)
                # T_k(u_j) = cos(k * arccos(u_j)). Since u_j are cos(theta), T_k = cos(k * theta)
                # theta_j = (2j+1)pi / 2N
                t_val = math.cos(k * math.pi * (2 * j + 1) / (2 * N))
                sum_val += f_val * t_val
                
            # Normalization factor: 1/N for c0, 2/N for others. 
            # Note: Standard definition often uses 2/N for all and handles 1/2 in sum formula.
            # We'll use 2/N and divide c0 by 2 later if needed.
            coeffs[k] = (2.0 / N) * sum_val
            
        return coeffs

    def calculate(self, x):
        """
        Calculate sin(x) using Clenshaw's Recurrence Algorithm.
        """
        # 1. Range Reduction to [-pi, pi]
        # sin(x) has period 2pi
        x = x % (2 * math.pi)
        if x > math.pi:
            x -= 2 * math.pi
            
        # 2. Map x in [-pi, pi] to u in [-1, 1]
        # x = u * pi  =>  u = x / pi
        u = x / math.pi
        
        # 3. Clenshaw Evaluation
        # Evaluate sum c_k * T_k(u)
        b2 = 0.0 # b_{k+2}
        b1 = 0.0 # b_{k+1}
        b0 = 0.0 # b_k
        
        # y = 2u
        y = 2.0 * u
        
        # Iterate backwards from N-1 to 1
        for k in range(len(self.coeffs) - 1, 0, -1):
            b0 = self.coeffs[k] + y * b1 - b2
            b2 = b1
            b1 = b0
            
        # Final step for T_0 and T_1
        # f(x) = c_0/2 + u*b1 - b2 + c_0/2 is not quite right.
        # Standard Clenshaw for Chebyshev: 
        # sum = 0.5*c0 + x*b1 - b2   (if c0 defined with factor 2)
        # Here we computed c_k with 2/N.
        # f(u) = 0.5*c_0 + u*b_1 - b_2  (Wait: T_1(u)=u, T_0(u)=1)
        
        return 0.5 * self.coeffs[0] + u * b1 - b2

# Singleton instance for simple import usage
_sine_instance = SineChebyshev(terms=20) # 20 terms for higher precision

def sine_fourier_chebyshev(x):
    return _sine_instance.calculate(x)
