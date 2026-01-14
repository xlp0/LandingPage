
// Logic for P2P Persistence Simulation
// Replicates run-p2p-robot-persistence-demo.ts using batch operations

const humanPhrases = [
    "Initiating contact.", "Please confirm status.", "Uploading mission parameters.",
    "Verify integrity.", "Ignore anomaly.", "Acknowledge.",
    "Requesting system diagnostics.", "Syncing timestamps.", "Checking neural link.",
    "Re-calibrating sensors.", "Packet loss detected, retrying."
];

const robotPhrases = [
    "Status: ONLINE.", "Storage: PERSISTENT.", "Ready for data intake.",
    "Parameters received.", "Archiving to local sector.", "Integrity check: PENDING.",
    "Battery at 98%.", "All systems nominal.", "Writing to disk...", "Uplink stable."
];

async function main() {
    const timestampId = Date.now();
    const sessionId = `clm_robot_session_${timestampId}`;
    console.log(`[PersistenceSim] Starting Session: ${sessionId}`);

    let currentHeadHash = null;

    // Helper to execute a turn (init + add messages + flush) as a BATCH
    // This mirrors the original TypeScript demo pattern
    async function executeTurn(sender, messages) {
        // Build batch operations array
        const operations = [
            { operation: 'init', maxBufferSize: 10, initialHeadHash: currentHeadHash }
        ];

        for (const msg of messages) {
            operations.push({ operation: 'add', sender: sender, content: msg });
        }

        operations.push({ operation: 'flush' });

        // Call generic_session with batch operation
        const batchRes = await context.runCLM('generic_session.yaml', {
            sessionId: sessionId,
            operation: 'batch',
            operations: operations
        });

        if (!batchRes.success) throw new Error(`Batch failed: ${batchRes.error}`);

        const resObj = batchRes.result || batchRes;
        const results = resObj.results;

        // Last result is flush, which contains checkpoint_hash
        const flushResult = results[results.length - 1];
        if (flushResult.checkpoint_hash) {
            currentHeadHash = flushResult.checkpoint_hash;
            console.log(`[${sender}] Checkpoint: ${currentHeadHash.substring(0, 8)}...`);
        }
    }

    try {
        // --- Conversation Loop ---
        const turns = 5;
        for (let i = 0; i < turns; i++) {
            const humanMsg = humanPhrases[Math.floor(Math.random() * humanPhrases.length)];
            const robotMsg = robotPhrases[Math.floor(Math.random() * robotPhrases.length)];

            console.log(`[Turn ${i + 1}] Human: "${humanMsg}"`);
            await executeTurn("Human", [humanMsg]);

            console.log(`[Turn ${i + 1}] Robot: "${robotMsg}"`);
            await executeTurn("Robot-X1", [robotMsg]);
        }

        // --- Summarization ---
        console.log("\n[PersistenceSim] Summarizing...");
        const summaryRes = await context.runCLM('summarize_session.yaml', {
            sessionId: sessionId,
            headHash: currentHeadHash
        });

        if (!summaryRes.success) throw new Error(`Summary failed: ${JSON.stringify(summaryRes.error)}`);

        // Handle batch result structure
        let summaryHash;
        const resObj = summaryRes.result || summaryRes;

        if (resObj && resObj.results) {
            const batchResults = resObj.results;
            const summarizeOpResult = batchResults[batchResults.length - 1];
            summaryHash = summarizeOpResult.summary_hash;
        } else if (resObj && resObj.summary_hash) {
            summaryHash = resObj.summary_hash;
        } else {
            throw new Error(`Unexpected summary result structure: ${JSON.stringify(summaryRes)}`);
        }
        console.log(`[PersistenceSim] Summary Created: ${summaryHash}`);

        // --- Verification (Read back) ---
        const readRes = await context.runCLM('read_card.yaml', {
            hash: summaryHash
        });

        if (!readRes.success) throw new Error(`Read failed: ${readRes.error}`);

        const readResObj = readRes.result || readRes;
        const content = readResObj.content;
        console.log("[PersistenceSim] Summary Content Retrieved:");
        console.log(JSON.stringify(content, null, 2));

        if (content.type === 'p2p_session_summary') {
            console.log(`[PersistenceSim] ✅ Verified Summary Type. Transcript Length: ${content.fullTranscript.length}`);
        } else {
            console.error("[PersistenceSim] ❌ Invalid Summary Content Type");
        }

        return {
            success: true,
            summaryHash,
            transcriptLength: content.fullTranscript.length
        };

    } catch (e) {
        console.error("[PersistenceSim] Error:", e);
        return { success: false, error: e.message };
    }
}

result = main();
