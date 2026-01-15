/**
 * Eta Conversion (η-conversion)
 *
 * Captures extensional equality of functions.
 *
 * η-reduction: λx.(f x) →η f  (if x ∉ FV(f))
 * η-expansion: f →η λx.(f x)  (where x is fresh)
 *
 * Two functions are η-equivalent if they produce the same output for all inputs.
 * This is the principle of extensionality: functions are determined by their behavior.
 *
 * @module mcard-js/ptr/lambda/EtaConversion
 */
import { loadTerm, storeTerm, mkVar, mkAbs, mkApp, isVar, isAbs, isApp } from './LambdaTerm.js';
import { freeVariables, generateFreshFor } from './FreeVariables.js';
import { IO } from '../../monads/IO';
import { Either } from '../../monads/Either';
import { Maybe } from '../../monads/Maybe';
// ─────────────────────────────────────────────────────────────────────────────
// Eta Redex Detection
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Check if a term is an η-redex: λx.(f x) where x ∉ FV(f)
 */
export function isEtaRedex(collection, termHash) {
    return IO.of(async () => {
        const term = await loadTerm(collection, termHash);
        if (!term || !isAbs(term))
            return false;
        const body = await loadTerm(collection, term.body);
        if (!body || !isApp(body))
            return false;
        // Check if argument is the bound variable
        const arg = await loadTerm(collection, body.arg);
        if (!arg || !isVar(arg) || arg.name !== term.param)
            return false;
        // Check if x is not free in f
        const funcFV = await freeVariables(collection, body.func).run();
        if (funcFV.isNothing)
            return false;
        return !funcFV.value.has(term.param);
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// Eta Reduction
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Eta reduction: λx.(f x) →η f
 *
 * Only valid if x does not occur free in f.
 *
 * @param collection - Card collection
 * @param termHash - Hash of the abstraction λx.(f x)
 * @returns Maybe<resultHash> - Nothing if not an η-redex
 */
export function etaReduce(collection, termHash) {
    return IO.of(async () => {
        const term = await loadTerm(collection, termHash);
        if (!term)
            return Maybe.nothing();
        // Must be λx.E
        if (!isAbs(term))
            return Maybe.nothing();
        const body = await loadTerm(collection, term.body);
        if (!body)
            return Maybe.nothing();
        // Body must be application (f x)
        if (!isApp(body))
            return Maybe.nothing();
        // Argument must be the bound variable
        const arg = await loadTerm(collection, body.arg);
        if (!arg)
            return Maybe.nothing();
        if (!isVar(arg) || arg.name !== term.param) {
            return Maybe.nothing();
        }
        // x must not be free in f
        const funcFV = await freeVariables(collection, body.func).run();
        if (funcFV.isNothing)
            return Maybe.nothing();
        if (funcFV.value.has(term.param)) {
            return Maybe.nothing();
        }
        // η-reduce: return f's hash
        return Maybe.just(body.func);
    });
}
/**
 * Try eta reduction, returning Either for error handling
 */
export function etaReduceE(collection, termHash) {
    return etaReduce(collection, termHash).map(maybe => {
        if (maybe.isNothing) {
            return Either.left('Not an η-redex');
        }
        return Either.right(maybe.value);
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// Eta Expansion
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Eta expansion: f →η λx.(f x)
 *
 * Wraps a function in a lambda that immediately applies it.
 * The new variable must be fresh (not occurring in f).
 *
 * @param collection - Card collection
 * @param termHash - Hash of the term to expand
 * @param baseName - Base name for the fresh variable (default: 'x')
 * @returns Hash of the expanded term λx.(f x)
 */
export function etaExpand(collection, termHash, baseName = 'x') {
    return IO.of(async () => {
        // Generate fresh variable name
        const freshVar = await generateFreshFor(collection, baseName, termHash);
        // Create variable term
        const varTerm = mkVar(freshVar);
        const varHash = await storeTerm(collection, varTerm);
        // Create application (f x)
        const appTerm = mkApp(termHash, varHash);
        const appHash = await storeTerm(collection, appTerm);
        // Create abstraction λx.(f x)
        const absTerm = mkAbs(freshVar, appHash);
        const absHash = await storeTerm(collection, absTerm);
        return absHash;
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// Eta Equivalence
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Check if two terms are η-equivalent
 *
 * Two terms f and g are η-equivalent if:
 * - They are the same, or
 * - One η-reduces to the other, or
 * - They both η-expand to equivalent terms
 */
export function etaEquivalent(collection, hash1, hash2) {
    return IO.of(async () => {
        // Same hash = definitely equivalent
        if (hash1 === hash2)
            return true;
        // Try reducing both to see if they meet
        const reduced1 = await etaReduceDeep(collection, hash1);
        const reduced2 = await etaReduceDeep(collection, hash2);
        return reduced1 === reduced2;
    });
}
/**
 * Recursively apply η-reduction until no more η-redexes
 */
async function etaReduceDeep(collection, termHash) {
    const term = await loadTerm(collection, termHash);
    if (!term)
        return termHash;
    switch (term.tag) {
        case 'Var':
            return termHash;
        case 'Abs': {
            // First try η-reduction at this level
            const etaResult = await etaReduce(collection, termHash).run();
            if (etaResult.isJust) {
                // η-reduced - continue reducing the result
                return etaReduceDeep(collection, etaResult.value);
            }
            // Not an η-redex - recurse into body
            const newBody = await etaReduceDeep(collection, term.body);
            if (newBody === term.body)
                return termHash;
            const newAbs = mkAbs(term.param, newBody);
            return storeTerm(collection, newAbs);
        }
        case 'App': {
            const newFunc = await etaReduceDeep(collection, term.func);
            const newArg = await etaReduceDeep(collection, term.arg);
            if (newFunc === term.func && newArg === term.arg)
                return termHash;
            const newApp = mkApp(newFunc, newArg);
            return storeTerm(collection, newApp);
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Combined Eta Operations
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Eta-normalize a term by reducing all η-redexes
 */
export function etaNormalize(collection, termHash) {
    return IO.of(() => etaReduceDeep(collection, termHash));
}
/**
 * Find all η-redexes in a term
 */
export function findEtaRedexes(collection, termHash) {
    return IO.of(async () => {
        const redexes = [];
        await collectEtaRedexes(collection, termHash, redexes);
        return redexes;
    });
}
async function collectEtaRedexes(collection, termHash, redexes) {
    const term = await loadTerm(collection, termHash);
    if (!term)
        return;
    switch (term.tag) {
        case 'Var':
            break;
        case 'Abs': {
            // Check if this is an η-redex
            const isRedex = await isEtaRedex(collection, termHash).run();
            if (isRedex) {
                redexes.push(termHash);
            }
            // Also check body
            await collectEtaRedexes(collection, term.body, redexes);
            break;
        }
        case 'App': {
            await collectEtaRedexes(collection, term.func, redexes);
            await collectEtaRedexes(collection, term.arg, redexes);
            break;
        }
    }
}
//# sourceMappingURL=EtaConversion.js.map