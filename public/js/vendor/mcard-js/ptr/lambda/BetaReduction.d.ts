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
import { CardCollection } from '../../model/CardCollection';
import { IO } from '../../monads/IO';
import { Either } from '../../monads/Either';
import { Maybe } from '../../monads/Maybe';
/**
 * Check if a term is a beta-redex: (λx.M) N
 */
export declare function isRedex(collection: CardCollection, termHash: string): IO<boolean>;
/**
 * Find the leftmost-outermost redex (normal order reduction)
 * Returns Maybe<hash of redex>
 */
export declare function findLeftmostRedex(collection: CardCollection, termHash: string): IO<Maybe<string>>;
/**
 * Find the leftmost-innermost redex (applicative order reduction)
 */
export declare function findInnermostRedex(collection: CardCollection, termHash: string): IO<Maybe<string>>;
/**
 * Perform a single beta reduction step on a redex
 *
 * (λx.M) N →β M[x:=N]
 *
 * @param collection - Card collection
 * @param redexHash - Hash of the application term (λx.M) N
 * @returns Either<error, resultHash>
 */
export declare function betaReduce(collection: CardCollection, redexHash: string): IO<Either<string, string>>;
export type ReductionStrategy = 'normal' | 'applicative' | 'lazy';
/**
 * Perform one reduction step using the specified strategy
 */
export declare function reduceStep(collection: CardCollection, termHash: string, strategy?: ReductionStrategy): IO<Maybe<string>>;
export interface NormalizationResult {
    normalForm: string;
    steps: number;
    reductionPath: string[];
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
export declare function normalize(collection: CardCollection, termHash: string, strategy?: ReductionStrategy, maxSteps?: number): IO<Either<string, NormalizationResult>>;
/**
 * Check if a term is in normal form (has no redexes)
 */
export declare function isNormalForm(collection: CardCollection, termHash: string): IO<boolean>;
/**
 * Check if a term has a normal form (is normalizing)
 *
 * Note: This is undecidable in general, so we use a bounded check
 */
export declare function hasNormalForm(collection: CardCollection, termHash: string, maxSteps?: number): IO<boolean>;
//# sourceMappingURL=BetaReduction.d.ts.map