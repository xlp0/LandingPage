#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Struct to hold Chebyshev coefficients
typedef struct {
    int terms;
    double *coeffs;
} SineChebyshev;

// Compute coefficients
void init_chebyshev(SineChebyshev *sc, int N) {
    sc->terms = N;
    sc->coeffs = (double *)malloc(N * sizeof(double));
    
    // Precompute nodes
    double *nodes = (double *)malloc(N * sizeof(double));
    for (int j = 0; j < N; j++) {
        nodes[j] = cos(M_PI * (2.0 * j + 1.0) / (2.0 * N));
    }
    
    for (int k = 0; k < N; k++) {
        double sum = 0.0;
        for (int j = 0; j < N; j++) {
            double u_j = nodes[j];
            double f_val = sin(u_j * M_PI);
            double t_val = cos(k * M_PI * (2.0 * j + 1.0) / (2.0 * N));
            sum += f_val * t_val;
        }
        sc->coeffs[k] = (2.0 / N) * sum;
    }
    
    free(nodes);
}

// Calculate sin(x)
double calculate_chebyshev(SineChebyshev *sc, double x) {
    // 1. Range reduction to [-pi, pi]
    x = fmod(x, 2.0 * M_PI);
    if (x > M_PI) {
        x -= 2.0 * M_PI;
    }
    // fmod can return negative if input is negative, depends on C standard/imp.
    // Python % computes positive remainder for positive divisor (usually).
    // fmod(-5.5, 2PI) might be -5.5.
    // Let's normalize strictly to [-pi, pi].
    // Actually, handling general modulo with M_PI offset:
    
    // Normalize to [0, 2PI) first
    while (x < 0) x += 2.0 * M_PI;
    while (x >= 2.0 * M_PI) x -= 2.0 * M_PI;
    
    // Map to [-PI, PI]
    if (x > M_PI) x -= 2.0 * M_PI;

    // 2. Map to u in [-1, 1]
    double u = x / M_PI;
    
    // 3. Clenshaw
    double b2 = 0.0;
    double b1 = 0.0;
    double b0 = 0.0;
    double y = 2.0 * u;
    
    for (int k = sc->terms - 1; k > 0; k--) {
        b0 = sc->coeffs[k] + y * b1 - b2;
        b2 = b1;
        b1 = b0;
    }
    
    return 0.5 * sc->coeffs[0] + u * b1 - b2;
}

int main(int argc, char *argv[]) {
    // Usage: ./sine_chebyshev_c [iterations]
    // If iterations is provided, run benchmark loop.
    // Otherwise, accept input arguments for logic (single execution).
    
    // For this benchmark task, we assume the binary is called with an iteration count
    // to perform the tight-loop timing internally.
    
    int iterations = 0;
    if (argc > 1) {
        iterations = atoi(argv[1]);
    }
    
    // Logic for single execution (CLM mode)
    // If iterations is 0 or less, we might be in "logic" mode reading from arg 2?
    // But the request is to "compare performance in CLM". 
    // Usually CLM calls a script/binary once per input in "custom" mode.
    // But for benchmark, we want to run N times.
    
    SineChebyshev sc;
    init_chebyshev(&sc, 20); // 20 terms
    
    if (iterations > 0) {
        // Benchmark Mode
        double test_angles[] = {
            0.0, 
            M_PI/6.0, 
            M_PI/4.0, 
            M_PI/2.0, 
            M_PI, 
            3.0*M_PI/2.0, 
            2.0*M_PI,
            10.5,
            -5.5,
            100.0
        };
        int num_angles = sizeof(test_angles) / sizeof(double);
        
        volatile double dummy = 0; // Prevent optimization
        
        // Timer
        clock_t start = clock();
        
        for (int i = 0; i < iterations; i++) {
            for (int k = 0; k < num_angles; k++) {
                 dummy += calculate_chebyshev(&sc, test_angles[k]);
            }
        }
        
        clock_t end = clock();
        double total_time_sec = (double)(end - start) / CLOCKS_PER_SEC;
        double ns_per_op = (total_time_sec * 1e9) / ((double)iterations * num_angles);
        
        // Output JSON result for benchmark script
        printf("{\"total_time_sec\": %.6f, \"ns_per_op\": %.2f}", total_time_sec, ns_per_op);
        
    } else {
        // Single One-Shot Mode (Optional, for correctness checks)
        // Assume argv[1] is input number if not "benchmark"
        // But argv[1] is iterations for our convention.
        // Let's just output usage if no args, or calculation if 2 args.
        if (argc > 2) {
             double input = atof(argv[2]);
             printf("%.15f", calculate_chebyshev(&sc, input));
        }
    }
    
    free(sc.coeffs);
    return 0;
}
