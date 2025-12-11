# Backend Implementation - OAuth2 Token Exchange

## Overview

This guide provides the complete backend implementation to exchange the Zitadel authorization code for real user data.

---

## Step 1: Install Dependencies

```bash
npm install axios dotenv cors express
```

---

## Step 2: Create .env File

```env
# Zitadel Configuration
ZITADEL_CLIENT_ID=348213051452882951
ZITADEL_CLIENT_SECRET=your_actual_client_secret_from_zitadel
ZITADEL_DOMAIN=vpn.pkc.pub
REDIRECT_URI=https://henry.pkc.pub/auth-callback-enhanced.html

# Server Configuration
PORT=3000
NODE_ENV=production
```

---

## Step 3: Create Auth Routes

Create `routes/auth.js`:

```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

const ZITADEL_DOMAIN = process.env.ZITADEL_DOMAIN || 'vpn.pkc.pub';
const CLIENT_ID = process.env.ZITADEL_CLIENT_ID;
const CLIENT_SECRET = process.env.ZITADEL_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

/**
 * POST /api/auth/token
 * Exchange authorization code for access token and user info
 */
router.post('/token', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    console.log('[Auth] Exchanging code for token...');

    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post(
      `https://${ZITADEL_DOMAIN}/oauth/v2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri || REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    console.log('[Auth] Access token received');

    // Step 2: Fetch user info from Zitadel
    const userResponse = await axios.get(
      `https://${ZITADEL_DOMAIN}/oidc/v1/userinfo`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );

    const { sub, name, email, picture, email_verified } = userResponse.data;

    console.log('[Auth] User info retrieved:', { sub, name, email });

    // Step 3: Return user data to frontend
    res.json({
      user: {
        id: sub,
        name: name || 'User',
        email: email,
        avatar: picture,
        status: 'online',
        emailVerified: email_verified
      },
      token: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in
    });

  } catch (error) {
    console.error('[Auth] Token exchange error:', error.response?.data || error.message);
    
    res.status(400).json({
      error: 'Authentication failed',
      details: error.response?.data?.error_description || error.message
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    console.log('[Auth] Refreshing token...');

    const response = await axios.post(
      `https://${ZITADEL_DOMAIN}/oauth/v2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    console.log('[Auth] Token refreshed');

    res.json({
      token: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in
    });

  } catch (error) {
    console.error('[Auth] Token refresh error:', error.response?.data || error.message);
    
    res.status(400).json({
      error: 'Token refresh failed',
      details: error.response?.data?.error_description || error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke tokens
 */
router.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;

    if (token) {
      // Revoke token at Zitadel
      await axios.post(
        `https://${ZITADEL_DOMAIN}/oauth/v2/revoke`,
        new URLSearchParams({
          token: token,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('[Auth] Token revoked');
    }

    res.json({ success: true });

  } catch (error) {
    console.error('[Auth] Logout error:', error.message);
    // Don't fail logout if revocation fails
    res.json({ success: true });
  }
});

module.exports = router;
```

---

## Step 4: Update Express Server

Update your `server.js` or `app.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://henry.pkc.pub'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
```

---

## Step 5: Update Frontend

Add this to `landing-enhanced.html` in the script section:

```javascript
async function exchangeCodeForToken() {
  const code = localStorage.getItem('auth_code');
  const user = storage.getUser();
  
  // Only exchange if we have a code and haven't already done so
  if (!code || !user?.requiresBackendExchange) {
    console.log('[App] No code to exchange or already exchanged');
    return;
  }
  
  try {
    console.log('[App] Exchanging authorization code for real user data...');
    
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        redirectUri: window.location.origin + '/auth-callback-enhanced.html'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || `Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[App] Real user data received:', data.user);
    
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
    
    // Remove the code since we've used it
    localStorage.removeItem('auth_code');
    
    console.log('[App] Redux store updated with real user data');
    console.log('[App] Redux auth state:', store.getState().auth);
  } catch (error) {
    console.error('[App] Token exchange failed:', error);
    // Keep temporary data if exchange fails
  }
}

// Call this after app initialization
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  // Exchange code for real user data after a short delay
  setTimeout(() => {
    exchangeCodeForToken();
  }, 500);
});
```

---

## Step 6: Test the Implementation

### Test Flow:
```
1. Open http://localhost:3000/landing-enhanced.html
2. Click "Login" button
3. Authenticate with Zitadel
4. Check console logs:
   - "[Auth] Exchanging code for token..."
   - "[Auth] Access token received"
   - "[Auth] User info retrieved: {sub, name, email}"
   - "[App] Real user data received: {id, name, email, ...}"
5. Check Redux store: window.app.store.getState().auth
6. Should show REAL user name and email from Zitadel
```

### Expected Redux State:
```javascript
{
  auth: {
    isAuthenticated: true,
    user: {
      id: "real-user-id-from-zitadel",
      name: "John Doe",           // Real name!
      email: "john.doe@example.com", // Real email!
      avatar: "https://...",
      status: "online",
      emailVerified: true
    },
    token: "eyJhbGc...",
    refreshToken: "...",
    loading: false,
    error: null,
    loginMethod: "zitadel"
  }
}
```

---

## Security Checklist

- [ ] Client secret stored in `.env` file
- [ ] `.env` file added to `.gitignore`
- [ ] HTTPS enabled in production
- [ ] CORS properly configured
- [ ] Token refresh implemented
- [ ] Logout revokes tokens
- [ ] Error messages don't expose sensitive info
- [ ] Input validation on all endpoints

---

## Troubleshooting

### "Invalid client secret"
- Verify `ZITADEL_CLIENT_SECRET` is correct
- Check it matches Zitadel admin console

### "Invalid redirect URI"
- Verify `REDIRECT_URI` matches Zitadel configuration
- Should be: `https://henry.pkc.pub/auth-callback-enhanced.html`

### "CORS error"
- Check CORS configuration in Express
- Verify frontend domain is in allowed origins

### "User info not returned"
- Check access token is valid
- Verify Zitadel userinfo endpoint is accessible
- Check user has email scope

---

## Next Steps

1. ✅ Implement `/api/auth/token` endpoint
2. ✅ Test token exchange
3. ✅ Verify real user data in Redux
4. ⏳ Implement token refresh logic
5. ⏳ Implement logout with token revocation
6. ⏳ Add error handling and retry logic
7. ⏳ Deploy to production with HTTPS

---

## References

- [Zitadel OAuth2 Documentation](https://zitadel.com/docs)
- [Express.js Guide](https://expressjs.com/)
- [Axios Documentation](https://axios-http.com/)
- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
