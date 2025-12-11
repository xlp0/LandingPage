/**
 * Lambda Term - Algebraic Data Type for Lambda Calculus
 *
 * Represents Lambda Calculus terms as content-addressable MCards.
 * Each term variant is stored as JSON in MCard content, with sub-terms
 * referenced by their SHA-256 hashes for structural sharing.
 *
 * The three term constructors mirror the BNF grammar:
 *   M, N ::= x | λx.M | M N
 *
 * @module mcard-js/ptr/lambda/LambdaTerm
 */
import { MCard } from '../../model/MCard';
// ─────────────────────────────────────────────────────────────────────────────
// Constructors (Smart Constructors)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Create a variable term
 */
export function mkVar(name) {
    return { tag: 'Var', name };
}
/**
 * Create an abstraction term
 */
export function mkAbs(param, bodyHash) {
    return { tag: 'Abs', param, body: bodyHash };
}
/**
 * Create an application term
 */
export function mkApp(funcHash, argHash) {
    return { tag: 'App', func: funcHash, arg: argHash };
}
// ─────────────────────────────────────────────────────────────────────────────
// MCard Serialization
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Serialize a Lambda term to MCard content (JSON string)
 */
export function serializeTerm(term) {
    return JSON.stringify(term);
}
/**
 * Deserialize MCard content to Lambda term
 */
export function deserializeTerm(content) {
    const parsed = JSON.parse(content);
    // Validate structure
    if (!parsed.tag) {
        throw new Error('Invalid Lambda term: missing tag');
    }
    switch (parsed.tag) {
        case 'Var':
            if (typeof parsed.name !== 'string') {
                throw new Error('Invalid Var term: name must be string');
            }
            return mkVar(parsed.name);
        case 'Abs':
            if (typeof parsed.param !== 'string' || typeof parsed.body !== 'string') {
                throw new Error('Invalid Abs term: param and body must be strings');
            }
            return mkAbs(parsed.param, parsed.body);
        case 'App':
            if (typeof parsed.func !== 'string' || typeof parsed.arg !== 'string') {
                throw new Error('Invalid App term: func and arg must be strings');
            }
            return mkApp(parsed.func, parsed.arg);
        default:
            throw new Error(`Unknown Lambda term tag: ${parsed.tag}`);
    }
}
/**
 * Create an MCard from a Lambda term
 */
export async function termToMCard(term) {
    return MCard.create(serializeTerm(term));
}
/**
 * Extract Lambda term from MCard
 */
export function mcardToTerm(mcard) {
    return deserializeTerm(mcard.getContentAsText());
}
// ─────────────────────────────────────────────────────────────────────────────
// Collection Operations
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Store a Lambda term in the collection and return its hash
 */
export async function storeTerm(collection, term) {
    const mcard = await termToMCard(term);
    await collection.add(mcard);
    return mcard.hash;
}
/**
 * Retrieve a Lambda term from the collection by hash
 */
export async function loadTerm(collection, hash) {
    const mcard = await collection.get(hash);
    if (!mcard)
        return null;
    return mcardToTerm(mcard);
}
/**
 * Check if a term exists in the collection
 */
export async function termExists(collection, hash) {
    const mcard = await collection.get(hash);
    return mcard !== null;
}
// ─────────────────────────────────────────────────────────────────────────────
// Pretty Printing
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Pretty-print a Lambda term (shallow - shows hashes for subterms)
 */
export function prettyPrintShallow(term) {
    switch (term.tag) {
        case 'Var':
            return term.name;
        case 'Abs':
            return `λ${term.param}.〈${term.body.substring(0, 8)}…〉`;
        case 'App':
            return `(〈${term.func.substring(0, 8)}…〉 〈${term.arg.substring(0, 8)}…〉)`;
    }
}
/**
 * Pretty-print a Lambda term (deep - resolves all subterms from collection)
 */
export async function prettyPrintDeep(collection, hash) {
    const term = await loadTerm(collection, hash);
    if (!term)
        return `〈missing:${hash.substring(0, 8)}…〉`;
    switch (term.tag) {
        case 'Var':
            return term.name;
        case 'Abs':
            const body = await prettyPrintDeep(collection, term.body);
            return `(λ${term.param}.${body})`;
        case 'App':
            const func = await prettyPrintDeep(collection, term.func);
            const arg = await prettyPrintDeep(collection, term.arg);
            return `(${func} ${arg})`;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────
export function isVar(term) {
    return term.tag === 'Var';
}
export function isAbs(term) {
    return term.tag === 'Abs';
}
export function isApp(term) {
    return term.tag === 'App';
}
//# sourceMappingURL=LambdaTerm.js.map