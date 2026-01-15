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
export { 
// Smart Constructors
mkVar, mkAbs, mkApp, 
// Serialization
serializeTerm, deserializeTerm, termToMCard, mcardToTerm, 
// Storage
storeTerm, loadTerm, termExists, 
// Pretty Printing
prettyPrintShallow, prettyPrintDeep, 
// Type Guards
isVar, isAbs, isApp } from './LambdaTerm.js';
// Free Variables
export { freeVariables, boundVariables, isFreeIn, isClosed, generateFresh, generateFreshFor, difference, intersection } from './FreeVariables.js';
// Alpha Conversion
export { alphaRename, alphaEquivalent, alphaNormalize } from './AlphaConversion.js';
export { isRedex, findLeftmostRedex, findInnermostRedex, betaReduce, reduceStep, normalize, isNormalForm, hasNormalForm } from './BetaReduction.js';
// Eta Conversion
export { isEtaRedex, etaReduce, etaReduceE, etaExpand, etaEquivalent, etaNormalize, findEtaRedexes } from './EtaConversion.js';
export { LambdaRuntime, parseLambdaExpression } from './LambdaRuntime.js';
//# sourceMappingURL=index.js.map