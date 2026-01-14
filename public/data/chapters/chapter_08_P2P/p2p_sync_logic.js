
// Logic for P2P Sync
// This script will send a sync_manifest message to the peer once connected

/**
 * Handle successful connection
 */
function onConnect(context) {
    console.log(`[SyncLogic] Connected to peer. Initiating sync protocol.`);

    // In a real implementation using the NetworkRuntime P2P protocol,
    // we would send messages via the data channel.
    // However, the current logic sandbox has limited access to the raw DataChannel.
    // But our NetworkRuntime implementation attaches the protocol handler automatically.

    // If we want to kickstart the sync, we can return a message.
    // The NetworkRuntime handles "message" in config as an initial send.
    // To send SUBSEQUENT messages, we might need a "webrtc_send" builtin or 
    // simply rely on the protocol handler's automatic behavior if this was bidirectional.

    // For this demo, we assume the initial 'message' configured in the CLM acts as the kickstarter.
    // If this function returns an object, it's just the result of the CLM step, not a sent message.

    return {
        status: "connected",
        action: "sync_initiated"
    };
}

/**
 * Handle incoming message
 */
function onMessage(context) {
    const msg = context.input.message;
    console.log(`[SyncLogic] Received message:`, msg);

    // The _setupP2PProtocol in NetworkRuntime handles the actual sync logic (manifest/batch).
    // This callback is for Application-level logic.

    return { status: "received", type: msg.type };
}
