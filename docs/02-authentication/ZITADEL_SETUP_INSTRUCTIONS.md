# ZITADEL Setup Instructions for Monopoly Game

## Complete Step-by-Step Configuration Guide

### 🎯 ZITADEL Application Configuration

Follow these exact steps in the ZITADEL Console at **https://zit.pkc.pub**:

---

## Step 1: Name and Type

### Name of the application
```
Monopoly PKC Game
```

### Type of application
Select: **`UA` (User Agent)**

**Why User Agent?**
- Single Page Application (SPA) running in the browser
- No backend server component
- Client-side JavaScript application

---

## Step 2: Authentication Method

Select: **`PKCE`** (Proof Key for Code Exchange)

**Why PKCE?**
- ✅ Most secure for browser-based applications
- ✅ No client secret required (can't be kept secret in browser)
- ✅ Protects against authorization code interception
- ✅ Industry standard for SPAs

**Do NOT select:**
- ❌ Implicit Flow (deprecated and less secure)

---

## Step 3: Redirect URIs

### Development Mode
**Enable Development Mode** to allow `http://` URIs for local testing

### Redirect URIs
Add these URIs (one per line):

**For Local Development:**
```
http://localhost:3000/public/examples/games/monopoly-auth.html
```

**For Production Deployment:**
```
https://pkc.pub/public/examples/games/monopoly-auth.html
```

### Post Logout URIs
Add these URIs (one per line):

**For Local Development:**
```
http://localhost:3000
```

**For Production Deployment:**
```
https://pkc.pub
```

⚠️ **Important:**
- URIs must match **exactly** - including paths and trailing slashes
- `http://` only works with Development Mode enabled
- Production should always use `https://`
- You can add both local and production URIs at the same time

---

## Step 4: Overview and Create

1. **Review all settings:**
   - Name: `Monopoly PKC Game`
   - Type: `User Agent`
   - Auth Method: `PKCE`
   - Redirect URIs: Both local and production
   - Post Logout URIs: Both local and production

2. **Click "Create"**

3. **Copy your Client ID** immediately - you'll need this!

---

## 📋 Complete Configuration Summary

```yaml
Application Name:        Monopoly PKC Game
Application Type:        User Agent (UA)
Authentication Method:   PKCE
Development Mode:        ✅ Enabled

Redirect URIs:
  - http://localhost:3000/public/examples/games/monopoly-auth.html
  - https://pkc.pub/public/examples/games/monopoly-auth.html

Post Logout URIs:
  - http://localhost:3000
  - https://pkc.pub
```

---

## 🔧 After Creating the Application

### 1. Copy Your Client ID

After clicking "Create", ZITADEL will display your **Client ID**. It looks like:
```
123456789012345678@your-project
```

**Copy this immediately!**

### 2. Update Configuration File

Edit `public/config/zitadel-config.js`:

```javascript
const ZITADEL_CONFIG = {
  issuer: 'https://zit.pkc.pub',
  clientId: '123456789012345678@your-project', // ← Paste your Client ID here
  redirectUri: window.location.origin + window.location.pathname,
  scope: 'openid profile email'
};
```

### 3. Test Locally

```bash
# Start development server
npm run dev

# Open browser
http://localhost:3000/app.html

# Navigate to: Apps → Monopoly (Auth)
```

You should see the login screen. Click "Login with ZITADEL" to test the flow.

### 4. Deploy to Production

Once tested locally, deploy to **https://pkc.pub**

The same configuration will work because:
- Both URIs are registered in ZITADEL
- `redirectUri` is dynamic based on `window.location.origin`

---

## 🔐 Security Notes

### Development Mode
- **Enable** for local development (`http://localhost`)
- **Keep enabled** even in production if you need both environments
- ZITADEL will still enforce HTTPS for production URIs

### URI Validation
ZITADEL strictly validates redirect URIs:
- Must match exactly what's registered
- Protocol (`http://` vs `https://`) must match
- Path must match exactly
- Query parameters are allowed

### Client ID
- **Not a secret** - safe to include in client-side code
- Uniquely identifies your application
- Required for all authentication requests

---

## 🧪 Testing the Integration

### Test Checklist

**Local Development:**
- [ ] Access http://localhost:3000/app.html
- [ ] Click Apps → Monopoly (Auth)
- [ ] See login screen
- [ ] Click "Login with ZITADEL"
- [ ] Redirected to https://zit.pkc.pub
- [ ] Enter credentials
- [ ] Redirected back to http://localhost:3000/public/examples/games/monopoly-auth.html
- [ ] See user profile header
- [ ] Game loads successfully
- [ ] Test logout

**Production:**
- [ ] Access https://pkc.pub/app.html
- [ ] Click Apps → Monopoly (Auth)
- [ ] Complete same flow as above
- [ ] Verify HTTPS throughout

---

## 🐛 Troubleshooting

### Error: "Invalid redirect URI"
**Cause:** URI in ZITADEL doesn't match exactly
**Solution:** 
- Check for typos
- Verify protocol (`http://` vs `https://`)
- Check trailing slashes
- Ensure Development Mode is enabled for `http://`

### Error: "Client not found"
**Cause:** Client ID is incorrect
**Solution:**
- Verify you copied the entire Client ID
- Check for extra spaces
- Ensure it includes the `@project-name` suffix

### Error: "CORS error"
**Cause:** Browser blocking cross-origin requests
**Solution:**
- This shouldn't happen with proper ZITADEL setup
- Check browser console for details
- Verify ZITADEL allows your domain

### Login works locally but not in production
**Cause:** Production URI not registered
**Solution:**
- Verify `https://pkc.pub/public/examples/games/monopoly-auth.html` is in Redirect URIs
- Check for typos in domain name
- Ensure HTTPS is used

---

## 📚 Additional Resources

- [ZITADEL Documentation](https://zitadel.com/docs)
- [OIDC/OAuth 2.0 Guide](https://zitadel.com/docs/guides/integrate/login/oidc/login-users)
- [PKCE Explained](https://oauth.net/2/pkce/)
- Full integration guide: `docs/ZITADEL_INTEGRATION_GUIDE.md`

---

## ✅ Quick Reference

**ZITADEL Console:** https://zit.pkc.pub

**Application Settings:**
```
Name:      Monopoly PKC Game
Type:      User Agent (UA)
Auth:      PKCE
Dev Mode:  ✅ Enabled
```

**URIs to Register:**
```
Redirect:
  http://localhost:3000/public/examples/games/monopoly-auth.html
  https://pkc.pub/public/examples/games/monopoly-auth.html

Post Logout:
  http://localhost:3000
  https://pkc.pub
```

**Configuration File:** `public/config/zitadel-config.js`
```javascript
clientId: 'YOUR_CLIENT_ID_HERE' // ← Update this
```

---

That's it! Your Monopoly game will now require ZITADEL authentication on both local and production environments. 🎲🔐
