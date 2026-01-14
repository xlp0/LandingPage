use std::env;

fn parse_value(s: &str, key: &str) -> f64 {
    // Find "key": value
    let search = format!("\"{}\"", key);
    if let Some(pos) = s.find(&search) {
        let rest = &s[pos + search.len()..];
        if let Some(colon) = rest.find(':') {
            let rest_val = &rest[colon + 1..].trim_start();
            // take while numeric or . or - or e
            let end_idx = rest_val.find(|c: char| !c.is_numeric() && c != '.' && c != '-' && c != 'e' && c != '+').unwrap_or(rest_val.len());
            let val_str = &rest_val[..end_idx].trim();
            if let Ok(v) = val_str.parse::<f64>() {
                return v;
            }
        }
    }
    0.0
}

fn parse_string(s: &str, key: &str) -> String {
    let search = format!("\"{}\"", key);
    if let Some(pos) = s.find(&search) {
        let rest = &s[pos + search.len()..];
        if let Some(colon) = rest.find(':') {
            let rest_val = &rest[colon + 1..].trim_start();
            if rest_val.starts_with('"') {
                let content = &rest_val[1..];
                if let Some(end) = content.find('"') {
                    return content[..end].to_string();
                }
            }
        }
    }
    "add".to_string()
}

fn process_op(op: &str, a: f64, b: f64) -> f64 {
    match op {
        "add" => a + b,
        "mul" => a * b,
        "sin" => a.sin(),
        "cos" => a.cos(),
        _ => 0.0,
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let binding = String::from("{}");
    let input = if args.len() > 1 { &args[1] } else { &binding };

    // Check for batch
    if input.contains("\"batch\": true") || input.contains("\"batch\":true") {
        print!("[");
        // Naive split by "op" to find items, trusting flat structure
        // "examples": [ {...}, {...} ]
        let parts: Vec<&str> = input.split("op\"").collect();
        // Skip first part (pre-"op")
        for i in 1..parts.len() {
             let part = parts[i];
             // Reconstruct local context roughly
             // part starts after "op"
             // Parse op value immediately following
             let op_rest = part.trim_start().trim_start_matches(':').trim_start();
             let op = if op_rest.starts_with('"') {
                 let content = &op_rest[1..];
                 if let Some(end) = content.find('"') {
                     &content[..end]
                 } else { "add" }
             } else { "add" };
             
             let a = parse_value(part, "a");
             let b = parse_value(part, "b");
             
             let res = process_op(op, a, b);
             if i > 1 { print!(","); }
             print!("{}", res);
        }
        print!("]");
    } else {
        let op = parse_string(input, "op");
        let a = parse_value(input, "a");
        let b = parse_value(input, "b");
        
        let res = process_op(&op, a, b);
        print!("{}", res);
    }
}
