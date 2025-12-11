/**
 * Lambda Runtime - PTR Runtime for Lambda Calculus
 *
 * Implements α-β-η conversions as a PTR runtime, treating MCard hashes
 * as Lambda terms and performing computations that produce new MCards.
 *
 * This runtime can be used via CLM specifications to define and verify
 * Lambda Calculus reductions.
 *
 * @module mcard-js/ptr/lambda/LambdaRuntime
 */
import { Runtime } from '../node/RuntimeInterface';
import { CardCollection } from '../../model/CardCollection';
import { ReductionStrategy } from './BetaReduction';
export type LambdaOperation = 'alpha' | 'beta' | 'eta-reduce' | 'eta-expand' | 'normalize' | 'step' | 'alpha-equiv' | 'eta-equiv' | 'alpha-norm' | 'eta-norm' | 'free-vars' | 'is-closed' | 'is-normal' | 'parse' | 'pretty' | 'build';
export interface LambdaConfig {
    operation: LambdaOperation;
    strategy?: ReductionStrategy;
    maxSteps?: number;
    newName?: string;
    freshVar?: string;
    compareWith?: string;
}
export interface LambdaRuntimeResult {
    success: boolean;
    result?: unknown;
    error?: string;
    termHash?: string;
    prettyPrint?: string;
}
/**
 * Lambda Calculus Runtime for PTR
 *
 * Executes Lambda Calculus operations on MCard-stored terms.
 */
export declare class LambdaRuntime implements Runtime {
    private collection;
    constructor(collection: CardCollection);
    /**
     * Execute a Lambda operation
     *
     * @param codeOrPath - For Lambda runtime, this is the term hash to operate on
     * @param context - Additional context (varies by operation)
     * @param config - Lambda configuration with operation type
     * @param chapterDir - Chapter directory (used for relative paths if needed)
     */
    execute(codeOrPath: string, context: unknown, config: any, chapterDir: string): Promise<LambdaRuntimeResult>;
    private doAlphaRename;
    private doBetaReduce;
    private doEtaReduce;
    private doEtaExpand;
    private doNormalize;
    private doStep;
    private doAlphaEquiv;
    private doEtaEquiv;
    private doAlphaNormalize;
    private doEtaNormalize;
    private doFreeVars;
    private doIsClosed;
    private doIsNormal;
    private doParse;
    private doPretty;
    private doBuild;
}
/**
 * Parse a simple Lambda expression string into MCards
 *
 * Syntax:
 *   x, y, z        - Variables
 *   \x.M or λx.M   - Abstraction
 *   (M N)          - Application
 *   M N            - Application (left-associative)
 *
 * Examples:
 *   \x.x           - Identity function
 *   \f.\x.f x      - Application combinator
 *   (\x.x) y       - Identity applied to y
 */
export declare function parseLambdaExpression(collection: CardCollection, expression: string): Promise<string>;
//# sourceMappingURL=LambdaRuntime.d.ts.map