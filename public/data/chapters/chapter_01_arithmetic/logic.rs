use std::env;
use std::io::{self, Read};

fn get_int_from_json(json: &str, key: &str) -> i64 {
    // Look for key at top level? Hard with naive parser.
    // We will rely on the caller to pass a clean context.
    let key_pattern = format!("\"{}\":", key);
    // Use rfind to get the last occurrence (active context) instead of the first (history)
    if let Some(pos) = json.rfind(&key_pattern) {
        let start = pos + key_pattern.len();
        let rest = &json[start..];
        let end = rest.find(|c: char| !c.is_numeric() && c != ' ' && c != '-').unwrap_or(rest.len());
        let num_str = &rest[..end].trim();
        return num_str.parse().unwrap_or(0);
    }
    0
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let context_str = if args.len() > 1 { &args[1] } else { "{}" };
    
    // Debug output to stderr if needed
    // eprintln!("Context: {}", context_str);

    let a = get_int_from_json(context_str, "a");
    let b = get_int_from_json(context_str, "b");
    let sum = a + b;
    print!("{}", sum);
}
