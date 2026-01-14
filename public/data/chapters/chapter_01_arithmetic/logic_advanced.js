

// Read context from input
// The runtime wrapper injects 'input' variable containing {target, context}

if (context.batch) {
    result = (context.examples || []).map(ex => {
        const op = ex.op || "add";
        const a = ex.a || 0;
        const b = ex.b || 0;
        if (op === "add") return a + b;
        if (op === "mul") return a * b;
        if (op === "sin") return Math.sin(a);
        if (op === "cos") return Math.cos(a);
        return 0;
    });
} else {
    // Single execution
    const op = context.op || "add";
    const a = context.a || 0;
    const b = context.b || 0;

    if (op === "add") {
        result = a + b;
    } else if (op === "mul") {
        result = a * b;
    } else if (op === "sin") {
        result = Math.sin(a);
    } else if (op === "cos") {
        result = Math.cos(a);
    }
}

// Result is captured by the wrapper
