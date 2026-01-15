/**
 * Beta Reduction (β-reduction)
 *
 * The computational heart of Lambda Calculus - function application.
 *
 * Rule: (λx.M) N →β M[x:=N]
 *
 * A term of the form (λx.M) N is called a "beta-redex" (reducible expression).
 * Beta reduction substitutes the argument N for all free occurrences of x in M.
 *
 * IMPORTANT: Must handle capture avoidance - if N contains free variables
 * that would become bound in M, we must α-rename first.
 *
 * @module mcard-js/ptr/lambda/BetaReduction
 */
import { loadTerm, storeTerm, mkAbs, mkApp, isAbs, isApp } from './LambdaTerm.js';
import { freeVariables, generateFresh } from './FreeVariables.js';
import { alphaRename } from './AlphaConversion.js';
import { IO } from '../../monads/IO';
import { Either } from '../../monads/Either';
import { Maybe } from '../../monads/Maybe';
// ─────────────────────────────────────────────────────────────────────────────
// Beta Redex Detection
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Check if a term is a beta-redex: (λx.M) N
 */
export function isRedex(collection, termHash) {
    return IO.of(async () => {
        const term = await loadTerm(collection, termHash);
        if (!term || !isApp(term))
            return false;
        const func = await loadTerm(collection, term.func);
        return func !== null && isAbs(func);
    });
}
/**
 * Find the leftmost-outermost redex (normal order reduction)
 * Returns Maybe<hash of redex>
 */
export function findLeftmostRedex(collection, termHash) {
    return IO.of(async () => {
        return findRedexNormalOrder(collection, termHash);
    });
}
async function findRedexNormalOrder(collection, termHash) {
    const term = await loadTerm(collection, termHash);
    if (!term)
        return Maybe.nothing();
    switch (term.tag) {
        case 'Var':
            // Variables are not redexes
            return Maybe.nothing();
        case 'Abs':
            // Look inside the body
            return findRedexNormalOrder(collection, term.body);
        case 'App': {
            // Check if this application is a redex
            const func = await loadTerm(collection, term.func);
            if (func && isAbs(func)) {
                // This is a redex!
                return Maybe.just(termHash);
            }
            // Not a redex - search in func first (leftmost), then arg
            const funcRedex = await findRedexNormalOrder(collection, term.func);
            if (funcRedex.isJust)
                return funcRedex;
            return findRedexNormalOrder(collection, term.arg);
        }
    }
}
/**
 * Find the leftmost-innermost redex (applicative order reduction)
 */
