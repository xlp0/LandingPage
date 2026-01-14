// Logic for Addition in JavaScript
// Expects 'context' to be available in scope
// Must define 'result' variable

const a = context.a || 0;
const b = context.b || 0;
const sum = a + b;

// Log evidence (simulated by returning a structured object, 
// though the runtime only captures the final result)
// In a real scenario, we might want to emit logs via a side channel or return them.
// For this demo, we just return the result.

var result = sum;
