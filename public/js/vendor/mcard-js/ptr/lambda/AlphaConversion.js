/**
 * Alpha Conversion (α-conversion)
 *
 * Renames bound variables in Lambda terms while preserving meaning.
 *
 * Rule: λx.M ≡α λy.M[x:=y]  (where y is fresh)
 *
 * Alpha conversion is the basis of variable renaming and is essential
 * for avoiding variable capture during beta reduction.
 *
 * @module mcard-js/ptr/lambda/AlphaConversion
 */
import { loadTerm, storeTerm, mkVar, mkAbs, mkApp, isAbs } from './LambdaTerm';
import { freeVariables } from './FreeVariables';
import { IO } from '../../monads/IO';
import { Either } from '../../monads/Either';
// ─────────────────────────────────────────────────────────────────────────────
// Alpha Conversion
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Alpha-rename: Rename the bound variable of an abstraction
 *
 * λx.M → λy.M[x:=y]
 *
 * @param collection - Card collection for term storage
 * @param absHash - Hash of the abstraction term
 * @param newParam - New name for the bound variable
 * @returns IO<Either<error, newHash>>
 */
export function alphaRename(collection, absHash, newParam) {
    return IO.of(async () => {
        const term = await loadTerm(collection, absHash);
        if (!term) {
            return Either.left(`Term not found: ${absHash}`);
        }
        if (!isAbs(term)) {
            return Either.left(`Alpha conversion only applies to abstractions, got ${term.tag}`);
        }
        // If same name, no change needed
        if (term.param === newParam) {
            return Either.right(absHash);
        }
        // Check that new name doesn't capture free variables in body
        const bodyFV = await freeVariables(collection, term.body).run();
        if (bodyFV.isJust && bodyFV.value.has(newParam)) {
            return Either.left(`Cannot α-rename to '${newParam}': would capture free variable in body`);
        }
        // Substitute old param with new param in body
        const newBodyHash = await substituteVar(collection, term.body, term.param, newParam);
        // Create new abstraction
        const newAbs = mkAbs(newParam, newBodyHash);
        const resultHash = await storeTerm(collection, newAbs);
        return Either.right(resultHash);
    });
}
/**
 * Substitute a variable with another variable name throughout a term
 *
 * M[x:=y] - replaces all free occurrences of x with y
 */
