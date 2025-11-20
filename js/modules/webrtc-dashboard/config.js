// Configuration loader for WebRTC Dashboard
// Reads from environment variables and makes them available to the app

export async function loadConfig() {
    try {
        // Try to fetch config from server
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            console.log('[Config] Loaded from server:', config);
            
            // Set global config
            if (config.WEBSOCKET_URL) {
                window.__WEBSOCKET_URL__ = config.WEBSOCKET_URL;
                console.log('[Config] WebSocket URL configured:', config.WEBSOCKET_URL);
            }
            
            return config;
        }
    } catch (error) {
        console.log('[Config] Could not fetch server config:', error.message);
    }
    
    // Fallback: use auto-detection
    console.log('[Config] Using auto-detection for WebSocket URL');
    return {};
}
