/**
 * Auth Module - Modular Authentication
 * 
 * Dynamically loadable authentication module following Cubical Logic Model
 * Can be imported and used by any page without tight coupling
 */

export default class AuthModule {
    constructor(config = {}) {
        this.config = {
            clientId: config.clientId || '348373619962871815',
            domain: config.domain || 'vpn.pkc.pub',
            redirectUri: config.redirectUri || window.location.origin + '/auth-callback-enhanced.html',
            scopes: config.scopes || ['openid', 'profile', 'email'],
            ...config
        };
        
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        
        console.log('[AuthModule] Initialized with config:', this.config);
    }
    
    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        try {
            const token = localStorage.getItem('auth_token');
            const userStr = localStorage.getItem('user');
            
            if (token && userStr) {
                this.token = token;
                this.user = JSON.parse(userStr);
                this.isAuthenticated = true;
                
                console.log('[AuthModule] User authenticated:', this.user);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[AuthModule] Check auth failed:', error);
            return false;
        }
    }
    
    /**
     * Generate PKCE parameters
     */
    async generatePKCE() {
        try {
            // Generate random code verifier
            const codeVerifier = this.generateRandomString(128);
            
            // Generate code challenge from verifier
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
            
            console.log('[AuthModule] PKCE generated');
            
            return { codeVerifier, codeChallenge };
        } catch (error) {
            console.error('[AuthModule] PKCE generation failed:', error);
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
     * Generate state for CSRF protection
     */
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Login - redirect to OAuth provider
     */
    async login() {
        try {
            console.log('[AuthModule] Initiating login...');
            
            // Generate PKCE parameters
            const { codeVerifier, codeChallenge } = await this.generatePKCE();
            
            // Store code verifier
            localStorage.setItem('pkce_code_verifier', codeVerifier);
            
            // Generate state
            const stateData = {
                random: this.generateState(),
                cv: codeVerifier
            };
            const state = btoa(JSON.stringify(stateData));
            localStorage.setItem('oauth-state', state);
            
            // Build authorization URL
            const params = new URLSearchParams({
                client_id: this.config.clientId,
                redirect_uri: this.config.redirectUri,
                response_type: 'code',
                scope: this.config.scopes.join(' '),
                state: state,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            });
            
            const authUrl = `https://${this.config.domain}/oauth/v2/authorize?${params.toString()}`;
            
            console.log('[AuthModule] Redirecting to:', authUrl);
            window.location.href = authUrl;
        } catch (error) {
            console.error('[AuthModule] Login failed:', error);
            throw error;
        }
    }
    
    /**
     * Logout
     */
    async logout() {
        try {
            console.log('[AuthModule] Logging out...');
            
            // Clear local storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('auth_code');
            localStorage.removeItem('pkce_code_verifier');
            localStorage.removeItem('oauth-state');
            
            // Reset state
            this.isAuthenticated = false;
            this.user = null;
            this.token = null;
            
            // Redirect to Zitadel logout
            const logoutUrl = `https://${this.config.domain}/oidc/v1/end_session?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
            window.location.href = logoutUrl;
        } catch (error) {
            console.error('[AuthModule] Logout failed:', error);
            throw error;
        }
    }
    
    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }
    
    /**
     * Get access token
     */
    getToken() {
        return this.token;
    }
    
    /**
     * Check if authenticated
     */
    isAuth() {
        return this.isAuthenticated;
    }
    
    /**
     * Refresh token
     */
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            this.token = data.token;
            localStorage.setItem('auth_token', data.token);
            
            console.log('[AuthModule] Token refreshed');
            return data.token;
        } catch (error) {
            console.error('[AuthModule] Token refresh failed:', error);
            throw error;
        }
    }
}
