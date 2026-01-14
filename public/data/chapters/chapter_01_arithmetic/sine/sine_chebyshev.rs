use std::f64::consts::PI;
use std::env;
use std::time::Instant;

struct SineChebyshev {
    terms: usize,
    coeffs: Vec<f64>,
}

impl SineChebyshev {
    fn new(terms: usize) -> Self {
        let mut coeffs = vec![0.0; terms];
        
        // Precompute nodes
        let mut nodes = vec![0.0; terms];
        for j in 0..terms {
            nodes[j] = (PI * (2.0 * (j as f64) + 1.0) / (2.0 * (terms as f64))).cos();
        }
        
        for k in 0..terms {
            let mut sum_val = 0.0;
            for j in 0..terms {
                let u_j = nodes[j];
                let f_val = (u_j * PI).sin();
                let t_val = (k as f64 * PI * (2.0 * (j as f64) + 1.0) / (2.0 * (terms as f64))).cos();
                sum_val += f_val * t_val;
            }
            coeffs[k] = (2.0 / (terms as f64)) * sum_val;
        }
        
        SineChebyshev { terms, coeffs }
    }
    
    fn calculate(&self, mut x: f64) -> f64 {
        // 1. Range reduction
        // Normalize to [0, 2PI)
        while x < 0.0 { x += 2.0 * PI; }
        while x >= 2.0 * PI { x -= 2.0 * PI; }
        
        // Map to [-PI, PI]
        if x > PI { x -= 2.0 * PI; }
        
        // 2. Map to u in [-1, 1]
        let u = x / PI;
        
        // 3. Clenshaw
        let mut b2 = 0.0;
        let mut b1 = 0.0;
        let mut b0;
        let y = 2.0 * u;
        
        for k in (1..self.terms).rev() {
            b0 = self.coeffs[k] + y * b1 - b2;
            b2 = b1;
            b1 = b0;
        }
        
        0.5 * self.coeffs[0] + u * b1 - b2
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 {
        if let Ok(iterations) = args[1].parse::<usize>() {
             // Benchmark mode
             let sc = SineChebyshev::new(20);
             let test_angles = [
                0.0, 
                PI/6.0, 
                PI/4.0, 
                PI/2.0, 
                PI, 
                3.0*PI/2.0, 
                2.0*PI,
                10.5,
                -5.5,
                100.0
             ];
             
             let num_angles = test_angles.len();
             
             let start = Instant::now();
             let mut dummy = 0.0;
             
             for _ in 0..iterations {
                 for &angle in test_angles.iter() {
                     dummy += sc.calculate(angle);
                 }
             }
             
             // Prevent optimization
             if dummy == 12345.678 { println!("Magic"); }
             
             let duration = start.elapsed();
             let total_time_sec = duration.as_secs_f64();
             let ns_per_op = (duration.as_nanos() as f64) / ((iterations * num_angles) as f64);
             
             println!("{{\"total_time_sec\": {:.6}, \"ns_per_op\": {:.2}}}", total_time_sec, ns_per_op);
        } else {
            // Logic mode?
            if args.len() > 2 {
                let sc = SineChebyshev::new(20);
                if let Ok(input) = args[2].parse::<f64>() {
                    println!("{}", sc.calculate(input));
                }
            }
        }
    }
}
