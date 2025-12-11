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
import { CardCollection } from '../../model/CardCollection';
import { IO } from '../../monads/IO';
import { Maybe } from '../../monads/Maybe';
/**
 * Compute free variables of a term (by hash)
 * Returns IO<Maybe<Set<string>>> - Nothing if term not found
 */
export declare function freeVariables(collection: CardCollection, termHash: string): IO<Maybe<Set<string>>>;
/**
 * Compute bound variables of a term (by hash)
 * Bound variables are those occurring in binding positions (λx)
 */
export declare function boundVariables(collection: CardCollection, termHash: string): IO<Maybe<Set<string>>>;
/**
 * Check if a variable is free in a term
 */
export declare function isFreeIn(collection: CardCollection, variable: string, termHash: string): IO<boolean>;
/**
 * Check if a term is closed (has no free variables)
 */
export declare function isClosed(collection: CardCollection, termHash: string): IO<boolean>;
/**
 * Generate a fresh variable name that is not in the given set
 */
export declare function generateFresh(base: string, avoid: Set<string>): string;
/**
 * Generate a fresh variable avoiding all variables in a term
 */
export declare function generateFreshFor(collection: CardCollection, base: string, termHash: string): Promise<string>;
export declare function difference<T>(a: Set<T>, b: Set<T>): Set<T>;
export declare function intersection<T>(a: Set<T>, b: Set<T>): Set<T>;
//# sourceMappingURL=FreeVariables.d.ts.map