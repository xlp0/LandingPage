// Configuration loader for WebRTC Dashboard
// Reads from environment variables and makes them available to the app

export async function loadConfig() {
    try {
        // Try to fetch config from server
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            console.log('[Config] Loaded from server:', config);
            
            // Set global config for WebSocket
            if (config.WEBSOCKET_URL) {
                window.__WEBSOCKET_URL__ = config.WEBSOCKET_URL;
                console.log('[Config] WebSocket URL configured:', config.WEBSOCKET_URL);
            }
            
            // Set global config for STUN servers
            if (config.STUN_SERVERS && config.STUN_SERVERS.length > 0) {
                window.__STUN_SERVERS__ = config.STUN_SERVERS;
                console.log('[Config] STUN servers configured:');
                config.STUN_SERVERS.forEach((server, index) => {
                    console.log(`   ${index + 1}. ${server.urls}`);
                });
            }
            
            return config;
        }
    } catch (error) {
        console.log('[Config] Could not fetch server config:', error.message);
    }
    
    // Fallback: use auto-detection
    console.log('[Config] Using auto-detection for WebSocket URL and default STUN servers');
    return {};
}
