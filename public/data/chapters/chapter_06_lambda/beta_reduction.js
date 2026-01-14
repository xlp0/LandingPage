// Simple Lambda Calculus Interpreter
class LambdaCalc {
    // Parse a lambda expression string
    static parse(expr) {
        expr = expr.trim();

        // Variable (single lowercase letter)
        if (/^[a-z]$/.test(expr)) {
            return { type: 'var', name: expr };
        }

        // Lambda abstraction: \x.body or λx.body 
        const lambdaMatch = expr.match(/^[\\λ]([a-z])\.(.+)$/);
        if (lambdaMatch) {
            return {
                type: 'abs',
                param: lambdaMatch[1],
                body: this.parse(lambdaMatch[2])
            };
        }

        // First try to split at top level for application
        const parts = this.splitApplication(expr);
        if (parts.length === 2) {
            return {
                type: 'app',
                func: this.parse(parts[0]),
                arg: this.parse(parts[1])
            };
        }

        // If wrapped in parens, unwrap and try again
        if (expr.startsWith('(') && expr.endsWith(')') && this.isBalanced(expr.slice(1, -1))) {
            return this.parse(expr.slice(1, -1));
        }

        return { type: 'var', name: expr };
    }

    // Check if parentheses are balanced
    static isBalanced(expr) {
        let depth = 0;
        for (const c of expr) {
            if (c === '(') depth++;
            else if (c === ')') depth--;
            if (depth < 0) return false;
        }
        return depth === 0;
    }

    static splitApplication(expr) {
        let depth = 0;
        let start = 0;
        const parts = [];

        for (let i = 0; i < expr.length; i++) {
            if (expr[i] === '(') depth++;
            else if (expr[i] === ')') depth--;
            else if (expr[i] === ' ' && depth === 0) {
                parts.push(expr.slice(start, i).trim());
                start = i + 1;
            }
        }
        parts.push(expr.slice(start).trim());
        return parts.filter(p => p.length > 0);
    }

    // Substitute variable x with term s in term t
    static substitute(t, x, s) {
        switch (t.type) {
            case 'var':
                return t.name === x ? s : t;
            case 'abs':
                if (t.param === x) return t; // x is bound
                return { type: 'abs', param: t.param, body: this.substitute(t.body, x, s) };
            case 'app':
                return {
                    type: 'app',
                    func: this.substitute(t.func, x, s),
                    arg: this.substitute(t.arg, x, s)
                };
        }
    }

    // Perform one step of beta reduction
    static betaReduce(term) {
        if (term.type === 'app' && term.func.type === 'abs') {
            // This is a redex: (λx.M) N -> M[x:=N]
            return {
                reduced: true,
                term: this.substitute(term.func.body, term.func.param, term.arg)
            };
        }

        // Try to reduce inside
        if (term.type === 'app') {
            const leftResult = this.betaReduce(term.func);
            if (leftResult.reduced) {
                return { reduced: true, term: { type: 'app', func: leftResult.term, arg: term.arg } };
            }
            const rightResult = this.betaReduce(term.arg);
            if (rightResult.reduced) {
                return { reduced: true, term: { type: 'app', func: term.func, arg: rightResult.term } };
            }
        }

        if (term.type === 'abs') {
            const bodyResult = this.betaReduce(term.body);
            if (bodyResult.reduced) {
                return { reduced: true, term: { type: 'abs', param: term.param, body: bodyResult.term } };
            }
        }

        return { reduced: false, term };
    }

    // Normalize (reduce to normal form)
    static normalize(term, maxSteps = 100) {
        let steps = 0;
        let current = term;

        while (steps < maxSteps) {
            const reduceResult = this.betaReduce(current);
            if (!reduceResult.reduced) break;
            current = reduceResult.term;
            steps++;
        }

        return { term: current, steps };
    }

    // Pretty print
    static prettyPrint(term) {
        switch (term.type) {
            case 'var': return term.name;
            case 'abs': return '(\u03BB' + term.param + '.' + this.prettyPrint(term.body) + ')';
            case 'app': return '(' + this.prettyPrint(term.func) + ' ' + this.prettyPrint(term.arg) + ')';
        }
    }
}

// Get input from target
function getInput(t) {
    if (typeof t === 'object' && t !== null) {
        return t.__input_content__ || t;
    }
    return t;
}

const ctx = getInput(target);
const expression = (typeof ctx === 'object') ? (ctx.expression || "(\\x.x) y") : "(\\x.x) y";
const maxSteps = (typeof ctx === 'object') ? (ctx.maxSteps || 10) : 10;

const parsed = LambdaCalc.parse(expression);
const normalizeResult = LambdaCalc.normalize(parsed, maxSteps);
const prettyResult = LambdaCalc.prettyPrint(normalizeResult.term);

const result = {
    input: expression,
    normalized: prettyResult,
    steps: normalizeResult.steps,
    normalForm: true
};
result;
