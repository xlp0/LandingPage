/**
 * Free Variables Analysis
 *
 * Computes the set of free variables in a Lambda term.
 * Free variables are those not bound by any enclosing λ.
 *
 * FV(x) = {x}
 * FV(λx.M) = FV(M) \ {x}
 * FV(M N) = FV(M) ∪ FV(N)
 *
 * @module mcard-js/ptr/lambda/FreeVariables
 */
import { loadTerm } from './LambdaTerm';
import { IO } from '../../monads/IO';
import { Maybe } from '../../monads/Maybe';
// ─────────────────────────────────────────────────────────────────────────────
// Free Variable Computation
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Compute free variables of a term (by hash)
 * Returns IO<Maybe<Set<string>>> - Nothing if term not found
 */
export function freeVariables(collection, termHash) {
    return IO.of(async () => {
        const result = await computeFreeVars(collection, termHash, new Set());
        return result;
    });
}
/**
 * Internal recursive implementation with memoization via visited set
 */
async function computeFreeVars(collection, termHash, visited) {
    // Cycle detection
    if (visited.has(termHash)) {
        return Maybe.just(new Set());
    }
    visited.add(termHash);
    const term = await loadTerm(collection, termHash);
    if (!term) {
        return Maybe.nothing();
    }
    return Maybe.just(await freeVarsOfTerm(collection, term, visited));
}
/**
 * Compute free variables of a term structure
 */
async function freeVarsOfTerm(collection, term, visited) {
    switch (term.tag) {
        case 'Var':
            // FV(x) = {x}
            return new Set([term.name]);
        case 'Abs': {
            // FV(λx.M) = FV(M) \ {x}
            const bodyFV = await computeFreeVars(collection, term.body, visited);
            if (bodyFV.isNothing) {
                throw new Error(`Body term not found: ${term.body}`);
            }
            const result = new Set(bodyFV.value);
            result.delete(term.param);
            return result;
        }
        case 'App': {
            // FV(M N) = FV(M) ∪ FV(N)
            const funcFV = await computeFreeVars(collection, term.func, visited);
            const argFV = await computeFreeVars(collection, term.arg, visited);
            if (funcFV.isNothing) {
                throw new Error(`Function term not found: ${term.func}`);
            }
            if (argFV.isNothing) {
                throw new Error(`Argument term not found: ${term.arg}`);
            }
            return union(funcFV.value, argFV.value);
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Bound Variables
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Compute bound variables of a term (by hash)
 * Bound variables are those occurring in binding positions (λx)
 */
export function boundVariables(collection, termHash) {
    return IO.of(async () => {
        return computeBoundVars(collection, termHash, new Set());
    });
}
async function computeBoundVars(collection, termHash, visited) {
    if (visited.has(termHash)) {
        return Maybe.just(new Set());
    }
    visited.add(termHash);
    const term = await loadTerm(collection, termHash);
    if (!term) {
        return Maybe.nothing();
    }
    switch (term.tag) {
        case 'Var':
            // No bound variables in a variable
            return Maybe.just(new Set());
        case 'Abs': {
            // BV(λx.M) = {x} ∪ BV(M)
            const bodyBV = await computeBoundVars(collection, term.body, visited);
            if (bodyBV.isNothing)
                return bodyBV;
            const result = new Set(bodyBV.value);
            result.add(term.param);
            return Maybe.just(result);
        }
        case 'App': {
            // BV(M N) = BV(M) ∪ BV(N)
            const funcBV = await computeBoundVars(collection, term.func, visited);
            const argBV = await computeBoundVars(collection, term.arg, visited);
            if (funcBV.isNothing || argBV.isNothing) {
                return Maybe.nothing();
            }
            return Maybe.just(union(funcBV.value, argBV.value));
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Utility: Check if variable is free in term
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Check if a variable is free in a term
 */
export function isFreeIn(collection, variable, termHash) {
    return freeVariables(collection, termHash).map(maybeFV => {
        if (maybeFV.isNothing)
            return false;
        return maybeFV.value.has(variable);
    });
}
/**
 * Check if a term is closed (has no free variables)
 */
export function isClosed(collection, termHash) {
    return freeVariables(collection, termHash).map(maybeFV => {
        if (maybeFV.isNothing)
            return false;
        return maybeFV.value.size === 0;
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// Fresh Variable Generation
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Generate a fresh variable name that is not in the given set
 */
export function generateFresh(base, avoid) {
    if (!avoid.has(base)) {
        return base;
    }
    let counter = 1;
    let candidate = `${base}${counter}`;
    while (avoid.has(candidate)) {
        counter++;
        candidate = `${base}${counter}`;
    }
    return candidate;
}
/**
 * Generate a fresh variable avoiding all variables in a term
 */
export async function generateFreshFor(collection, base, termHash) {
    const fvResult = await freeVariables(collection, termHash).run();
    const bvResult = await boundVariables(collection, termHash).run();
    const avoid = new Set();
    if (fvResult.isJust) {
        for (const v of fvResult.value)
            avoid.add(v);
    }
    if (bvResult.isJust) {
        for (const v of bvResult.value)
            avoid.add(v);
    }
    return generateFresh(base, avoid);
}
// ─────────────────────────────────────────────────────────────────────────────
// Set Utilities
// ─────────────────────────────────────────────────────────────────────────────
function union(a, b) {
    const result = new Set(a);
    for (const item of b) {
        result.add(item);
    }
    return result;
}
export function difference(a, b) {
    const result = new Set();
    for (const item of a) {
        if (!b.has(item)) {
            result.add(item);
        }
    }
    return result;
}
export function intersection(a, b) {
    const result = new Set();
    for (const item of a) {
        if (b.has(item)) {
            result.add(item);
        }
    }
    return result;
}
//# sourceMappingURL=FreeVariables.js.map