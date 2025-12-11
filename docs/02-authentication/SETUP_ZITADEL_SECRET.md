# Setup: Add Zitadel Client Secret

## ⚠️ Current Issue

The `.env` file has a placeholder value for `ZITADEL_CLIENT_SECRET`:
```env
ZITADEL_CLIENT_SECRET=your_actual_client_secret_from_zitadel
```

This is why the backend token exchange is failing. You need to replace it with your **actual** client secret from Zitadel.

---

## 🔑 Step 1: Get Client Secret from Zitadel

1. **Open Zitadel Admin Console:**
   - Go to: https://vpn.pkc.pub
   - Login with your admin credentials

2. **Navigate to Application:**
   - Click **Applications** in the sidebar
   - Find **THK Mesh** application
   - Click on it

3. **Find Client Credentials:**
   - Look for **Client Credentials** section
   - You should see:
     - **Client ID:** `348213051452882951`
     - **Client Secret:** `[COPY THIS VALUE]`

4. **Copy the Client Secret:**
   - Click the copy button next to Client Secret
   - Or select and copy the entire secret string

---

## 📝 Step 2: Update .env File

Edit `.env` file in project root:

**Before:**
```env
ZITADEL_CLIENT_SECRET=your_actual_client_secret_from_zitadel
```

**After:**
```env
ZITADEL_CLIENT_SECRET=<paste_your_actual_secret_here>
```

Example (this is NOT a real secret):
```env
ZITADEL_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## 🔄 Step 3: Rebuild Docker

After updating `.env`, rebuild the Docker container:

```bash
docker-compose down && docker-compose up -d --build
```

---

## 🧪 Step 4: Test Again

1. Open http://localhost:3000/landing-enhanced.html
2. Click "Login"
3. Authenticate with Zitadel
4. Check console logs:
   ```
   [Auth] Exchanging code for token...
   [Auth] Access token received
   [Auth] User info retrieved: {sub, name, email}
   [App] Real user data received: {id, name, email, ...}
   ```
5. Check Redux store:
   ```javascript
   window.app.store.getState().auth
   ```
6. Should show **REAL user data** (not pending):
   ```javascript
   {
     user: {
       id: "real-user-id",
       name: "Your Real Name",
       email: "your.email@example.com"
     }
   }
   ```

---

## 🔒 Security Notes

✅ **Keep Secret Safe:**
- Never commit `.env` file to git
- Never share your client secret
- `.env` is already in `.gitignore`

✅ **Backend Only:**
- Client secret is only used on backend
- Never exposed to frontend
- Kept secure in Docker container

---

## ❌ Common Issues

### "Invalid client secret"
- Verify you copied the entire secret
- Check for extra spaces or characters
- Make sure it matches Zitadel exactly

### "Still showing pending user data"
- Verify `.env` file was updated
- Rebuild Docker: `docker-compose down && docker-compose up -d --build`
- Check backend logs: `docker logs landingpage-local`

### "Backend logs show error"
Run this to see backend logs:
```bash
docker logs landingpage-local
```

Look for errors like:
```
[Auth] Token exchange error: ...
```

---

## ✅ Checklist

- [ ] Logged into Zitadel admin console
- [ ] Found THK Mesh application
- [ ] Copied Client Secret
- [ ] Updated `.env` file with actual secret
- [ ] Ran `docker-compose down && docker-compose up -d --build`
- [ ] Tested login flow
- [ ] Verified real user data in Redux store

---

## 📚 Related Documentation

- `docs/OAUTH_IMPLEMENTATION_COMPLETE.md` - Complete OAuth2 setup
- `docs/PKCE_IMPLEMENTATION.md` - PKCE flow details
- `docs/BACKEND_IMPLEMENTATION.md` - Backend code reference

---

**Once you add the client secret, the OAuth2 flow will work completely!** 🚀
