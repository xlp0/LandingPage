
// Logic for Long Session Accumulation Simulation
// Replicates run-p2p-long-session-demo.ts using batch operations

const messagePools = {
    System: [
        "System check initiated.", "Optimization complete.", "Warning: CPU load high.",
        "Garbage collection active.", "Re-routing power.", "Updating firmware.",
        "Ping received.", "Log rotation scheduled.", "Daemon started.", "Connection stable."
    ],
    User: [
        "Hello?", "Can you process this?", "Running diagnostics.", "Where is the file?",
        "Please reboot.", "Access code: 7734.", "Initiating transfer.", "Override command.",
        "Checking status.", "Logout requested."
    ],
    Bot: [
        "Processing.", "I cannot do that, Dave.", "Calculating pi.", "Task queued.",
        "Memory allocated.", "Logic gate open.", "Analyzing input.", "Response generated.",
        "Error 404.", "Sleep mode engaged."
    ]
};

const senders = ['System', 'User', 'Bot'];

function getRandomMessage(sender) {
    const pool = messagePools[sender];
    return pool[Math.floor(Math.random() * pool.length)];
}

async function main() {
    const sessionId = `clm_long_session_${Date.now()}`;
    console.log(`[LongSessionSim] Starting Session: ${sessionId}`);

    // Config
    const TOTAL_MESSAGES = 20;
    const MAX_BUFFER_SIZE = 5;

    let currentHeadHash = null;
    let totalMessages = 0;

    try {
        console.log(`[LongSessionSim] Generating ${TOTAL_MESSAGES} messages...`);

        // Send messages one at a time using batch (init + add + flush)
        // This mirrors the original demo's pulse pattern
        for (let i = 0; i < TOTAL_MESSAGES; i++) {
            const sender = senders[Math.floor(Math.random() * senders.length)];
            const msg = getRandomMessage(sender);

            const operations = [
                { operation: 'init', maxBufferSize: MAX_BUFFER_SIZE, initialHeadHash: currentHeadHash },
                { operation: 'add', sender: sender, content: msg },
                { operation: 'flush' }
            ];

            const batchRes = await context.runCLM('generic_session.yaml', {
                sessionId: sessionId,
                operation: 'batch',
                operations: operations
            });

            if (!batchRes.success) throw new Error(`Batch failed at msg ${i}: ${batchRes.error}`);

            const resObj = batchRes.result || batchRes;
            const results = resObj.results;
            const flushResult = results[results.length - 1];

            if (flushResult.checkpoint_hash) {
                currentHeadHash = flushResult.checkpoint_hash;
            }

            totalMessages++;
            console.log(`[Msg ${i}] ${sender}: "${msg.substring(0, 20)}..." -> ${currentHeadHash ? currentHeadHash.substring(0, 8) + '...' : 'null'}`);
        }

        console.log(`[LongSessionSim] Total Messages: ${totalMessages}. Final Head: ${currentHeadHash}`);

        // Summarize
        console.log("[LongSessionSim] Summarizing accumulated session...");

        const summaryRes = await context.runCLM('summarize_session.yaml', {
            sessionId,
            headHash: currentHeadHash
        });

        if (!summaryRes.success) throw new Error(`Summary failed: ${summaryRes.error}`);

        // Safe result access
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
        console.log(`[LongSessionSim] Summary Hash: ${summaryHash}`);

        // Verify
        const readRes = await context.runCLM('read_card.yaml', { hash: summaryHash });
        if (!readRes.success) throw new Error(`Read failed: ${readRes.error}`);

        const readResObj = readRes.result || readRes;
        const content = readResObj.content;

        console.log("[LongSessionSim] Summary Content:");
        console.log(JSON.stringify(content, null, 2));

        if (content.fullTranscript && content.fullTranscript.length === totalMessages) {
            console.log(`[LongSessionSim] ✅ Verified message count: ${content.fullTranscript.length}`);
        } else {
            console.warn(`[LongSessionSim] ⚠️ Count mismatch. Expected ${totalMessages}, got ${content.fullTranscript ? content.fullTranscript.length : '?'}`);
        }

        return { success: true };

    } catch (e) {
        console.error("[LongSessionSim] Error:", e);
        return { success: false, error: e.message };
    }
}

result = main();
