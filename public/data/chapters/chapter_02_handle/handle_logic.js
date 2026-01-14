const path = require('path');

async function run() {
    try {
        // Dynamic imports for ESM modules
        const mcardPath = path.resolve(process.cwd(), 'mcard-js/dist/index.js');
        const enginePath = path.resolve(process.cwd(), 'mcard-js/dist/storage/SqliteNodeEngine.js');
        const handlePath = path.resolve(process.cwd(), 'mcard-js/dist/model/Handle.js');

        const mcardPkg = await import(mcardPath);
        const { MCard, CardCollection } = mcardPkg;

        const enginePkg = await import(enginePath);
        const { SqliteNodeEngine } = enginePkg;

        const handlePkg = await import(handlePath);
        const { validateHandle } = handlePkg;

        // ---------------------------------------------------------------------
        // Validation Logic
        // ---------------------------------------------------------------------
        async function validateHandleClm(context) {
            const handle = context.handle || '';
            try {
                const normalized = validateHandle(handle);
                return {
                    valid: true,
                    normalized: normalized,
                    original: handle
                };
            } catch (e) {
                return {
                    valid: false,
                    error: e.message,
                    original: handle
                };
            }
        }

        async function runValidationExamples(examples) {
            const results = [];
            for (const ex of examples) {
                const result = await validateHandleClm({ handle: ex.handle });
                result.example_name = ex.name || 'unnamed';
                result.expected_valid = ex.expected_valid;
                result.passed = result.valid === ex.expected_valid;
                results.push(result);
            }
            return results;
        }

        // ---------------------------------------------------------------------
        // Registration Logic
        // ---------------------------------------------------------------------
        async function registerHandle(context) {
            const handle = context.handle || '';
            const content = context.content || '';

            const engine = new SqliteNodeEngine(':memory:');
            const collection = new CardCollection(engine);

            try {
                const card = await MCard.create(content);
                const hashValue = await collection.addWithHandle(card, handle);

                // Verify resolution
                const resolved = await collection.getByHandle(handle);
                let resolvedContent = null;
                if (resolved) {
                    resolvedContent = new TextDecoder().decode(resolved.content);
                }

                return {
                    success: true,
                    hash: hashValue,
                    resolved_content: resolvedContent,
                    matches: resolvedContent === content
                };
            } catch (e) {
                return {
                    success: false,
                    error: e.message
                };
            }
        }

        async function runRegistrationExamples(examples) {
            const results = [];
            for (const ex of examples) {
                const result = await registerHandle({
                    handle: ex.handle,
                    content: ex.content
                });
                result.example_name = ex.name || 'unnamed';
                results.push(result);
            }
            return results;
        }

        // ---------------------------------------------------------------------
        // Versioning Logic
        // ---------------------------------------------------------------------
        async function updateHandle(context) {
            const handle = context.handle || '';
            const versions = context.versions || [];

            if (!versions.length) {
                return { success: false, error: 'No versions provided' };
            }

            const engine = new SqliteNodeEngine(':memory:');
            const collection = new CardCollection(engine);

            try {
                // Add first version
                const firstContent = versions[0].content || versions[0];
                const card = await MCard.create(firstContent);
                await collection.addWithHandle(card, handle);

                // Apply updates
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
                    final_hash: finalCard ? finalCard.hash : null,
                    final_content: finalContent,
                    history_length: history.length,
                    history: history
                };
            } catch (e) {
                return {
                    success: false,
                    error: e.message
                };
            }
        }

        async function runVersioningExamples(examples) {
            const results = [];
            for (const ex of examples) {
                const result = await updateHandle({
                    handle: ex.handle,
                    versions: ex.versions
                });
                result.example_name = ex.name || 'unnamed';
                result.expected_history_length = ex.expected_history_length || 0;
                result.passed = result.history_length === ex.expected_history_length;
                results.push(result);
            }
            return results;
        }

        // ---------------------------------------------------------------------
        // Pruning Logic (retained)
        // ---------------------------------------------------------------------
        async function runPrunningExample(example) {
            const handle = example.handle;
            const versions = example.versions || [];
            const pruneType = example.prune_type || 'none';

            const engine = new SqliteNodeEngine(':memory:');
            const collection = new CardCollection(engine);

            try {
                if (versions.length > 0) {
                    const v1Content = versions[0].content || versions[0];
                    const v1 = await MCard.create(v1Content);
                    await collection.addWithHandle(v1, handle);

                    for (let i = 1; i < versions.length; i++) {
                        const vContent = versions[i].content || versions[i];
                        const v = await MCard.create(vContent);
                        await collection.updateHandle(handle, v);
                    }
                }

                const historyBefore = (await collection.getHandleHistory(handle)).length;
                let deleted = 0;

                if (pruneType === 'all') {
                    deleted = await collection.pruneHandleHistory(handle, { deleteAll: true });
                }

                const historyAfter = (await collection.getHandleHistory(handle)).length;

                const expectedAfter = example.expected_history_after !== undefined ? example.expected_history_after : 0;
                const passed = historyAfter === expectedAfter;

                return {
                    success: true,
                    handle: handle,
                    history_before: historyBefore,
                    deleted: deleted,
                    history_after: historyAfter,
                    example_name: example.name || 'unnamed',
                    passed: passed
                };
            } catch (e) {
                return {
                    success: false,
                    error: e.message,
                    example_name: example.name || 'unnamed',
                    passed: false
                };
            }
        }

        async function runPruningExamples(examples) {
            const results = [];
            for (const ex of examples) {
                results.push(await runPrunningExample(ex));
            }
            return results;
        }


        // ---------------------------------------------------------------------
        // Main Dispatcher
        // ---------------------------------------------------------------------

        let logicResult;

        // Check for operation type
        const operation = context.operation || 'prune'; // Default from previous step, but we should detect better

        // If examples provided, try to infer operation from the first example or context hints
        // But the previous python script used separate entry points (execute_registration_with_examples, etc)
        // Here we have a single entry point code.
        // We can add a 'mode' or rely on specific keys in examples.

        if (context.examples && Array.isArray(context.examples)) {
            const firstEx = context.examples[0];

            if (firstEx.expected_valid !== undefined) {
                // Validation
                const results = await runValidationExamples(context.examples);
                const allPassed = results.every(r => r.passed);
                logicResult = { success: allPassed, results: results };

            } else if (firstEx.expected_history_length !== undefined) {
                // Versioning
                const results = await runVersioningExamples(context.examples);
                const allPassed = results.every(r => r.passed);
                logicResult = { success: allPassed, results: results };

            } else if (firstEx.prune_type !== undefined) {
                // Pruning (existing logic)
                const results = await runPruningExamples(context.examples);
                const allPassed = results.every(r => r.passed);
                logicResult = { success: allPassed, results: results };

            } else if (firstEx.content && firstEx.handle) {
                // Registration (default fallback for simple content+handle)
                const results = await runRegistrationExamples(context.examples);
                const allSuccess = results.every(r => r.success && r.matches);
                logicResult = { success: allSuccess, results: results };
            } else {
                // Fallback or error
                logicResult = { success: false, error: "Unknown example type" };
            }

        } else {
            // Single execution context not supported well yet without mode hint
            // For now assume the old pruning default if params match, or error.
            if (context.handle && context.versions && context.prune_type) {
                logicResult = await runPrunningExample(context);
            } else {
                logicResult = { success: false, error: "Context format not recognized for single execution" };
            }
        }

        result = logicResult;

    } catch (e) {
        result = { success: false, error: e.message + "\\n" + e.stack };
    }
}

await run();
