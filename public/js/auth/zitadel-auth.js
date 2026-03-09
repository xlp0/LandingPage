/**
 * ZITADEL Authentication Module for PKC
 * 
 * Implements OIDC/OAuth 2.0 authentication flow with PKCE
 * Provider: https://zit.pkc.pub
 */

class ZitadelAuth {
  constructor(config) {
    this.issuer = config.issuer || 'https://zit.pkc.pub';
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri || window.location.origin + '/auth/callback';
    this.scope = config.scope || 'openid profile email';
    this.storagePrefix = 'zitadel_';
    
    // User state
    this.user = null;
    this.accessToken = null;
    this.idToken = null;
    this.tokenExpiry = null;
    
    // Load existing session
    this.loadSession();
  }

  /**
   * Generate random string for PKCE
   */
  generateRandomString(length = 43) {
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
   * Generate SHA-256 hash for PKCE challenge
   */
  async sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
  }

  /**
   * Base64 URL encode
   */
  base64UrlEncode(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  async generatePKCE() {
    const codeVerifier = this.generateRandomString(128);
    const hashed = await this.sha256(codeVerifier);
    const codeChallenge = this.base64UrlEncode(hashed);
    
    return {
      codeVerifier,
      codeChallenge
    };
  }

  /**
   * Initiate login flow
   */
  async login() {
    const { codeVerifier, codeChallenge } = await this.generatePKCE();
    const state = this.generateRandomString(32);
    const nonce = this.generateRandomString(32);

    // Store PKCE verifier and state
    sessionStorage.setItem(this.storagePrefix + 'code_verifier', codeVerifier);
    sessionStorage.setItem(this.storagePrefix + 'state', state);
    sessionStorage.setItem(this.storagePrefix + 'nonce', nonce);

    // Build authorization URL
    const authUrl = new URL(`${this.issuer}/oauth/v2/authorize`);
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect to ZITADEL login
    // Use top-level window to avoid iframe blocking (X-Frame-Options: DENY)
    if (window.top !== window.self) {
      window.top.location.href = authUrl.toString();
    } else {
      window.location.href = authUrl.toString();
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`Authentication error: ${error}`);
    }

    // Verify state
    const storedState = sessionStorage.getItem(this.storagePrefix + 'state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Exchange code for tokens
    const codeVerifier = sessionStorage.getItem(this.storagePrefix + 'code_verifier');
    await this.exchangeCodeForTokens(code, codeVerifier);

    // Clean up session storage
    sessionStorage.removeItem(this.storagePrefix + 'code_verifier');
    sessionStorage.removeItem(this.storagePrefix + 'state');
    sessionStorage.removeItem(this.storagePrefix + 'nonce');

    // Remove query parameters from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, codeVerifier) {
    const tokenUrl = `${this.issuer}/oauth/v2/token`;
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokens = await response.json();
    
    this.accessToken = tokens.access_token;
    this.idToken = tokens.id_token;
    this.tokenExpiry = Date.now() + (tokens.expires_in * 1000);

    // Decode ID token to get user info
    this.user = this.parseJWT(this.idToken);

    // Store in localStorage for persistence
    this.saveSession();

    return this.user;
  }

  /**
   * Parse JWT token
   */
  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to parse JWT:', e);
      return null;
    }
  }

  /**
   * Save session to localStorage
   */
  saveSession() {
    if (this.accessToken && this.user) {
      localStorage.setItem(this.storagePrefix + 'access_token', this.accessToken);
      localStorage.setItem(this.storagePrefix + 'id_token', this.idToken);
      localStorage.setItem(this.storagePrefix + 'token_expiry', this.tokenExpiry.toString());
      localStorage.setItem(this.storagePrefix + 'user', JSON.stringify(this.user));
    }
  }

  /**
   * Load session from localStorage
   */
  loadSession() {
    const accessToken = localStorage.getItem(this.storagePrefix + 'access_token');
    const idToken = localStorage.getItem(this.storagePrefix + 'id_token');
    const tokenExpiry = localStorage.getItem(this.storagePrefix + 'token_expiry');
    const userJson = localStorage.getItem(this.storagePrefix + 'user');

    if (accessToken && tokenExpiry && userJson) {
      const expiry = parseInt(tokenExpiry, 10);
      
      // Check if token is still valid
      if (Date.now() < expiry) {
        this.accessToken = accessToken;
        this.idToken = idToken;
        this.tokenExpiry = expiry;
        this.user = JSON.parse(userJson);
      } else {
        // Token expired, clear session
        this.clearSession();
      }
    }
  }

  /**
   * Clear session
   */
  clearSession() {
    this.user = null;
    this.accessToken = null;
    this.idToken = null;
    this.tokenExpiry = null;
    
    localStorage.removeItem(this.storagePrefix + 'access_token');
    localStorage.removeItem(this.storagePrefix + 'id_token');
    localStorage.removeItem(this.storagePrefix + 'token_expiry');
    localStorage.removeItem(this.storagePrefix + 'user');
  }

  /**
   * Logout
   */
  async logout() {
    const idToken = this.idToken;
    this.clearSession();

    // Redirect to ZITADEL logout endpoint
    const logoutUrl = new URL(`${this.issuer}/oidc/v1/end_session`);
    if (idToken) {
      logoutUrl.searchParams.set('id_token_hint', idToken);
    }
    logoutUrl.searchParams.set('post_logout_redirect_uri', window.location.origin);

    window.location.href = logoutUrl.toString();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.user !== null && this.accessToken !== null && Date.now() < this.tokenExpiry;
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
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Get user profile data
   */
  getUserProfile() {
    if (!this.user) return null;
    
    return {
      id: this.user.sub,
      name: this.user.name || this.user.preferred_username || 'Player',
      email: this.user.email,
      picture: this.user.picture,
      username: this.user.preferred_username
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZitadelAuth;
}
