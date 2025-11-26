/**
 * OAuth2 Handler
 * 
 * Handles OAuth2 authentication flow with Zitadel
 * Manages authorization, token exchange, and callback handling
 */

(function(global) {
    class OAuth2Handler {
        constructor(config = {}) {
            this.domain = config.domain || 'vpn.pkc.pub';
            this.clientId = config.clientId;
            this.clientSecret = config.clientSecret;
            this.redirectUri = config.redirectUri || window.location.origin + '/auth-callback.html';
            this.scopes = config.scopes || ['openid', 'profile', 'email'];
            this.responseType = config.responseType || 'code';
            this.debug = config.debug || false;
        }

    /**
     * Generate PKCE code challenge
     */
    async generatePKCE() {
        console.log('[OAuth] generatePKCE() called');
        try {
            console.log('[OAuth] Generating random string...');
            // Generate random code verifier (43-128 characters)
            const codeVerifier = this.generateRandomString(128);
            console.log('[OAuth] Code verifier generated:', codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'NULL');
            
            // Generate code challenge from verifier using SHA-256
            const encoder = new TextEncoder();
            const data = encoder.encode(codeVerifier);
            
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            
            // Convert to base64url
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashString = String.fromCharCode.apply(null, hashArray);
            const codeChallenge = btoa(hashString)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            console.log('[OAuth] Code challenge generated:', codeChallenge.substring(0, 20) + '...');
            
            return { codeVerifier, codeChallenge };
        } catch (error) {
            console.error('[OAuth] Error generating PKCE:', error);
            throw error;
        }
    }

    /**
     * Generate random string for PKCE
     */
    generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
            result += charset[randomValues[i] % charset.length];
        }
        return result;
    }

    /**
     * Generate authorization URL
     */
    async getAuthorizationUrl(state = null) {
        // Generate PKCE parameters FIRST
        const { codeVerifier, codeChallenge } = await this.generatePKCE();
        
        console.log('[OAuth] Generated code verifier:', codeVerifier);
        console.log('[OAuth] Generated code challenge:', codeChallenge);
        
        if (!codeVerifier || !codeChallenge) {
            throw new Error('Failed to generate PKCE parameters');
        }
        
        // Store code verifier in localStorage
        localStorage.setItem('pkce_code_verifier', codeVerifier);
        this.log('PKCE code verifier stored in localStorage:', codeVerifier.substring(0, 20) + '...');
        
        if (!state) {
            // Encode code verifier in state so it survives the redirect
            const stateData = {
                random: this.generateState(),
                cv: codeVerifier // Store code verifier in state
            };
            state = btoa(JSON.stringify(stateData));
            // Store state in local storage for verification
            localStorage.setItem('oauth-state', state);
        }

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: this.responseType,
            scope: this.scopes.join(' '),
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        const url = `https://${this.domain}/oauth/v2/authorize?${params.toString()}`;
        this.log('Authorization URL:', url);
        return url;
    }

    /**
     * Redirect to authorization endpoint
     */
    async redirectToLogin() {
        const authUrl = await this.getAuthorizationUrl();
        this.log('Redirecting to login...');
        window.location.href = authUrl;
    }

    /**
     * Handle authorization callback
     */
    async handleCallback(params) {
        try {
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');
            const errorDescription = params.get('error_description');

            // Check for errors
            if (error) {
                throw new Error(`OAuth Error: ${error} - ${errorDescription || 'Unknown error'}`);
            }

            // Verify state (if available)
            // Note: State may not be available when redirecting from file:// to https://
            // In production with PKCE, state validation is optional
            const storedState = localStorage.getItem('oauth-state');
            if (storedState && state !== storedState) {
                throw new Error('State mismatch - possible CSRF attack');
            }
            // Clear state after verification
            localStorage.removeItem('oauth-state');

            if (!code) {
                throw new Error('No authorization code received');
            }

            this.log('Authorization code received:', code);

            // In a real application, exchange code for token server-side
            // This is a simplified version for demonstration
            return {
                code: code,
                state: state
            };

        } catch (err) {
            this.log('Error handling callback:', err);
            throw err;
        }
    }

    /**
     * Exchange authorization code for token (server-side operation)
     * This should be called from your backend to keep client secret secure
     */
    async exchangeCodeForToken(code) {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUri,
                client_id: this.clientId,
                client_secret: this.clientSecret
            });

            const response = await fetch(`https://${this.domain}/oauth/v2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`Token exchange failed: ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Token received');
            return data;

        } catch (err) {
            this.log('Error exchanging code for token:', err);
            throw err;
        }
    }

    /**
     * Get user info from token
     */
    async getUserInfo(accessToken) {
        try {
            const response = await fetch(`https://${this.domain}/oauth/v2/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.statusText}`);
            }

            const userInfo = await response.json();
            this.log('User info retrieved:', userInfo);
            return userInfo;

        } catch (err) {
            this.log('Error getting user info:', err);
            throw err;
        }
    }

    /**
     * Generate random state for CSRF protection
     */
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Debug logging
     */
    log(...args) {
        if (this.debug) {
            console.log('[OAuth2Handler]', ...args);
        }
    }
}

    // Export to global
    global.OAuth2Handler = OAuth2Handler;
})(typeof window !== 'undefined' ? window : global);
