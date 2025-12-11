/**
 * CLMRunner - Execute JavaScript logic from CLM specifications
 *
 * Node.js PTR runtime for interpreting Cubical Logic Models
 */
import * as path from 'path';
import { CLMLoader } from './CLMLoader';
import { RuntimeFactory } from './Runtimes';
/**
 * Compare two values with floating-point tolerance for numeric types
 */
function resultsEqual(a, b, tolerance = 1e-9) {
    // Both null or undefined
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    // Numbers - use tolerance
    if (typeof a === 'number' && typeof b === 'number') {
        if (Number.isNaN(a) && Number.isNaN(b))
            return true;
        if (!Number.isFinite(a) || !Number.isFinite(b))
            return a === b;
        return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
    }
    // Arrays - compare element by element
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length)
            return false;
        return a.every((val, i) => resultsEqual(val, b[i], tolerance));
    }
    // Objects - compare properties
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length)
            return false;
        return keysA.every(key => keysB.includes(key) &&
            resultsEqual(a[key], b[key], tolerance));
    }
    // Strings and other types - strict equality
    return a === b;
}
function asObject(input) {
    return typeof input === 'object' && input !== null ? input : {};
}
function buildBaseContext(clm, input) {
    const inputObj = asObject(input);
    return {
        balanced: clm.clm.balanced,
        params: inputObj,
        ...inputObj,
    };
}
function buildRunCLM(chapterDir, runner) {
    return async (clmFile, clmInput) => {
        const fullPath = path.resolve(chapterDir, clmFile);
        const res = await runner.runFile(fullPath, clmInput);
        return res;
    };
}
function buildNetworkContext(clm, input, chapterDir, runner) {
    const baseContext = buildBaseContext(clm, input);
    return {
        ...baseContext,
        input,
        user_input: input,
        secrets: process.env,
        process,
        runCLM: buildRunCLM(chapterDir, runner),
    };
}
export class CLMRunner {
    loader;
    timeout;
    collection;
    constructor(basePath = process.cwd(), timeout = 5000, collection) {
        this.loader = new CLMLoader(basePath);
        this.timeout = timeout;
        this.collection = collection;
    }
    /**
     * Run a CLM directly from a file path
     */
    async runFile(clmPath, input) {
        // Resolve to absolute path to ensure consistent path resolution
        const fullPath = path.isAbsolute(clmPath)
            ? clmPath
            : path.resolve(this.loader.basePath, clmPath);
        const clm = this.loader.load(fullPath);
        const chapterDir = path.dirname(fullPath);
        return this.executeCLM(clm, chapterDir, input || {});
    }
    /**
     * Execute a CLM specification with given input
     */
    async executeCLM(clm, chapterDir, input) {
        const startTime = Date.now();
        const config = clm.clm.concrete;
        const runtimeName = config.runtime || 'javascript';
        // Recursive CLM Support
        if (runtimeName.endsWith('.clm') || runtimeName.endsWith('.yaml') || runtimeName.endsWith('.yml')) {
            return this.executeRecursive(runtimeName, config, chapterDir, input, clm);
        }
        try {
            // Check for built-in loader operation (various ways CLMs specify this)
            const operation = config.operation;
            const builtin = config.builtin;
            const isLoaderBuiltin = builtin === 'loader' || builtin === 'load_files';
            if (operation === 'loader' || runtimeName === 'loader' || runtimeName === 'collection_loader' || isLoaderBuiltin) {
                const targetRuntime = (runtimeName === 'collection_loader') ? 'collection_loader' : 'loader';
                const loaderRuntime = RuntimeFactory.getRuntime(targetRuntime);
                const loaderContext = buildBaseContext(clm, input);
                const result = await loaderRuntime.execute('', loaderContext, config, chapterDir);
                return this.buildExecutionResult(true, result, startTime, clm);
            }
            // Check for Network Builtins
            if (config.builtin && (config.builtin.startsWith('http_') ||
                config.builtin.startsWith('websocket_') ||
                config.builtin.startsWith('queue_') ||
                config.builtin === 'load_url' ||
                config.builtin === 'mcard_send' ||
                config.builtin === 'listen_http' ||
                config.builtin === 'mcard_sync' ||
                config.builtin === 'listen_sync' ||
                config.builtin === 'session_record' ||
                config.builtin === 'mcard_read' ||
                config.builtin === 'run_command' ||
                config.builtin === 'clm_orchestrator' ||
                config.builtin === 'signaling_server' ||
                config.builtin.startsWith('webrtc_'))) {
                const networkRuntime = RuntimeFactory.getRuntime('network', { collection: this.collection });
                const networkContext = buildNetworkContext(clm, input, chapterDir, this);
                const result = await networkRuntime.execute('', networkContext, config, chapterDir);
                return this.buildExecutionResult(true, result, startTime, clm);
            }
            // Check for Handle Builtins
            if (config.builtin === 'handle_version' || config.operation === 'handle_version') {
                const result = await this.executeHandleVersion(input);
                return this.buildExecutionResult(true, result, startTime, clm);
            }
            if (config.builtin === 'handle_prune' || config.operation === 'handle_prune') {
                const result = await this.executeHandlePrune(input);
                return this.buildExecutionResult(true, result, startTime, clm);
            }
            const runtime = RuntimeFactory.getRuntime(runtimeName, { collection: this.collection });
            const codeOrPath = this.resolveCodeOrPath(runtimeName, config, clm, chapterDir, input);
            if (!codeOrPath) {
                if (runtimeName === 'lambda')
                    throw new Error(`Lambda runtime requires input expression or term`);
                throw new Error(`Execution source not found for runtime ${runtimeName}`);
            }
            let executionContext = input;
            if (runtimeName === 'javascript') {
                executionContext = {
                    ...asObject(input),
                    console: console,
                    setTimeout: setTimeout,
                    clearTimeout: clearTimeout,
                    setInterval: setInterval,
                    clearInterval: clearInterval,
                    process: process,
                    runCLM: async (clmFile, clmInput) => {
                        const fullPath = path.resolve(chapterDir, clmFile);
                        const res = await this.runFile(fullPath, clmInput);
                        if (!res.success)
                            throw new Error(res.error || 'CLM execution failed');
                        return res.result;
                    }
                };
            }
            const result = await runtime.execute(codeOrPath, executionContext, config, chapterDir);
            return this.buildExecutionResult(true, result, startTime, clm);
        }
        catch (err) {
            return this.buildExecutionResult(false, undefined, startTime, clm, err instanceof Error ? err.message : String(err));
        }
    }
    resolveCodeOrPath(runtimeName, config, clm, chapterDir, input) {
        if (['rust', 'c'].includes(runtimeName)) {
            let path = config.binary_path;
            if (!path && config.runtimes_config) {
                const rc = config.runtimes_config.find((r) => r.name === runtimeName);
                path = rc?.binary;
            }
            return path || null;
        }
        if (runtimeName === 'wasm') {
            let mod = config.wasm_module;
            if (!mod && config.runtimes_config) {
                const rc = config.runtimes_config.find((r) => r.name === runtimeName);
                mod = rc?.module;
            }
            return mod || null;
        }
        if (runtimeName === 'llm')
            return "llm-prompt";
        if (runtimeName === 'lambda') {
            const inputObj = (typeof input === 'object' && input !== null) ? input : {};
            return inputObj.expression || inputObj.term || "lambda-op";
        }
        return this.loader.loadLogicFile(clm, chapterDir);
    }
    buildExecutionResult(success, result, startTime, clm, error) {
        return {
            success,
            result,
            error,
            executionTime: Date.now() - startTime,
            clm: {
                chapter: clm.chapter.title,
                concept: clm.clm.abstract.concept,
                manifestation: clm.clm.concrete.manifestation,
            }
        };
    }
    /**
     * Verify CLM output against expected result
     */
    async verifyCLM(clm, chapterDir, input, expected) {
        const executionResult = await this.executeCLM(clm, chapterDir, input);
        return {
            verified: executionResult.success &&
                JSON.stringify(executionResult.result) === JSON.stringify(expected),
            expected,
            actual: executionResult.result,
            executionResult,
        };
    }
    /**
     * Run all examples from a CLM specification
     */
    async runExamples(clm, chapterDir) {
        const examples = clm.examples || [];
        const results = [];
        for (const example of examples) {
            const result = await this.executeCLM(clm, chapterDir, example.input);
            results.push({ name: example.name, result });
        }
        return results;
    }
    summarizeExampleRuns(clm, results) {
        let passed = 0;
        const summaryResults = results.map((res, index) => {
            const example = clm.examples?.[index];
            const expected = example?.expected_output;
            const resultContains = example?.result_contains;
            let match = false;
            if (res.result.success) {
                if (resultContains !== undefined) {
                    // Substring match: stringify result and check if it contains the expected substring
                    const resultStr = typeof res.result.result === 'string'
                        ? res.result.result
                        : JSON.stringify(res.result.result);
                    match = resultStr.includes(String(resultContains));
                }
                else if (expected === undefined) {
                    // No expectation defined, success is enough
                    match = true;
                }
                else {
                    // Exact match
                    match = JSON.stringify(res.result.result) === JSON.stringify(expected);
                }
            }
            if (match)
                passed += 1;
            return {
                case: index + 1,
                name: res.name,
                input: example?.input,
                result: res.result.result,
                error: res.result.error,
                expected: resultContains !== undefined ? `contains: ${resultContains}` : expected,
                match,
            };
        });
        return {
            total: summaryResults.length,
            passed,
            results: summaryResults,
        };
    }
    buildCLMBanner(clm) {
        return {
            header: [
                `--- Executing ${clm.chapter.title} ---`,
                `🧊 CLM Cube:`,
                `  - Abstract (Why): ${clm.clm.abstract.concept}`,
                `  - Concrete (How): ${clm.clm.concrete.manifestation}`,
                `  - Balanced (What): ${clm.clm.balanced.expectation}`,
            ],
        };
    }
    buildExecutionReport(clm, execution) {
        return {
            status: execution.success ? 'success' : 'failure',
            result: execution.result,
            error: execution.error,
            chapter_id: clm.chapter.id,
            chapter_title: clm.chapter.title,
        };
    }
    buildSummaryReport(clm, summary) {
        return {
            status: summary.passed === summary.total ? 'success' : 'failure',
            result: {
                success: summary.passed === summary.total,
                total: summary.total,
                results: summary.results.map((r) => ({
                    case: r.case,
                    name: r.name,
                    result: r.result,
                    error: r.error,
                })),
            },
            chapter_id: clm.chapter.id,
            chapter_title: clm.chapter.title,
        };
    }
    async executeRecursive(runtimePath, config, chapterDir, input, originalClm) {
        const startTime = Date.now();
        const boundary = config.boundary || 'intrinsic';
        try {
            const metaClmPath = path.resolve(chapterDir, runtimePath);
            const metaClm = this.loader.load(metaClmPath);
            const metaDir = path.dirname(metaClmPath);
            // Meta-context construction matching Python implementation
            const metaContext = {
                ...((typeof input === 'object' && input !== null) ? input : {}),
                source_pcard_title: originalClm.chapter.title,
                concrete: originalClm.clm.concrete,
                abstract: originalClm.clm.abstract,
                __input_content__: input
            };
            let metaResult;
            if (boundary === 'extrinsic') {
                // Isolated Execution: New Runner instance (simulates separate process/worker)
                // We pass fresh collection to ensure data isolation if strict, 
                // but for now we follow the spec that extrinsic communicates via interface.
                // Re-creating runner isolates in-memory cache and state.
                const isolatedRunner = new CLMRunner(this.loader.basePath, this.timeout, this.collection);
                metaResult = await isolatedRunner.executeCLM(metaClm, metaDir, metaContext);
            }
            else {
                // Intrinsic Execution: Shared Runner context
                metaResult = await this.executeCLM(metaClm, metaDir, metaContext);
            }
            return {
                success: metaResult.success,
                result: metaResult.result,
                error: metaResult.error,
                executionTime: Date.now() - startTime + metaResult.executionTime,
                clm: {
                    chapter: originalClm.chapter.title,
                    concept: originalClm.clm.abstract.concept,
                    manifestation: originalClm.clm.concrete.manifestation,
                    boundary: boundary // Report boundary used
                }
            };
        }
        catch (e) {
            return {
                success: false,
                error: e instanceof Error ? e.message : String(e),
                executionTime: Date.now() - startTime,
                clm: {
                    chapter: originalClm.chapter.title,
                    concept: originalClm.clm.abstract.concept,
                    manifestation: originalClm.clm.concrete.manifestation,
                    boundary: boundary
                }
            };
        }
    }
    /**
     * Execute a CLM across multiple runtimes and verify consensus
     *
     * All runtimes must produce the same result for consensus to be achieved.
     */
    async executeMultiRuntime(clm, chapterDir, input) {
        const startTime = Date.now();
        const config = clm.clm.concrete;
        const runtimesConfig = config.runtimes_config || [];
        if (runtimesConfig.length === 0) {
            return {
                success: false,
                consensus: false,
                results: [],
                error: 'No runtimes_config defined',
                executionTime: Date.now() - startTime,
                clm: {
                    chapter: clm.chapter.title,
                    concept: clm.clm.abstract.concept,
                    manifestation: clm.clm.concrete.manifestation,
                }
            };
        }
        const results = [];
        // Execute on each runtime
        for (const rtConfig of runtimesConfig) {
            const runtimeName = rtConfig.name;
            const rtStartTime = Date.now();
            try {
                const runtime = RuntimeFactory.getRuntime(runtimeName);
                let codeOrPath = null;
                // Determine source based on runtime type
                if (['rust', 'c'].includes(runtimeName)) {
                    codeOrPath = rtConfig.binary || null;
                }
                else if (runtimeName === 'wasm') {
                    codeOrPath = rtConfig.module || null;
                }
                else {
                    // Source-based runtimes (JS, Python, Lean, etc.)
                    const file = rtConfig.file;
                    if (file) {
                        codeOrPath = path.resolve(chapterDir, file);
                    }
                }
                if (!codeOrPath) {
                    results.push({
                        runtime: runtimeName,
                        success: false,
                        error: `No source file/binary specified for ${runtimeName}`,
                        executionTime: Date.now() - rtStartTime
                    });
                    continue;
                }
                // For source file runtimes, read the file content
                let codeContent = codeOrPath;
                if (!['rust', 'c', 'wasm'].includes(runtimeName)) {
                    try {
                        const fs = await import('fs');
                        codeContent = fs.readFileSync(codeOrPath, 'utf-8');
                    }
                    catch (e) {
                        results.push({
                            runtime: runtimeName,
                            success: false,
                            error: `Cannot read source file: ${codeOrPath}`,
                            executionTime: Date.now() - rtStartTime
                        });
                        continue;
                    }
                }
                const result = await runtime.execute(codeContent, input, {
                    ...config,
                    entry_point: rtConfig.entry
                }, chapterDir);
                results.push({
                    runtime: runtimeName,
                    success: true,
                    result,
                    executionTime: Date.now() - rtStartTime
                });
            }
            catch (e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                const isUnavailable = errorMsg.includes('Unknown runtime');
                results.push({
                    runtime: runtimeName,
                    success: false,
                    error: isUnavailable ? `Runtime not available: ${runtimeName}` : errorMsg,
                    executionTime: Date.now() - rtStartTime
                });
            }
        }
        // Check consensus - all successful results must be equal
        // We only require consensus among AVAILABLE runtimes
        const successfulResults = results.filter(r => r.success);
        const availableResults = results.filter(r => r.success || !r.error?.includes('Runtime not available'));
        let consensus = false;
        let consensusValue = undefined;
        if (successfulResults.length > 0) {
            const firstResult = successfulResults[0].result;
            // Use tolerance-based comparison for numeric values
            consensus = successfulResults.every(r => resultsEqual(firstResult, r.result, 1e-9));
            if (consensus) {
                consensusValue = firstResult;
            }
        }
        // Success if at least 2 runtimes succeeded and achieved consensus
        const availableSuccess = successfulResults.length >= 2 && consensus;
        // Also check if all AVAILABLE runtimes succeeded
        const allAvailableSuccess = availableResults.length > 0 &&
            availableResults.every(r => r.success);
        return {
            success: availableSuccess || (allAvailableSuccess && consensus),
            consensus,
            results,
            consensusValue,
            executionTime: Date.now() - startTime,
            clm: {
                chapter: clm.chapter.title,
                concept: clm.clm.abstract.concept,
                manifestation: clm.clm.concrete.manifestation,
            }
        };
    }
    /**
     * Check if a CLM is a multi-runtime CLM
     */
    isMultiRuntime(clm) {
        const runtimesConfig = clm.clm?.concrete?.runtimes_config;
        return Array.isArray(runtimesConfig) && runtimesConfig.length > 0;
    }
    /**
     * Handle versioning builtin: update a handle through multiple versions.
     */
    async executeHandleVersion(ctx) {
        // Check for examples list (batch mode from CLM)
        const examples = ctx.examples || [];
        if (examples.length) {
            return this.runVersionExamples(examples);
        }
        // Single execution mode - check for input wrapper
        const inputData = ctx.input || ctx;
        const handle = inputData.handle || ctx.handle || '';
        const versions = inputData.versions || ctx.versions || [];
        if (!handle) {
            return { success: false, error: 'handle is required' };
        }
        if (!versions.length) {
            return { success: false, error: 'versions list is required' };
        }
        return this.executeVersionSingle(handle, versions);
    }
    async runVersionExamples(examples) {
        const results = [];
        for (const example of examples) {
            const inputData = example.input || example;
            const handle = inputData.handle || '';
            const versions = inputData.versions || [];
            if (!handle || !versions.length) {
                results.push({
                    example_name: example.name || 'unnamed',
                    success: false,
                    error: 'handle and versions required'
                });
                continue;
            }
            const result = await this.executeVersionSingle(handle, versions);
            result.example_name = example.name || 'unnamed';
            // Check expected if provided
            const expected = example.expected_output || {};
            if (expected.history_length !== undefined) {
                result.passed = result.history_length === expected.history_length;
            }
            else {
                result.passed = result.success || false;
            }
            results.push(result);
        }
        const allPassed = results.every(r => r.passed);
        return { success: allPassed, results };
    }
    async executeVersionSingle(handle, versions) {
        const { SqliteNodeEngine } = await import('../../storage/SqliteNodeEngine.js');
        const { CardCollection } = await import('../../model/CardCollection.js');
        const { MCard } = await import('../../model/MCard.js');
        const engine = new SqliteNodeEngine(':memory:');
        const collection = new CardCollection(engine);
        try {
            // Add first version
            const firstContent = versions[0].content || versions[0];
            const card = await MCard.create(firstContent);
            await collection.addWithHandle(card, handle);
            // Apply subsequent updates
            for (let i = 1; i < versions.length; i++) {
                const content = versions[i].content || versions[i];
                const newCard = await MCard.create(content);
                await collection.updateHandle(handle, newCard);
            }
            // Get final state
            const finalCard = await collection.getByHandle(handle);
            const history = await collection.getHandleHistory(handle);
            const finalContent = finalCard ? new TextDecoder().decode(finalCard.content) : null;
            return {
                success: true,
                handle,
                final_hash: finalCard ? finalCard.hash : null,
                final_content: finalContent,
                history_length: history.length,
                history
            };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    /**
     * Handle pruning builtin: prune handle history.
     */
    async executeHandlePrune(ctx) {
        // Check for examples list (batch mode from CLM)
        const examples = ctx.examples || [];
        if (examples.length) {
            return this.runPruneExamples(examples);
        }
        // Single execution mode
        const inputData = ctx.input || ctx;
        const handle = inputData.handle || ctx.handle || '';
        const versions = inputData.versions || ctx.versions || [];
        const pruneType = inputData.prune_type || ctx.prune_type || 'all';
        const olderThanSeconds = inputData.older_than_seconds || ctx.older_than_seconds;
        if (!handle) {
            return { success: false, error: 'handle is required' };
        }
        return this.executePruneSingle(handle, versions, pruneType, olderThanSeconds);
    }
    async runPruneExamples(examples) {
        const results = [];
        for (const example of examples) {
            const inputData = example.input || example;
            const handle = inputData.handle || '';
            const versions = inputData.versions || [];
            const pruneType = inputData.prune_type || 'all';
            const olderThanSeconds = inputData.older_than_seconds;
            if (!handle) {
                results.push({
                    example_name: example.name || 'unnamed',
                    success: false,
                    error: 'handle is required'
                });
                continue;
            }
            const result = await this.executePruneSingle(handle, versions, pruneType, olderThanSeconds);
            result.example_name = example.name || 'unnamed';
            // Check expected if provided
            const expected = example.expected_output || {};
            if (expected.history_after !== undefined) {
                result.passed = result.history_after === expected.history_after;
            }
            else if (expected.deleted !== undefined) {
                result.passed = result.deleted === expected.deleted;
            }
            else {
                result.passed = result.success || false;
            }
            results.push(result);
        }
        const allPassed = results.every(r => r.passed);
        return { success: allPassed, results };
    }
    async executePruneSingle(handle, versions, pruneType, olderThanSeconds) {
        const { SqliteNodeEngine } = await import('../../storage/SqliteNodeEngine.js');
        const { CardCollection } = await import('../../model/CardCollection.js');
        const { MCard } = await import('../../model/MCard.js');
        const engine = new SqliteNodeEngine(':memory:');
        const collection = new CardCollection(engine);
        try {
            // Setup handle with versions if provided
            if (versions.length) {
                const firstContent = versions[0].content || versions[0];
                const card = await MCard.create(firstContent);
                await collection.addWithHandle(card, handle);
                for (let i = 1; i < versions.length; i++) {
                    const content = versions[i].content || versions[i];
                    const newCard = await MCard.create(content);
                    await collection.updateHandle(handle, newCard);
                }
            }
            const historyBefore = (await collection.getHandleHistory(handle)).length;
            let deleted = 0;
            if (pruneType === 'all') {
                deleted = await collection.pruneHandleHistory(handle, { deleteAll: true });
            }
            else if (pruneType === 'older_than' && olderThanSeconds !== undefined) {
                deleted = await collection.pruneHandleHistory(handle, { olderThan: `${olderThanSeconds}s` });
            }
            const historyAfter = (await collection.getHandleHistory(handle)).length;
            return {
                success: true,
                handle,
                history_before: historyBefore,
                deleted,
                history_after: historyAfter
            };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
}
//# sourceMappingURL=CLMRunner.js.map