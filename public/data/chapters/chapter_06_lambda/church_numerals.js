// Church Numeral Operations
class ChurchNumerals {
    // Check if a term is closed (no free variables)
    static freeVars(term, bound = new Set()) {
        switch (term.type) {
            case 'var':
                return bound.has(term.name) ? new Set() : new Set([term.name]);
            case 'abs':
                const newBound = new Set(bound);
                newBound.add(term.param);
                return this.freeVars(term.body, newBound);
            case 'app':
                const funcVars = this.freeVars(term.func, bound);
                const argVars = this.freeVars(term.arg, bound);
                return new Set([...funcVars, ...argVars]);
            default:
                return new Set();
        }
    }

    static isClosed(term) {
        return this.freeVars(term).size === 0;
    }

    // Parse lambda expression
    static parse(expr) {
        expr = expr.trim();

        if (/^[a-z]$/.test(expr)) {
            return { type: 'var', name: expr };
        }

        const lambdaMatch = expr.match(/^[\\λ]([a-z])\.(.+)$/);
        if (lambdaMatch) {
            return {
                type: 'abs',
                param: lambdaMatch[1],
                body: this.parse(lambdaMatch[2])
            };
        }

        if (expr.startsWith('(') && expr.endsWith(')')) {
            expr = expr.slice(1, -1).trim();
        }

        const parts = this.splitApplication(expr);
        if (parts.length === 2) {
            return {
                type: 'app',
                func: this.parse(parts[0]),
                arg: this.parse(parts[1])
            };
        }

        return { type: 'var', name: expr };
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

    // Check if term is in normal form (no redexes)
    static isNormalForm(term) {
        if (term.type === 'app' && term.func.type === 'abs') {
            return false; // This is a redex
        }
        if (term.type === 'app') {
            return this.isNormalForm(term.func) && this.isNormalForm(term.arg);
        }
        if (term.type === 'abs') {
            return this.isNormalForm(term.body);
        }
        return true; // Variable
    }

    // Decode Church numeral to integer (for testing)
    static decodeChurch(term) {
        let count = 0;

        // Simple evaluation for Church numerals
        if (term.type === 'abs' && term.body.type === 'abs') {
            // λf.λx.body - count applications of f
            let body = term.body.body;
            while (body.type === 'app' && body.func.type === 'var' && body.func.name === term.param) {
                count++;
                body = body.arg;
            }
        }
        return count;
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
const expression = (typeof ctx === 'object') ? (ctx.expression || "\\f.\\x.x") : "\\f.\\x.x";

const parsed = ChurchNumerals.parse(expression);
const closed = ChurchNumerals.isClosed(parsed);
const normalForm = ChurchNumerals.isNormalForm(parsed);
const numericValue = ChurchNumerals.decodeChurch(parsed);

const result = {
    expression: expression,
    closed: closed,
    normalForm: normalForm,
    churchValue: numericValue
};
result;
