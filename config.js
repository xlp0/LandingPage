/**
 * THK Mesh Configuration
 * 
 * This file contains configuration for the local-first landing page
 * and Zitadel authentication integration.
 */

const CONFIG = {
    // Application metadata
    app: {
        name: 'THK Mesh',
        version: '1.0.0',
        description: 'Local-first, decentralized collaboration platform'
    },

    // Zitadel OAuth2 Configuration
    // These values should be obtained from your Zitadel instance
    oauth: {
        // Zitadel instance domain
        domain: 'zit.pkc.pub',
        
        // OAuth2 endpoints
        authorizationEndpoint: 'https://zit.pkc.pub/oauth/v2/authorization',
        tokenEndpoint: 'https://zit.pkc.pub/oauth/v2/token',
        userInfoEndpoint: 'https://zit.pkc.pub/oauth/v2/userinfo',
        
        // Client configuration (obtained from Zitadel)
        clientId: process.env.ZITADEL_CLIENT_ID || 'YOUR_ZITADEL_CLIENT_ID',
        clientSecret: process.env.ZITADEL_CLIENT_SECRET || 'YOUR_ZITADEL_CLIENT_SECRET',
        
        // Redirect URI (must match Zitadel configuration)
        redirectUri: typeof window !== 'undefined' 
            ? window.location.origin + '/auth-callback.html'
            : 'http://localhost:3000/auth-callback.html',
        
        // OAuth2 scopes
        scopes: ['openid', 'profile', 'email'],
        
        // Response type
        responseType: 'code'
    },

    // Local storage configuration
    storage: {
        // Prefix for all local storage keys
        prefix: 'thk-mesh-',
        
        // Storage keys
        keys: {
            initialized: 'initialized',
            user: 'user',
            authToken: 'auth-token',
            documents: 'documents',
            settings: 'settings'
        }
    },

    // Feature flags
    features: {
        // Enable offline mode
        offlineMode: true,
        
        // Enable P2P connections
        p2pEnabled: true,
        
        // Enable cloud sync (requires authentication)
        cloudSyncEnabled: true,
        
        // Enable end-to-end encryption
        e2eEncryptionEnabled: true
    },

    // Development settings
    dev: {
        // Enable debug logging
        debug: true,
        
        // Mock authentication (for development)
        mockAuth: false,
        
        // Log all local storage operations
        logStorage: true
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
