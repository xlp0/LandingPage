/**
 * Authentication Manager
 * Handles OAuth2 flow, in-memory auth state, and LocalStorage
 */

export class AuthManager {
    constructor() {
        this.oauth = null;
        this.store = null;
        this.authSlice = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        this.initStateStore();
        await this.loadOAuthConfig();
        await this.checkExistingAuth();
        
        this.initialized = true;
        console.log('[AuthManager] Initialized');
    }

    initStateStore() {
        let authState = {
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            loading: false,
            error: null,
            loginMethod: null
        };
        const listeners = new Set();

        this.authSlice = {
            actions: {
                setAuth: (payload) => ({ type: 'auth/setAuth', payload }),
                clearAuth: () => ({ type: 'auth/clearAuth' })
            }
        };

        this.store = {
            getState: () => ({ auth: authState }),
            subscribe: (fn) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
            },
            dispatch: (action) => {
                if (action?.type === 'auth/setAuth') {
                    authState = {
                        ...authState,
                        isAuthenticated: action.payload.isAuthenticated,
                        user: action.payload.user,
                        token: action.payload.token,
                        refreshToken: action.payload.refreshToken,
                        loginMethod: action.payload.loginMethod
                    };
                } else if (action?.type === 'auth/clearAuth') {
                    authState = {
                        ...authState,
                        isAuthenticated: false,
                        user: null,
                        token: null,
                        refreshToken: null,
                        loginMethod: null
                    };
                }
                listeners.forEach((fn) => fn());
                return action;
            }
        };

        // Subscribe to store changes and emit events for UI
        this.store.subscribe(() => {
            const state = this.store.getState().auth;
            if (typeof document !== 'undefined') {
                const event = new CustomEvent('auth:status-changed', {
                    detail: { user: state.user, isAuthenticated: state.isAuthenticated }
                });
                document.dispatchEvent(event);
            }
        });
    }

    async loadOAuthConfig() {
        try {
            console.log('[AuthManager] Loading OAuth config...');
            const response = await fetch('/api/env', { cache: 'no-cache' });
            
            let config = {
                clientId: '348213051452882951',
                domain: 'vpn.pkc.pub',
                redirectUri: window.location.origin + '/auth-callback-enhanced.html'
            };

            if (response.ok) {
                const env = await response.json();
                config = {
                    clientId: env.ZITADEL_CLIENT_ID || config.clientId,
                    domain: env.ZITADEL_DOMAIN || config.domain,
                    redirectUri: env.REDIRECT_URI || config.redirectUri
                };
            }

            // Initialize OAuth2Handler (assumed global from script tag)
            this.oauth = new OAuth2Handler({
                ...config,
                scopes: ['openid', 'profile', 'email'],
                debug: true
            });
            
        } catch (error) {
            console.error('[AuthManager] Config load failed, using defaults', error);
            // Fallback to default initialization if fetch failed
            this.oauth = new OAuth2Handler({
                clientId: '348213051452882951',
                domain: 'vpn.pkc.pub',
                redirectUri: window.location.origin + '/auth-callback-enhanced.html',
                scopes: ['openid', 'profile', 'email'],
                debug: true
            });
        }
    }

    async login() {
        if (!this.oauth) await this.loadOAuthConfig();
        localStorage.setItem('auth_return_url', window.location.pathname);
        await this.oauth.redirectToLogin();
    }

    async logout() {
        console.log('[AuthManager] Logging out...');
        
        this.store.dispatch(this.authSlice.actions.clearAuth());
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_code');
        localStorage.removeItem('pkce_code_verifier');
        localStorage.removeItem('user');

        if (this.oauth) {
            const logoutUrl = `https://${this.oauth.config.domain}/oidc/v1/end_session?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
            window.location.href = logoutUrl;
        } else {
             window.location.reload();
        }
    }

    async checkExistingAuth() {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                this.store.dispatch(this.authSlice.actions.setAuth({
                    isAuthenticated: true,
                    user: user,
                    token: token,
                    refreshToken: localStorage.getItem('refresh_token'),
                    loginMethod: 'zitadel'
                }));
            } catch (e) {
                console.error('[AuthManager] Restore failed', e);
            }
        }

        // Check for code exchange
        const code = localStorage.getItem('auth_code');
        const codeVerifier = localStorage.getItem('pkce_code_verifier');
        if (code && codeVerifier) {
            await this.exchangeCodeForToken(code, codeVerifier);
        }
    }

    async exchangeCodeForToken(code, codeVerifier) {
        if (!this.oauth) {
             await this.loadOAuthConfig();
        }
        
        try {
            const redirectUri = this.oauth?.config?.redirectUri || window.location.origin + '/auth-callback-enhanced.html';
            
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    codeVerifier,
                    redirectUri: redirectUri
                })
            });

            if (!response.ok) throw new Error('Token exchange failed');

            const data = await response.json();
            
            this.store.dispatch(this.authSlice.actions.setAuth({
                isAuthenticated: true,
                user: data.user,
                token: data.token,
                refreshToken: data.refreshToken,
                loginMethod: 'zitadel'
            }));

            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('refresh_token', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.removeItem('auth_code');

            console.log('[AuthManager] Authentication complete');
        } catch (error) {
            console.error('[AuthManager] Exchange error:', error);
        }
    }
}
