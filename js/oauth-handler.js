/**
 * OAuth2 Handler
 * 
 * Manages OAuth2 authentication flow with Zitadel
 */

export class OAuth2Handler {
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
     * Generate authorization URL
     */
    getAuthorizationUrl(state = null) {
        if (!state) {
            state = this.generateState();
            // Store state in local storage for verification (works across origins)
            localStorage.setItem('oauth-state', state);
        }

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: this.responseType,
            scope: this.scopes.join(' '),
            state: state
        });

        const url = `https://${this.domain}/oauth/v2/authorize?${params.toString()}`;
        this.log('Authorization URL:', url);
        return url;
    }

    /**
     * Redirect to authorization endpoint
     */
    redirectToLogin() {
        const authUrl = this.getAuthorizationUrl();
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

            // Verify state
            const storedState = localStorage.getItem('oauth-state');
            if (state !== storedState) {
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
     * Generate PKCE code verifier and challenge
     */
    generatePKCE() {
        const verifier = this.generateState();
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        
        return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const challenge = btoa(String.fromCharCode.apply(null, hashArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            return {
                verifier: verifier,
                challenge: challenge
            };
        });
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

// Export as default
export default OAuth2Handler;
