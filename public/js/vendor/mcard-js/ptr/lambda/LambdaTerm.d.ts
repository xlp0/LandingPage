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
import { CardCollection } from '../../model/CardCollection';
/**
 * Variable term: x
 */
export interface VarTerm {
    readonly tag: 'Var';
    readonly name: string;
}
/**
 * Abstraction term: λx.M
 * Body is stored as MCard hash for structural sharing
 */
export interface AbsTerm {
    readonly tag: 'Abs';
    readonly param: string;
    readonly body: string;
}
/**
 * Application term: M N
 * Both function and argument are MCard hashes
 */
export interface AppTerm {
    readonly tag: 'App';
    readonly func: string;
    readonly arg: string;
}
/**
 * Union type for all Lambda terms
 */
export type LambdaTerm = VarTerm | AbsTerm | AppTerm;
/**
 * Create a variable term
 */
export declare function mkVar(name: string): VarTerm;
/**
 * Create an abstraction term
 */
export declare function mkAbs(param: string, bodyHash: string): AbsTerm;
/**
 * Create an application term
 */
export declare function mkApp(funcHash: string, argHash: string): AppTerm;
/**
 * Serialize a Lambda term to MCard content (JSON string)
 */
export declare function serializeTerm(term: LambdaTerm): string;
/**
 * Deserialize MCard content to Lambda term
 */
export declare function deserializeTerm(content: string): LambdaTerm;
/**
 * Create an MCard from a Lambda term
 */
export declare function termToMCard(term: LambdaTerm): Promise<MCard>;
/**
 * Extract Lambda term from MCard
 */
export declare function mcardToTerm(mcard: MCard): LambdaTerm;
/**
 * Store a Lambda term in the collection and return its hash
 */
export declare function storeTerm(collection: CardCollection, term: LambdaTerm): Promise<string>;
/**
 * Retrieve a Lambda term from the collection by hash
 */
export declare function loadTerm(collection: CardCollection, hash: string): Promise<LambdaTerm | null>;
/**
 * Check if a term exists in the collection
 */
export declare function termExists(collection: CardCollection, hash: string): Promise<boolean>;
/**
 * Pretty-print a Lambda term (shallow - shows hashes for subterms)
 */
export declare function prettyPrintShallow(term: LambdaTerm): string;
/**
 * Pretty-print a Lambda term (deep - resolves all subterms from collection)
 */
export declare function prettyPrintDeep(collection: CardCollection, hash: string): Promise<string>;
export declare function isVar(term: LambdaTerm): term is VarTerm;
export declare function isAbs(term: LambdaTerm): term is AbsTerm;
export declare function isApp(term: LambdaTerm): term is AppTerm;
//# sourceMappingURL=LambdaTerm.d.ts.map