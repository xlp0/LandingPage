const express = require('express');
const axios = require('axios');
const router = express.Router();

const ZITADEL_DOMAIN = process.env.ZITADEL_DOMAIN || 'vpn.pkc.pub';
const CLIENT_ID = process.env.ZITADEL_CLIENT_ID || '348213051452882951';
const CLIENT_SECRET = process.env.ZITADEL_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://henry.pkc.pub/auth-callback-enhanced.html';

/**
 * POST /api/auth/token
 * Exchange authorization code for access token and user info
 */
router.post('/token', async (req, res) => {
  try {
    const { code, codeVerifier, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    console.log('[Auth] Exchanging code for token...');
    console.log('[Auth] Code verifier:', codeVerifier ? 'present' : 'missing');

    // Step 1: Exchange code for access token
    const tokenParams = {
      grant_type: 'authorization_code',
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri || REDIRECT_URI
    };

    // Add PKCE code verifier if provided
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenResponse = await axios.post(
      `https://${ZITADEL_DOMAIN}/oauth/v2/token`,
      new URLSearchParams(tokenParams),
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
