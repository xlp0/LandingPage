"""
Benchmark logic comparing math.sin vs sine_taylor vs sine_fourier_chebyshev vs C vs Rust.
"""
import time
import math
import subprocess
import json
import os
from typing import Any, Dict
from mcard.ptr.core.clm_template import NarrativeMonad, IO
from chapters.chapter_01_arithmetic.sine.sine_taylor import sine_taylor
from chapters.chapter_01_arithmetic.sine.sine_chebyshev import sine_fourier_chebyshev

def sine_benchmark_logic(_: Any) -> NarrativeMonad:
    """
    Executes benchmark of Sine implementations.
    """
    context_monad = NarrativeMonad.get_context()
    
    def run_benchmark(ctx: Dict) -> NarrativeMonad:
        # Configuration
        iterations = ctx.get("iterations", 50000) # Default decreased slightly for safety
        
        # Test angles: common values + some edge cases
        test_angles = [
            0.0, 
            math.pi/6, 
            math.pi/4, 
            math.pi/2, 
            math.pi, 
            3*math.pi/2, 
            2*math.pi,
            10.5,   # > 2pi
            -5.5,   # negative
            100.0   # large
        ]

        def execute_comparison() -> Dict[str, Any]:
            results = {
                "math_sin": {},
                "taylor_sin": {},
                "chebyshev_sin": {},
                "chebyshev_c": {},
                "chebyshev_rs": {},
                "accuracy_check": [],
                "iterations": iterations,
                "dataset_size": len(test_angles)
            }

            # Warmup python functions
            for a in test_angles:
                _ = math.sin(a)
                _ = sine_taylor(a)
                _ = sine_fourier_chebyshev(a)

            # 1. Benchmark math.sin
            start_ns = time.time_ns()
            for _ in range(iterations):
                for angle in test_angles:
                    _ = math.sin(angle)
            end_ns = time.time_ns()
            
            total_ns = end_ns - start_ns
            results["math_sin"]["total_time_ms"] = total_ns / 1_000_000
            results["math_sin"]["avg_time_ns"] = total_ns / (iterations * len(test_angles))

            # 2. Benchmark sine_taylor (Python)
            start_ns = time.time_ns()
            for _ in range(iterations):
                for angle in test_angles:
                    _ = sine_taylor(angle)
            end_ns = time.time_ns()
            
            total_ns = end_ns - start_ns
            results["taylor_sin"]["total_time_ms"] = total_ns / 1_000_000
            results["taylor_sin"]["avg_time_ns"] = total_ns / (iterations * len(test_angles))
            
            # 3. Benchmark sine_chebyshev (Python)
            start_ns = time.time_ns()
            for _ in range(iterations):
                for angle in test_angles:
                    _ = sine_fourier_chebyshev(angle)
            end_ns = time.time_ns()
            
            total_ns = end_ns - start_ns
            results["chebyshev_sin"]["total_time_ms"] = total_ns / 1_000_000
            results["chebyshev_sin"]["avg_time_ns"] = total_ns / (iterations * len(test_angles))

            # 4. Benchmark C Implementation
            c_bin = "chapters/chapter_01_arithmetic/bin/sine_chebyshev_c"
            if os.path.exists(c_bin):
                try:
                    # Capture JSON output from C binary
                    proc = subprocess.run([c_bin, str(iterations)], capture_output=True, text=True, check=True)
                    c_res = json.loads(proc.stdout)
                    results["chebyshev_c"]["total_time_ms"] = c_res["total_time_sec"] * 1000.0
                    results["chebyshev_c"]["avg_time_ns"] = c_res["ns_per_op"]
                except Exception as e:
                    results["chebyshev_c"]["error"] = str(e)
                    results["chebyshev_c"]["avg_time_ns"] = 999999.0
            else:
                 results["chebyshev_c"]["error"] = "Binary not found"
                 results["chebyshev_c"]["avg_time_ns"] = 999999.0

            # 5. Benchmark Rust Implementation
            rs_bin = "chapters/chapter_01_arithmetic/bin/sine_chebyshev_rs"
            if os.path.exists(rs_bin):
                try:
                    proc = subprocess.run([rs_bin, str(iterations)], capture_output=True, text=True, check=True)
                    rs_res = json.loads(proc.stdout)
                    results["chebyshev_rs"]["total_time_ms"] = rs_res["total_time_sec"] * 1000.0
                    results["chebyshev_rs"]["avg_time_ns"] = rs_res["ns_per_op"]
                except Exception as e:
                    results["chebyshev_rs"]["error"] = str(e)
                    results["chebyshev_rs"]["avg_time_ns"] = 999999.0
            else:
                 results["chebyshev_rs"]["error"] = "Binary not found"
                 results["chebyshev_rs"]["avg_time_ns"] = 999999.0
            
            # Accuracy Check (Only Python impls checked here, C/Rs verified implicitly by design or usually separately)
            max_diff_taylor = 0.0
            max_diff_cheby = 0.0
            for angle in test_angles:
                m_val = math.sin(angle)
                t_val = sine_taylor(angle)
                c_val = sine_fourier_chebyshev(angle)
                
                d_t = abs(m_val - t_val)
                d_c = abs(m_val - c_val)
                
                if d_t > max_diff_taylor: max_diff_taylor = d_t
                if d_c > max_diff_cheby: max_diff_cheby = d_c
            
            results["max_error_taylor"] = max_diff_taylor
            results["max_error_cheby"] = max_diff_cheby
            
            # Determine winner
            times = {
                "math.sin": results["math_sin"]["avg_time_ns"],
                "taylor": results["taylor_sin"]["avg_time_ns"],
                "chebyshev": results["chebyshev_sin"]["avg_time_ns"],
                "chebyshev_c": results["chebyshev_c"]["avg_time_ns"],
                "chebyshev_rs": results["chebyshev_rs"]["avg_time_ns"]
            }
            results["winner"] = min(times, key=times.get)
            
            return results

        io_action = NarrativeMonad.lift_io(IO(execute_comparison))
        
        return io_action.bind(lambda report: NarrativeMonad.log(
            f"--- Sine Benchmark Results ---\n"
            f"Iterations: {report['iterations']} x {report['dataset_size']} angles\n"
            f"Math.sin (C-Ext): {report['math_sin']['avg_time_ns']:.2f} ns/op\n"
            f"Taylor   (Py):    {report['taylor_sin']['avg_time_ns']:.2f} ns/op\n"
            f"Cheby    (Py):    {report['chebyshev_sin']['avg_time_ns']:.2f} ns/op\n"
            f"Cheby    (C):     {report['chebyshev_c']['avg_time_ns']:.2f} ns/op\n"
            f"Cheby    (Rust):  {report['chebyshev_rs']['avg_time_ns']:.2f} ns/op\n"
            f"Winner:  {report['winner']}\n"
        ).bind(lambda _: NarrativeMonad.unit(report)))

    return context_monad.bind(run_benchmark)
