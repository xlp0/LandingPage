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
import { CardCollection } from '../../model/CardCollection';
import { IO } from '../../monads/IO';
import { Either } from '../../monads/Either';
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
export declare function alphaRename(collection: CardCollection, absHash: string, newParam: string): IO<Either<string, string>>;
/**
 * Check if two terms are alpha-equivalent
 *
 * Two terms are α-equivalent if they differ only in the names of bound variables.
 *
 * Note: If hashes are equal, terms are definitionally identical (stronger than α-equiv).
 */
export declare function alphaEquivalent(collection: CardCollection, hash1: string, hash2: string): IO<Either<string, boolean>>;
/**
 * Alpha-normalize a term using canonical variable names
 *
 * All bound variables are renamed to a₀, a₁, a₂... based on binding depth.
 * This produces a canonical representative of the α-equivalence class.
 */
export declare function alphaNormalize(collection: CardCollection, termHash: string): IO<Either<string, string>>;
//# sourceMappingURL=AlphaConversion.d.ts.map