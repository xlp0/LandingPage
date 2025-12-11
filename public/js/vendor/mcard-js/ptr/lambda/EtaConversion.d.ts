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
import { CardCollection } from '../../model/CardCollection';
import { IO } from '../../monads/IO';
import { Either } from '../../monads/Either';
import { Maybe } from '../../monads/Maybe';
/**
 * Check if a term is an η-redex: λx.(f x) where x ∉ FV(f)
 */
export declare function isEtaRedex(collection: CardCollection, termHash: string): IO<boolean>;
/**
 * Eta reduction: λx.(f x) →η f
 *
 * Only valid if x does not occur free in f.
 *
 * @param collection - Card collection
 * @param termHash - Hash of the abstraction λx.(f x)
 * @returns Maybe<resultHash> - Nothing if not an η-redex
 */
export declare function etaReduce(collection: CardCollection, termHash: string): IO<Maybe<string>>;
/**
 * Try eta reduction, returning Either for error handling
 */
export declare function etaReduceE(collection: CardCollection, termHash: string): IO<Either<string, string>>;
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
export declare function etaExpand(collection: CardCollection, termHash: string, baseName?: string): IO<string>;
/**
 * Check if two terms are η-equivalent
 *
 * Two terms f and g are η-equivalent if:
 * - They are the same, or
 * - One η-reduces to the other, or
 * - They both η-expand to equivalent terms
 */
export declare function etaEquivalent(collection: CardCollection, hash1: string, hash2: string): IO<boolean>;
/**
 * Eta-normalize a term by reducing all η-redexes
 */
export declare function etaNormalize(collection: CardCollection, termHash: string): IO<string>;
/**
 * Find all η-redexes in a term
 */
export declare function findEtaRedexes(collection: CardCollection, termHash: string): IO<string[]>;
//# sourceMappingURL=EtaConversion.d.ts.map