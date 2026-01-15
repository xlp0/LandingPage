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
// Import conversions
import { alphaRename, alphaEquivalent, alphaNormalize } from './AlphaConversion.js.js';
import { betaReduce, normalize, reduceStep, isNormalForm } from './BetaReduction.js.js';
import { etaReduce, etaExpand, etaNormalize, etaEquivalent } from './EtaConversion.js.js';
import { freeVariables, isClosed } from './FreeVariables.js.js';
import { storeTerm, mkVar, mkAbs, mkApp, prettyPrintDeep } from './LambdaTerm.js.js';
// ─────────────────────────────────────────────────────────────────────────────
// Lambda Runtime Class
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Lambda Calculus Runtime for PTR
 *
 * Executes Lambda Calculus operations on MCard-stored terms.
 */
export class LambdaRuntime {
    collection;
    constructor(collection) {
        this.collection = collection;
    }
    /**
     * Execute a Lambda operation
     *
     * @param codeOrPath - For Lambda runtime, this is the term hash to operate on
     * @param context - Additional context (varies by operation)
     * @param config - Lambda configuration with operation type
     * @param chapterDir - Chapter directory (used for relative paths if needed)
     */
    async execute(codeOrPath, context, config, chapterDir) {
        let termHash = codeOrPath;
        const lambdaConfig = config;
        const ctx = (context && typeof context === 'object')
            ? context
            : {};
        // Auto-parse expression if provided directly
        if (termHash && (termHash.includes('\\') || termHash.includes('λ') || termHash.includes(' ') || termHash.includes('('))) {
            try {
                // If it looks like an expression, parse it first
                // usage of static function at bottom of file
                termHash = await parseLambdaExpression(this.collection, termHash);
            }
            catch (e) {
                // Determine if we should fail or treat as hash?
                // Hashes don't have spaces or parens, so failure here is likely real error
                return {
                    success: false,
                    error: `Failed to parse input expression: ${e instanceof Error ? e.message : String(e)}`
                };
            }
        }
        try {
            switch (lambdaConfig.operation) {
                case 'alpha':
                    return this.doAlphaRename(termHash, lambdaConfig, ctx);
                case 'beta':
                    return this.doBetaReduce(termHash);
                case 'eta-reduce':
                    return this.doEtaReduce(termHash);
                case 'eta-expand':
                    return this.doEtaExpand(termHash, lambdaConfig, ctx);
                case 'normalize':
                    return this.doNormalize(termHash, lambdaConfig);
                case 'step':
                    return this.doStep(termHash, lambdaConfig);
                case 'alpha-equiv':
                    return this.doAlphaEquiv(termHash, lambdaConfig, ctx);
                case 'eta-equiv':
                    return this.doEtaEquiv(termHash, lambdaConfig, ctx);
                case 'alpha-norm':
                    return this.doAlphaNormalize(termHash);
                case 'eta-norm':
                    return this.doEtaNormalize(termHash);
                case 'free-vars':
                    return this.doFreeVars(termHash);
                case 'is-closed':
                    return this.doIsClosed(termHash);
                case 'is-normal':
                    return this.doIsNormal(termHash);
                case 'parse':
                    return this.doParse(ctx);
                case 'pretty':
                    return this.doPretty(termHash);
                case 'build':
                    return this.doBuild(ctx);
                default:
                    return {
                        success: false,
                        error: `Unknown Lambda operation: ${lambdaConfig.operation}`
                    };
            }
        }
        catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : String(err)
            };
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Operation Implementations
    // ─────────────────────────────────────────────────────────────────────────
    async doAlphaRename(termHash, config, ctx) {
        const newName = config.newName || ctx.newName;
        if (!newName) {
            return { success: false, error: 'Alpha rename requires newName parameter' };
        }
        const result = await alphaRename(this.collection, termHash, newName).run();
        if (result.isLeft) {
            return { success: false, error: result.left };
        }
        const pretty = await prettyPrintDeep(this.collection, result.right);
        return {
            success: true,
            result: result.right,
            termHash: result.right,
            prettyPrint: pretty
        };
    }
    async doBetaReduce(termHash) {
        const result = await betaReduce(this.collection, termHash).run();
        if (result.isLeft) {
            return { success: false, error: result.left };
        }
        const pretty = await prettyPrintDeep(this.collection, result.right);
        return {
            success: true,
            result: result.right,
            termHash: result.right,
            prettyPrint: pretty
        };
    }
    async doEtaReduce(termHash) {
        const result = await etaReduce(this.collection, termHash).run();
        if (result.isNothing) {
            return { success: false, error: 'Not an η-redex' };
        }
        const pretty = await prettyPrintDeep(this.collection, result.value);
        return {
            success: true,
            result: result.value,
            termHash: result.value,
            prettyPrint: pretty
        };
    }
    async doEtaExpand(termHash, config, ctx) {
        const freshVar = config.freshVar || ctx.freshVar || 'x';
        const result = await etaExpand(this.collection, termHash, freshVar).run();
        const pretty = await prettyPrintDeep(this.collection, result);
        return {
            success: true,
            result: result,
            termHash: result,
            prettyPrint: pretty
        };
    }
    async doNormalize(termHash, config) {
        const strategy = config.strategy || 'normal';
        const maxSteps = config.maxSteps || 1000;
        const result = await normalize(this.collection, termHash, strategy, maxSteps).run();
        if (result.isLeft) {
            return { success: false, error: result.left };
        }
        const normResult = result.right;
        const pretty = await prettyPrintDeep(this.collection, normResult.normalForm);
        return {
            success: true,
            result: {
                normalForm: normResult.normalForm,
                steps: normResult.steps,
                reductionPath: normResult.reductionPath
            },
            termHash: normResult.normalForm,
            prettyPrint: pretty
        };
    }
    async doStep(termHash, config) {
        const strategy = config.strategy || 'normal';
        const result = await reduceStep(this.collection, termHash, strategy).run();
        if (result.isNothing) {
            return {
                success: true,
                result: { alreadyNormal: true },
                termHash: termHash,
                prettyPrint: await prettyPrintDeep(this.collection, termHash)
            };
        }
        const pretty = await prettyPrintDeep(this.collection, result.value);
        return {
            success: true,
            result: result.value,
            termHash: result.value,
            prettyPrint: pretty
        };
    }
    async doAlphaEquiv(termHash, config, ctx) {
        const compareWith = config.compareWith || ctx.compareWith;
        if (!compareWith) {
            return { success: false, error: 'Alpha equivalence check requires compareWith parameter' };
        }
        const result = await alphaEquivalent(this.collection, termHash, compareWith).run();
        if (result.isLeft) {
            return { success: false, error: result.left };
        }
        return {
            success: true,
            result: { equivalent: result.right }
        };
    }
    async doEtaEquiv(termHash, config, ctx) {
        const compareWith = config.compareWith || ctx.compareWith;
        if (!compareWith) {
            return { success: false, error: 'Eta equivalence check requires compareWith parameter' };
        }
        const result = await etaEquivalent(this.collection, termHash, compareWith).run();
        return {
            success: true,
            result: { equivalent: result }
        };
    }
    async doAlphaNormalize(termHash) {
        const result = await alphaNormalize(this.collection, termHash).run();
        if (result.isLeft) {
            return { success: false, error: result.left };
        }
        const pretty = await prettyPrintDeep(this.collection, result.right);
        return {
            success: true,
            result: result.right,
            termHash: result.right,
            prettyPrint: pretty
        };
    }
    async doEtaNormalize(termHash) {
        const result = await etaNormalize(this.collection, termHash).run();
        const pretty = await prettyPrintDeep(this.collection, result);
        return {
            success: true,
            result: result,
            termHash: result,
            prettyPrint: pretty
        };
    }
    async doFreeVars(termHash) {
        const result = await freeVariables(this.collection, termHash).run();
        if (result.isNothing) {
            return { success: false, error: `Term not found: ${termHash}` };
        }
        return {
            success: true,
            result: { freeVariables: Array.from(result.value) }
        };
    }
    async doIsClosed(termHash) {
        const result = await isClosed(this.collection, termHash).run();
        return {
            success: true,
            result: { closed: result }
        };
    }
    async doIsNormal(termHash) {
        const result = await isNormalForm(this.collection, termHash).run();
        return {
            success: true,
            result: { normalForm: result }
        };
    }
    async doParse(ctx) {
        const expression = ctx.expression;
        if (!expression) {
            return { success: false, error: 'Parse requires expression parameter' };
        }
        try {
            const hash = await parseLambdaExpression(this.collection, expression);
            const pretty = await prettyPrintDeep(this.collection, hash);
            return {
                success: true,
                result: hash,
                termHash: hash,
                prettyPrint: pretty
            };
        }
        catch (err) {
            return {
                success: false,
                error: `Parse error: ${err instanceof Error ? err.message : String(err)}`
            };
        }
    }
    async doPretty(termHash) {
        const pretty = await prettyPrintDeep(this.collection, termHash);
        return {
            success: true,
            result: pretty,
            prettyPrint: pretty
        };
    }
    async doBuild(ctx) {
        const spec = ctx.term;
        if (!spec) {
            return { success: false, error: 'Build requires term specification' };
        }
        const hash = await storeTerm(this.collection, spec);
        const pretty = await prettyPrintDeep(this.collection, hash);
        return {
            success: true,
            result: hash,
            termHash: hash,
            prettyPrint: pretty
        };
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Simple Parser for Lambda Expressions
// ─────────────────────────────────────────────────────────────────────────────
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
export async function parseLambdaExpression(collection, expression) {
    const tokens = tokenize(expression);
    let pos = 0;
    function peek() {
        return pos < tokens.length ? tokens[pos] : null;
    }
    function consume() {
        if (pos >= tokens.length)
            throw new Error('Unexpected end of expression');
        return tokens[pos++];
    }
    function expect(token) {
        const actual = consume();
        if (actual !== token) {
            throw new Error(`Expected '${token}', got '${actual}'`);
        }
    }
    async function parseExpr() {
        const terms = [];
        while (peek() && peek() !== ')') {
            terms.push(await parseTerm());
        }
        if (terms.length === 0) {
            throw new Error('Empty expression');
        }
        // Left-associate applications: a b c = ((a b) c)
        let result = terms[0];
        for (let i = 1; i < terms.length; i++) {
            const app = mkApp(result, terms[i]);
            result = await storeTerm(collection, app);
        }
        return result;
    }
    async function parseTerm() {
        const token = peek();
        if (token === '\\' || token === 'λ') {
            return parseAbstraction();
        }
        if (token === '(') {
            consume(); // (
            const expr = await parseExpr();
            expect(')');
            return expr;
        }
        // Variable
        const name = consume();
        if (!name.match(/^[a-zA-Z_][a-zA-Z0-9_']*$/)) {
            throw new Error(`Invalid variable name: ${name}`);
        }
        const varTerm = mkVar(name);
        return storeTerm(collection, varTerm);
    }
    async function parseAbstraction() {
        consume(); // \ or λ
        const param = consume();
        if (!param.match(/^[a-zA-Z_][a-zA-Z0-9_']*$/)) {
            throw new Error(`Invalid parameter name: ${param}`);
        }
        expect('.');
        const body = await parseExpr();
        const abs = mkAbs(param, body);
        return storeTerm(collection, abs);
    }
    return parseExpr();
}
function tokenize(expression) {
    const tokens = [];
    let i = 0;
    while (i < expression.length) {
        const ch = expression[i];
        // Skip whitespace
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        // Single-character tokens
        if ('()\\λ.'.includes(ch)) {
            tokens.push(ch);
            i++;
            continue;
        }
        // Identifiers
        if (/[a-zA-Z_]/.test(ch)) {
            let name = '';
            while (i < expression.length && /[a-zA-Z0-9_']/.test(expression[i])) {
                name += expression[i++];
            }
            tokens.push(name);
            continue;
        }
        throw new Error(`Unexpected character: ${ch}`);
    }
    return tokens;
}
//# sourceMappingURL=LambdaRuntime.js.map