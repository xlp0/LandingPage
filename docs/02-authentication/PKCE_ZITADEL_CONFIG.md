# PKCE Configuration in Zitadel

## ⚠️ Possible Issue

The error `invalid code challenge` suggests that Zitadel might not have PKCE enabled for your application, or the code verifier format is incorrect.

## 🔍 Check Zitadel Configuration

### Step 1: Go to Application Settings
1. Open Zitadel Console: https://vpn.pkc.pub
2. Navigate to **Applications** → **THK Mesh**
3. Click **Configuration** tab

### Step 2: Look for PKCE Settings

You should see one of these:
- **PKCE Method:** S256 (SHA-256) ← This is what we need
- **PKCE Required:** Yes/No
- **Code Challenge Method:** S256

### Step 3: Verify Settings

Make sure:
- ✅ PKCE is **enabled** (not disabled)
- ✅ PKCE Method is **S256** (not plain)
- ✅ Code Challenge Method is **S256**

---

## 🔧 If PKCE is Not Enabled

If you don't see PKCE settings or they're disabled:

### Option 1: Enable PKCE in Configuration
1. Look for a toggle or checkbox for "PKCE"
2. Enable it
3. Set method to **S256**
4. Save changes

### Option 2: Check Authentication Method
1. Look for "Authentication Method" section
2. Make sure it's set to **"Client Secret Basic"** or **"None"**
3. NOT "Client Secret Post" (this can conflict with PKCE)

---

## 🧪 Debugging Steps

### Check Frontend Console
Open browser DevTools (F12) and check:
```
[App] Code: present (...)
[App] Code verifier: present (...)
[App] Sending payload to backend: {...}
```

### Check Backend Logs
```bash
docker logs landingpage-local
```

Look for:
```
[Auth] Code verifier: present (...)
[Auth] Including code_verifier in token request
```

### If Code Verifier is Missing
- Check localStorage: `localStorage.getItem('pkce_code_verifier')`
- Should show a 128-character random string

---

## 📋 PKCE Specification

**PKCE (RFC 7636)** requires:
- **Code Verifier:** 43-128 characters, unreserved characters only
- **Code Challenge:** SHA-256 hash of verifier, base64url encoded
- **Challenge Method:** S256 (SHA-256)

Our implementation:
- ✅ Generates 128-character code verifier
- ✅ Uses SHA-256 hash
- ✅ Base64url encodes the hash
- ✅ Sends code_verifier in token request

---

## 🆘 If Still Failing

### Try Without PKCE
If PKCE is causing issues, you can temporarily disable it:

1. In Zitadel, disable PKCE for the application
2. Comment out PKCE code in `js/oauth-handler.js`
3. Test if basic OAuth2 works

### Or Check Zitadel Logs
Zitadel might have more detailed error logs:
1. Check Zitadel admin console logs
2. Look for "code_challenge" errors
3. Verify application configuration

---

## 📚 References

- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)
- [Zitadel OAuth2 Documentation](https://zitadel.com/docs/guides/integrate/login/oidc/login-users)
- [PKCE Security Benefits](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce)

---

## ✅ Checklist

- [ ] Logged into Zitadel admin console
- [ ] Navigated to THK Mesh application
- [ ] Checked Configuration tab
- [ ] Verified PKCE is enabled
- [ ] Verified PKCE method is S256
- [ ] Checked authentication method
- [ ] Tested login flow
- [ ] Checked browser console logs
- [ ] Checked backend logs
- [ ] Verified code verifier in localStorage

---

**If PKCE is enabled in Zitadel and code verifier is being sent, the issue might be with the code verifier format or Zitadel's implementation.** 🔍