async function substituteVar(collection, termHash, oldVar, newVar) {
    const term = await loadTerm(collection, termHash);
    if (!term) {
        throw new Error(`Term not found: ${termHash}`);
    }
    switch (term.tag) {
        case 'Var':
            if (term.name === oldVar) {
                // Replace with new variable
                const newTerm = mkVar(newVar);
                return storeTerm(collection, newTerm);
            }
            // Different variable, unchanged
            return termHash;
        case 'Abs':
            if (term.param === oldVar) {
                // Bound variable shadows, stop substitution
                return termHash;
            }
            // Recurse into body
            const newBody = await substituteVar(collection, term.body, oldVar, newVar);
            if (newBody === term.body) {
                // No change
                return termHash;
            }
            const newAbs = mkAbs(term.param, newBody);
            return storeTerm(collection, newAbs);
        case 'App':
            const newFunc = await substituteVar(collection, term.func, oldVar, newVar);
            const newArg = await substituteVar(collection, term.arg, oldVar, newVar);
            if (newFunc === term.func && newArg === term.arg) {
                // No change
                return termHash;
            }
            const newApp = mkApp(newFunc, newArg);
            return storeTerm(collection, newApp);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Alpha Equivalence
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Check if two terms are alpha-equivalent
 *
 * Two terms are α-equivalent if they differ only in the names of bound variables.
 *
 * Note: If hashes are equal, terms are definitionally identical (stronger than α-equiv).
 */
export function alphaEquivalent(collection, hash1, hash2) {
    return IO.of(async () => {
        // Same hash = identical terms
        if (hash1 === hash2) {
            return Either.right(true);
        }
        const term1 = await loadTerm(collection, hash1);
        const term2 = await loadTerm(collection, hash2);
        if (!term1)
            return Either.left(`Term not found: ${hash1}`);
        if (!term2)
            return Either.left(`Term not found: ${hash2}`);
        const equiv = await checkAlphaEquiv(collection, term1, term2, new Map(), new Map());
        return Either.right(equiv);
    });
}
/**
 * Internal alpha-equivalence check with variable renaming maps
 */
async function checkAlphaEquiv(collection, term1, term2, rename1, // Maps var name in term1 to de Bruijn index
rename2 // Maps var name in term2 to de Bruijn index
) {
    if (term1.tag !== term2.tag) {
        return false;
    }
    switch (term1.tag) {
        case 'Var': {
            const t2 = term2;
            const idx1 = rename1.get(term1.name);
            const idx2 = rename2.get(t2.name);
            if (idx1 !== undefined && idx2 !== undefined) {
                // Both are bound variables - compare by binding depth
                return idx1 === idx2;
            }
            if (idx1 === undefined && idx2 === undefined) {
                // Both are free variables - compare by name
                return term1.name === t2.name;
            }
            // One bound, one free - not equivalent
            return false;
        }
        case 'Abs': {
            const t2 = term2;
            // Extend renaming maps with new binding
            const depth = rename1.size;
            const newRename1 = new Map(rename1);
            const newRename2 = new Map(rename2);
            newRename1.set(term1.param, depth);
            newRename2.set(t2.param, depth);
            // Load and compare bodies
            const body1 = await loadTerm(collection, term1.body);
            const body2 = await loadTerm(collection, t2.body);
            if (!body1 || !body2)
                return false;
            return checkAlphaEquiv(collection, body1, body2, newRename1, newRename2);
        }
        case 'App': {
            const t2 = term2;
            const func1 = await loadTerm(collection, term1.func);
            const func2 = await loadTerm(collection, t2.func);
            const arg1 = await loadTerm(collection, term1.arg);
            const arg2 = await loadTerm(collection, t2.arg);
            if (!func1 || !func2 || !arg1 || !arg2)
                return false;
            const funcEquiv = await checkAlphaEquiv(collection, func1, func2, rename1, rename2);
            if (!funcEquiv)
                return false;
            return checkAlphaEquiv(collection, arg1, arg2, rename1, rename2);
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Alpha Normalization (De Bruijn-like canonical form)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Alpha-normalize a term using canonical variable names
 *
 * All bound variables are renamed to a₀, a₁, a₂... based on binding depth.
 * This produces a canonical representative of the α-equivalence class.
 */
export function alphaNormalize(collection, termHash) {
    return IO.of(async () => {
        const result = await normalizeWithDepth(collection, termHash, new Map(), 0);
        if (result === null) {
            return Either.left(`Term not found: ${termHash}`);
        }
        return Either.right(result);
    });
}
/**
 * Internal normalization with depth tracking
 */
async function normalizeWithDepth(collection, termHash, bindings, // original name -> canonical name
depth) {
    const term = await loadTerm(collection, termHash);
    if (!term)
        return null;
    switch (term.tag) {
        case 'Var': {
            const canonicalName = bindings.get(term.name);
            if (canonicalName) {
                // Bound variable - use canonical name
                const newVar = mkVar(canonicalName);
                return storeTerm(collection, newVar);
            }
            // Free variable - keep original name
            return termHash;
        }
        case 'Abs': {
            // Generate canonical name for this binding depth
            const canonicalName = `a${depth}`;
            // Extend bindings
            const newBindings = new Map(bindings);
            newBindings.set(term.param, canonicalName);
            // Normalize body
            const newBody = await normalizeWithDepth(collection, term.body, newBindings, depth + 1);
            if (newBody === null)
                return null;
            const newAbs = mkAbs(canonicalName, newBody);
            return storeTerm(collection, newAbs);
        }
        case 'App': {
            const newFunc = await normalizeWithDepth(collection, term.func, bindings, depth);
            const newArg = await normalizeWithDepth(collection, term.arg, bindings, depth);
            if (newFunc === null || newArg === null)
                return null;
            // If unchanged, return original
            if (newFunc === term.func && newArg === term.arg) {
                return termHash;
            }
            const newApp = mkApp(newFunc, newArg);
            return storeTerm(collection, newApp);
        }
    }
}
//# sourceMappingURL=AlphaConversion.js.map