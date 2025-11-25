# Zitadel OAuth2 Setup Guide

This guide explains how to configure Zitadel (zit.pkc.pub) for authentication with THK Mesh landing page.

## Prerequisites

- Access to Zitadel instance at https://zit.pkc.pub
- Admin credentials for Zitadel
- Your landing page domain (e.g., http://localhost:3000 for development)

## Step 1: Create OAuth2 Application in Zitadel

### 1.1 Log in to Zitadel

1. Navigate to https://zit.pkc.pub
2. Log in with your admin credentials

### 1.2 Create a New Project

1. Go to Projects section
2. Click "Create New Project"
3. Enter project name: "THK Mesh"
4. Click Create

### 1.3 Create OAuth2 Application

1. In the project, click "New Application"
2. Select "Web" as application type
3. Enter application name: "THK Mesh Landing"
4. Click Create

### 1.4 Configure Application Settings

1. Set **Application Type**: Web
2. Set **Authentication Method**: Code (Authorization Code Flow)
3. Add **Redirect URIs**:
   - Development: `http://localhost:3000/auth-callback-enhanced.html`
   - Production: `https://yourdomain.com/auth-callback-enhanced.html`
4. Add **Post Logout Redirect URIs**:
   - Development: `http://localhost:3000/landing-enhanced.html`
   - Production: `https://yourdomain.com/landing-enhanced.html`

### 1.5 Get Client Credentials

1. In the application details, find:
   - **Client ID**: Copy this value
   - **Client Secret**: Copy this value (keep it secret!)

## Step 2: Configure Landing Page

### 2.1 Update Configuration

Edit `landing-enhanced.html` and update the OAuth2 configuration:

```javascript
const oauth = new OAuth2Handler({
    domain: 'zit.pkc.pub',
    clientId: 'YOUR_ZITADEL_CLIENT_ID', // Replace with actual Client ID
    redirectUri: window.location.origin + '/auth-callback-enhanced.html',
    debug: true
});
```

### 2.2 Environment Variables (Recommended)

For production, use environment variables:

```bash
# .env file
ZITADEL_CLIENT_ID=your-client-id
ZITADEL_CLIENT_SECRET=your-client-secret
ZITADEL_DOMAIN=zit.pkc.pub
```

Load in your application:

```javascript
const clientId = process.env.ZITADEL_CLIENT_ID || 'YOUR_ZITADEL_CLIENT_ID';
```

## Step 3: Backend Token Exchange (Recommended)

For production, implement server-side token exchange:

### 3.1 Create Token Exchange Endpoint

```javascript
// backend/routes/auth.js
app.post('/api/auth/callback', async (req, res) => {
    const { code } = req.body;
    
    try {
        // Exchange code for token
        const tokenResponse = await fetch('https://zit.pkc.pub/oauth/v2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.REDIRECT_URI,
                client_id: process.env.ZITADEL_CLIENT_ID,
                client_secret: process.env.ZITADEL_CLIENT_SECRET
            })
        });

        const tokens = await tokenResponse.json();

        // Get user info
        const userResponse = await fetch('https://zit.pkc.pub/oauth/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        const userInfo = await userResponse.json();

        // Return user data and token
        res.json({
            user: userInfo,
            token: tokens.access_token,
            refreshToken: tokens.refresh_token
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
```

### 3.2 Update Frontend Callback Handler

```javascript
// auth-callback-enhanced.html
async function handleAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    // Send code to backend
    const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });

    const data = await response.json();

    // Store user data and token
    storage.setUser(data.user);
    storage.setAuthToken(data.token);

    // Redirect to home
    window.location.href = '/landing-enhanced.html';
}
```

## Step 4: Test the Integration

### 4.1 Local Development

1. Start your local server:
   ```bash
   python -m http.server 3000
   # or
   npx http-server -p 3000
   ```

2. Open http://localhost:3000/landing-enhanced.html

3. Click "Login" button

4. You should be redirected to Zitadel login

5. After login, you should be redirected back to the landing page

### 4.2 Verify Authentication

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Look for `thk-mesh-user` and `thk-mesh-auth-token`
4. Verify user data is stored

## Step 5: Production Deployment

### 5.1 Update Zitadel Configuration

1. In Zitadel, update redirect URIs to your production domain:
   - `https://yourdomain.com/auth-callback-enhanced.html`

2. Update post-logout redirect URI:
   - `https://yourdomain.com/landing-enhanced.html`

### 5.2 Update Landing Page Configuration

Update `landing-enhanced.html`:

```javascript
const oauth = new OAuth2Handler({
    domain: 'zit.pkc.pub',
    clientId: process.env.ZITADEL_CLIENT_ID,
    redirectUri: 'https://yourdomain.com/auth-callback-enhanced.html',
    debug: false // Disable debug in production
});
```

### 5.3 Enable HTTPS

OAuth2 requires HTTPS in production. Use:
- Let's Encrypt for free SSL certificates
- CloudFlare for SSL/TLS
- Your hosting provider's SSL option

### 5.4 Secure Client Secret

Never expose client secret in frontend code:
- Keep it only on backend
- Use environment variables
- Rotate regularly

## Troubleshooting

### Issue: "Invalid redirect_uri"

**Solution**: Verify redirect URI matches exactly in Zitadel config:
- Check protocol (http vs https)
- Check domain and port
- Check path (including .html)

### Issue: "Invalid client_id"

**Solution**: 
- Verify Client ID is correct
- Check it's not the Client Secret
- Verify application is active in Zitadel

### Issue: "CORS error"

**Solution**:
- Token exchange must happen server-side
- Frontend cannot directly call Zitadel token endpoint
- Implement backend endpoint as shown in Step 3

### Issue: "State mismatch"

**Solution**:
- Verify state parameter is being stored and checked
- Check session storage is not cleared
- Verify browser allows session storage

### Issue: Login loop

**Solution**:
- Check redirect URI is correct
- Verify token is being stored
- Check auth status check logic

## Security Best Practices

1. **Never expose client secret** in frontend code
2. **Use HTTPS** in production
3. **Implement PKCE** for public clients
4. **Validate state parameter** to prevent CSRF
5. **Use secure cookies** for tokens (HttpOnly, Secure, SameSite)
6. **Implement token refresh** for long sessions
7. **Add logout endpoint** to invalidate tokens
8. **Monitor for suspicious activity**

## Scopes

Available OAuth2 scopes in Zitadel:

- `openid` - Required for OpenID Connect
- `profile` - User profile information
- `email` - User email address
- `phone` - User phone number
- `address` - User address information

Example:
```javascript
scopes: ['openid', 'profile', 'email']
```

## References

- [Zitadel OAuth2 Documentation](https://zitadel.com/docs/apis/openidconnect)
- [OAuth2 Authorization Code Flow](https://tools.ietf.org/html/rfc6749#section-1.3.1)
- [OpenID Connect](https://openid.net/connect/)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)

## Support

For issues with Zitadel:
- Check Zitadel logs
- Review application settings
- Contact Zitadel support

For issues with landing page:
- Check browser console for errors
- Enable debug mode in OAuth2Handler
- Check local storage for user data