export function findInnermostRedex(collection, termHash) {
    return IO.of(async () => {
        return findRedexApplicativeOrder(collection, termHash);
    });
}
async function findRedexApplicativeOrder(collection, termHash) {
    const term = await loadTerm(collection, termHash);
    if (!term)
        return Maybe.nothing();
    switch (term.tag) {
        case 'Var':
            return Maybe.nothing();
        case 'Abs':
            return findRedexApplicativeOrder(collection, term.body);
        case 'App': {
            // Search in subterms first (innermost)
            const funcRedex = await findRedexApplicativeOrder(collection, term.func);
            if (funcRedex.isJust)
                return funcRedex;
            const argRedex = await findRedexApplicativeOrder(collection, term.arg);
            if (argRedex.isJust)
                return argRedex;
            // Then check if this is a redex
            const func = await loadTerm(collection, term.func);
            if (func && isAbs(func)) {
                return Maybe.just(termHash);
            }
            return Maybe.nothing();
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Beta Reduction
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Perform a single beta reduction step on a redex
 *
 * (λx.M) N →β M[x:=N]
 *
 * @param collection - Card collection
 * @param redexHash - Hash of the application term (λx.M) N
 * @returns Either<error, resultHash>
 */
export function betaReduce(collection, redexHash) {
    return IO.of(async () => {
        const app = await loadTerm(collection, redexHash);
        if (!app) {
            return Either.left(`Term not found: ${redexHash}`);
        }
        if (!isApp(app)) {
            return Either.left(`Beta reduction requires application term, got ${app.tag}`);
        }
        const func = await loadTerm(collection, app.func);
        if (!func) {
            return Either.left(`Function not found: ${app.func}`);
        }
        if (!isAbs(func)) {
            return Either.left(`Not a beta-redex: function is ${func.tag}, not abstraction`);
        }
        // Perform substitution: M[x:=N]
        const resultHash = await substituteWithCapture(collection, func.body, // M
        func.param, // x
        app.arg // N (as hash)
        );
        return Either.right(resultHash);
    });
}
/**
 * Substitute a variable with a term (by hash), handling capture avoidance
 *
 * M[x:=N] - replaces all free occurrences of x in M with N
 */
async function substituteWithCapture(collection, termHash, variable, replacementHash) {
    const term = await loadTerm(collection, termHash);
    if (!term) {
        throw new Error(`Term not found: ${termHash}`);
    }
    switch (term.tag) {
        case 'Var':
            // If this is the variable we're substituting, return the replacement
            if (term.name === variable) {
                return replacementHash;
            }
            // Otherwise unchanged
            return termHash;
        case 'Abs': {
            // If bound variable shadows, stop substitution
            if (term.param === variable) {
                return termHash;
            }
            // Check for variable capture:
            // If the bound variable (term.param) is free in the replacement,
            // we must α-rename to avoid capture
            const replacementFV = await freeVariables(collection, replacementHash).run();
            if (replacementFV.isJust && replacementFV.value.has(term.param)) {
                // Capture would occur! Need to α-rename first
                const allVars = new Set(replacementFV.value);
                // Also avoid variables in the body
                const bodyFV = await freeVariables(collection, term.body).run();
                if (bodyFV.isJust) {
                    for (const v of bodyFV.value)
                        allVars.add(v);
                }
                allVars.add(variable);
                // Generate fresh name
                const freshName = generateFresh(term.param, allVars);
                // α-rename the abstraction
                const renameResult = await alphaRename(collection, termHash, freshName).run();
                if (renameResult.isLeft) {
                    throw new Error(`Alpha rename failed: ${renameResult.left}`);
                }
                // Now substitute in the renamed term
                return substituteWithCapture(collection, renameResult.right, variable, replacementHash);
            }
            // No capture - recurse into body
            const newBody = await substituteWithCapture(collection, term.body, variable, replacementHash);
            if (newBody === term.body) {
                return termHash;
            }
            const newAbs = mkAbs(term.param, newBody);
            return storeTerm(collection, newAbs);
        }
        case 'App': {
            const newFunc = await substituteWithCapture(collection, term.func, variable, replacementHash);
            const newArg = await substituteWithCapture(collection, term.arg, variable, replacementHash);
            if (newFunc === term.func && newArg === term.arg) {
                return termHash;
            }
            const newApp = mkApp(newFunc, newArg);
            return storeTerm(collection, newApp);
        }
    }
}
/**
 * Perform one reduction step using the specified strategy
 */
export function reduceStep(collection, termHash, strategy = 'normal') {
    return IO.of(async () => {
        // Find redex using strategy
        let redexMaybe;
        switch (strategy) {
            case 'normal':
            case 'lazy':
                redexMaybe = await findRedexNormalOrder(collection, termHash);
                break;
            case 'applicative':
                redexMaybe = await findRedexApplicativeOrder(collection, termHash);
                break;
        }
        if (redexMaybe.isNothing) {
            // No redex found - already in normal form
            return Maybe.nothing();
        }
        const redexHash = redexMaybe.value;
        // If the redex is the whole term, just reduce it
        if (redexHash === termHash) {
            const result = await betaReduce(collection, redexHash).run();
            if (result.isLeft) {
                throw new Error(result.left);
            }
            return Maybe.just(result.right);
        }
        // Otherwise, need to reduce the subterm and reconstruct
        const reduced = await betaReduce(collection, redexHash).run();
        if (reduced.isLeft) {
            throw new Error(reduced.left);
        }
        const rebuilt = await rebuildWithReduced(collection, termHash, redexHash, reduced.right);
        return Maybe.just(rebuilt);
    });
}
/**
 * Rebuild a term after reducing a subterm
 */
async function rebuildWithReduced(collection, termHash, redexHash, reducedHash) {
    if (termHash === redexHash) {
        return reducedHash;
    }
    const term = await loadTerm(collection, termHash);
    if (!term)
        throw new Error(`Term not found: ${termHash}`);
    switch (term.tag) {
        case 'Var':
            return termHash;
        case 'Abs': {
            const newBody = await rebuildWithReduced(collection, term.body, redexHash, reducedHash);
            if (newBody === term.body)
                return termHash;
            const newAbs = mkAbs(term.param, newBody);
            return storeTerm(collection, newAbs);
        }
        case 'App': {
            const newFunc = await rebuildWithReduced(collection, term.func, redexHash, reducedHash);
            const newArg = await rebuildWithReduced(collection, term.arg, redexHash, reducedHash);
            if (newFunc === term.func && newArg === term.arg)
                return termHash;
            const newApp = mkApp(newFunc, newArg);
            return storeTerm(collection, newApp);
        }
    }
}
/**
 * Normalize a term to its normal form (no more redexes)
 *
 * @param collection - Card collection
 * @param termHash - Starting term
 * @param strategy - Reduction strategy
 * @param maxSteps - Maximum reduction steps (prevent infinite loops)
 * @returns Either<error, NormalizationResult>
 */
export function normalize(collection, termHash, strategy = 'normal', maxSteps = 1000) {
    return IO.of(async () => {
        let current = termHash;
        let steps = 0;
        const path = [termHash];
        while (steps < maxSteps) {
            const stepResult = await reduceStep(collection, current, strategy).run();
            if (stepResult.isNothing) {
                // No more reductions - reached normal form
                return Either.right({
                    normalForm: current,
                    steps,
                    reductionPath: path
                });
            }
            current = stepResult.value;
            path.push(current);
            steps++;
        }
        return Either.left(`Normalization did not terminate within ${maxSteps} steps (possible infinite loop)`);
    });
}
/**
 * Check if a term is in normal form (has no redexes)
 */
export function isNormalForm(collection, termHash) {
    return findLeftmostRedex(collection, termHash).map(m => m.isNothing);
}
/**
 * Check if a term has a normal form (is normalizing)
 *
 * Note: This is undecidable in general, so we use a bounded check
 */
export function hasNormalForm(collection, termHash, maxSteps = 1000) {
    return normalize(collection, termHash, 'normal', maxSteps)
        .map(result => result.isRight);
}
//# sourceMappingURL=BetaReduction.js.map