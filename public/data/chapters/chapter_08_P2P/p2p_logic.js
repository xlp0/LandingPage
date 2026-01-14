
// Logic for P2P connection handling
// This script provides handlers for 'on_connect' and 'on_message' events (conceptual)

/**
 * Handle successful connection
 * @param {object} context - Execution context
 * @param {object} event - Connection event data
 */
function onConnect(context) {
    console.log(`[Logic] Connected to peer: ${context.input.peer_id}`);

    // We can return a specific message to send back, or just log
    return {
        status: "connected",
        timestamp: Date.now()
    };
}

/**
 * Handle incoming message
 * @param {object} context - Execution context
 * @param {object} msg - Received message
 */
function onMessage(context) {
    const msg = context.input.message;
    console.log(`[Logic] Received message: ${JSON.stringify(msg)}`);

    if (msg.type === "ping") {
        return { type: "pong", time: Date.now() };
    }

    return { status: "received" };
}
