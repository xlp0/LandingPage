/**
 * Lambda Calculus Module for PTR
 *
 * Implements α-β-η conversions on MCard-stored Lambda terms.
 *
 * This module provides:
 * - LambdaTerm ADT: Var, Abs, App stored as MCard content
 * - Alpha Conversion: Variable renaming
 * - Beta Reduction: Function application
 * - Eta Conversion: Extensional equivalence
 * - LambdaRuntime: PTR-compatible runtime for CLM execution
 *
 * @module mcard-js/ptr/lambda
 */
export type { LambdaTerm, VarTerm, AbsTerm, AppTerm, } from './LambdaTerm';
export { mkVar, mkAbs, mkApp, serializeTerm, deserializeTerm, termToMCard, mcardToTerm, storeTerm, loadTerm, termExists, prettyPrintShallow, prettyPrintDeep, isVar, isAbs, isApp } from './LambdaTerm';
export { freeVariables, boundVariables, isFreeIn, isClosed, generateFresh, generateFreshFor, difference, intersection } from './FreeVariables';
export { alphaRename, alphaEquivalent, alphaNormalize } from './AlphaConversion';
export type { ReductionStrategy, NormalizationResult } from './BetaReduction';
export { isRedex, findLeftmostRedex, findInnermostRedex, betaReduce, reduceStep, normalize, isNormalForm, hasNormalForm } from './BetaReduction';
export { isEtaRedex, etaReduce, etaReduceE, etaExpand, etaEquivalent, etaNormalize, findEtaRedexes } from './EtaConversion';
export type { LambdaOperation, LambdaConfig, LambdaRuntimeResult } from './LambdaRuntime';
export { LambdaRuntime, parseLambdaExpression } from './LambdaRuntime';
//# sourceMappingURL=index.d.ts.map