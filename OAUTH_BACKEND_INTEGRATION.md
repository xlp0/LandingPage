# OAuth2 Backend Integration Guide

## Overview

The landing page uses OAuth2 with Zitadel for authentication. The frontend handles the OAuth flow up to receiving the authorization code, but the backend must complete the token exchange to get real user data.

---

## OAuth2 Flow

### 1. Frontend: Authorization Request
```
User clicks "Login" → Redirects to Zitadel
Zitadel: User authenticates and grants permissions
Zitadel: Redirects to /auth-callback-enhanced.html?code=XXX&state=YYY
```

### 2. Frontend: Authorization Code Received
```
auth-callback-enhanced.html receives code
Stores code in localStorage (auth_code)
Stores temporary user data with requiresBackendExchange: true
Redirects to landing-enhanced.html
```

### 3. Backend: Token Exchange (REQUIRED)
```
Frontend sends code to backend: POST /api/auth/token
Backend exchanges code for access token (using client secret)
Backend fetches user info from Zitadel userinfo endpoint
Backend returns real user data and token to frontend
Frontend updates Redux store with real user data
```

---

## Backend Implementation

### Endpoint: POST /api/auth/token

**Request:**
```json
{
  "code": "PvF0FTv4_6RhGo0VA5JMYcA1Sjz4vks4F2yQzFImAHrvTA",
  "redirectUri": "https://henry.pkc.pub/auth-callback-enhanced.html"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-123456",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "avatar": "https://...",
    "status": "online"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600
}
```

### Backend Steps

1. **Exchange Authorization Code for Access Token**
```javascript
const response = await fetch('https://vpn.pkc.pub/oauth/v2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: '348213051452882951',
    client_secret: process.env.ZITADEL_CLIENT_SECRET, // Keep secret on backend!
    redirect_uri: redirectUri
  })
});

const tokenData = await response.json();
// tokenData contains: access_token, token_type, expires_in, etc.
```

2. **Fetch User Info from Zitadel**
```javascript
const userResponse = await fetch('https://vpn.pkc.pub/oidc/v1/userinfo', {
  headers: {
    'Authorization': `Bearer ${tokenData.access_token}`
  }
});

const userData = await userResponse.json();
// userData contains: sub, name, email, picture, etc.
```

3. **Return to Frontend**
```javascript
return {
  user: {
    id: userData.sub,
    name: userData.name,
    email: userData.email,
    avatar: userData.picture,
    status: 'online'
  },
  token: tokenData.access_token,
  refreshToken: tokenData.refresh_token,
  expiresIn: tokenData.expires_in
};
```

---

## Frontend Integration

### Current State (Temporary)
- Authorization code received from Zitadel
- Temporary user data stored
- Flag: `requiresBackendExchange: true`
- User data shows placeholder values

### After Backend Integration
1. Frontend sends code to backend
2. Backend returns real user data
3. Frontend updates Redux store
4. UI displays real user name and email

### Implementation in Frontend

```javascript
// In landing-enhanced.html, after Redux store is initialized:

async function exchangeCodeForToken() {
  const code = localStorage.getItem('auth_code');
  const user = storage.getUser();
  
  if (!code || !user.requiresBackendExchange) {
    return; // Already have real user data
  }
  
  try {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        redirectUri: window.location.origin + '/auth-callback-enhanced.html'
      })
    });
    
    const data = await response.json();
    
    // Update Redux store with real user data
    store.dispatch(authSlice.actions.setAuth({
      isAuthenticated: true,
      user: data.user,
      token: data.token,
      refreshToken: data.refreshToken,
      loginMethod: 'zitadel'
    }));
    
    // Update localStorage
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('refresh_token', data.refreshToken);
    storage.setUser(data.user);
    
    console.log('[App] Real user data received from backend:', data.user);
  } catch (error) {
    console.error('[App] Token exchange failed:', error);
  }
}

// Call this after app initialization
exchangeCodeForToken();
```

---

## Environment Variables

**Backend needs:**
```
ZITADEL_CLIENT_SECRET=your_client_secret_here
ZITADEL_DOMAIN=vpn.pkc.pub
ZITADEL_CLIENT_ID=348213051452882951
```

**Keep client secret secure - NEVER expose in frontend!**

---

## Security Considerations

1. **Client Secret**: Keep on backend only, never send to frontend
2. **Token Storage**: Store in secure HTTP-only cookies or localStorage
3. **HTTPS Only**: Always use HTTPS in production
4. **CORS**: Configure CORS properly for token endpoint
5. **Token Refresh**: Implement token refresh before expiry
6. **Logout**: Clear tokens on both frontend and backend

---

## Testing

### Test Flow
1. Open http://localhost:3000/landing-enhanced.html
2. Click "Login" button
3. Authenticate with Zitadel (or test account)
4. Redirected to auth-callback-enhanced.html
5. Check console for authorization code
6. Redirected back to landing-enhanced.html
7. Check Redux store: `window.app.store.getState().auth`
8. Should show real user data after backend integration

### Current Status
- ✅ OAuth flow working
- ✅ Authorization code received
- ✅ Temporary user data stored
- ⏳ Backend token exchange (TODO)
- ⏳ Real user data (TODO)

---

## Next Steps

1. Implement `/api/auth/token` endpoint in backend
2. Add token exchange logic
3. Fetch real user info from Zitadel
4. Return user data to frontend
5. Update frontend to call backend endpoint
6. Implement token refresh logic
7. Add logout endpoint

---

## References

- [Zitadel OAuth2 Documentation](https://zitadel.com/docs)
- [OpenID Connect](https://openid.net/connect/)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
