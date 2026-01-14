# Sine Function Benchmarks

This directory contains implementations and benchmarks comparing different algorithms for computing the sine function.

## Implementations

| File | Language | Algorithm | Description |
|------|----------|-----------|-------------|
| `sine_taylor.py` | Python | Taylor Series | Classical power series expansion around 0 |
| `sine_chebyshev.py` | Python | Chebyshev Series | Minimax approximation using Chebyshev polynomials |
| `sine_chebyshev.c` | C | Chebyshev Series | High-performance native implementation |
| `sine_chebyshev.rs` | Rust | Chebyshev Series | Safe systems-level implementation |

## Benchmark CLM

The benchmark is defined in `sine_comparison.yaml` and orchestrated by `sine_benchmark.py`.

### Running the Benchmark

```bash
# Via PTR CLI
uv run python -m mcard.ptr.cli run chapters/chapter_01_arithmetic/sine/sine_comparison.yaml

# Via pytest
uv run pytest tests/ptr/test_arithmetic_clm.py::test_sine_comparison_clm -v
```

### Sample Results

```
--- Sine Benchmark Results ---
Iterations: 50000 x 10 angles
Math.sin (C-Ext): ~34 ns/op
Taylor   (Py):    ~1200 ns/op
Cheby    (Py):    ~1070 ns/op
Cheby    (C):     ~7 ns/op   ⬅ Fastest
Cheby    (Rust):  ~16 ns/op
Winner: chebyshev_c
```

## Key Insights

1. **Native C Chebyshev** beats even Python's `math.sin` (which wraps libm) due to zero interpreter overhead.
2. **Rust Chebyshev** is within 2x of C, demonstrating Rust's zero-cost abstractions.
3. **Pure Python** implementations are ~30-40x slower than native, as expected for interpreted code.
4. **Chebyshev vs Taylor**: For the same number of terms, Chebyshev provides more uniform error distribution (minimax property).

## Algorithm Details

### Taylor Series
Classic expansion: `sin(x) = x - x³/3! + x⁵/5! - ...`
- Pros: Simple, educational
- Cons: Error grows rapidly away from x=0, needs range reduction

### Chebyshev Series
Uses Chebyshev polynomials of the first kind with Clenshaw's recurrence:
- Coefficients computed via Discrete Chebyshev Transform (DCT)
- Evaluation via Clenshaw algorithm: O(n) time, O(1) space
- Pros: Uniform error distribution, fewer terms needed for same accuracy
- Cons: Slightly more complex coefficient computation

## Files

- `sine_comparison.yaml` - CLM definition for the benchmark
- `sine_benchmark.py` - Benchmark orchestration logic (imports all implementations)
- `sine_taylor.py` - Taylor series implementation
- `sine_chebyshev.py` - Python Chebyshev implementation
- `sine_chebyshev.c` - C implementation (compiled to `bin/sine_chebyshev_c`)
- `sine_chebyshev.rs` - Rust implementation (compiled to `bin/sine_chebyshev_rs`)
- `python_sine.clm` - Legacy single-runtime sine CLM
