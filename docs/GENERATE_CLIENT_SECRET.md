# How to Generate Client Secret in Zitadel

## 📍 You Are Here

You're in the **THK Mesh** application page. You can see:
- **Application Name:** landingtest
- **Type:** Web
- **Status:** Active
- **Client ID:** 348213051452882951

---

## ✅ Step 1: Click "Configuration"

On the page you're viewing, look for tabs at the top:
- **Configuration** ← Click this
- Token Settings
- Redirect Settings
- Additional Origins/URLs

Click the **Configuration** tab.

---

## ✅ Step 2: Look for "Client Credentials"

After clicking Configuration, scroll down to find the **Client Credentials** section.

You should see something like:
```
Client Credentials
├─ Client ID: 348213051452882951
├─ Client Secret: [HIDDEN or GENERATE button]
└─ [Generate New Secret button]
```

---

## ✅ Step 3: Generate Secret

You have two options:

### Option A: If you see a "Generate" button
- Click the **Generate** button next to Client Secret
- A new secret will be created

### Option B: If you see an existing secret
- There might be a **"Generate New Secret"** button
- Click it to create a new secret

---

## ✅ Step 4: Copy the Secret

After generating:
1. The secret will appear (usually in a modal or on the page)
2. Click the **Copy** button next to it
3. Or select and copy the entire secret string

**⚠️ Important:** Copy the ENTIRE secret string exactly as shown!

---

## ✅ Step 5: Paste into .env File

Open `.env` file in your project and update:

**Before:**
```env
ZITADEL_CLIENT_SECRET=your_actual_client_secret_from_zitadel
```

**After:**
```env
ZITADEL_CLIENT_SECRET=<paste_the_secret_you_copied>
```

Example (this is NOT real):
```env
ZITADEL_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## ✅ Step 6: Rebuild Docker

```bash
docker-compose down && docker-compose up -d --build
```

---

## 🧪 Step 7: Test

1. Open http://localhost:3000/landing-enhanced.html
2. Click "Login"
3. Authenticate with Zitadel
4. Check Redux store:
   ```javascript
   window.app.store.getState().auth
   ```
5. Should show real user data!

---

## 📸 Visual Guide

### In Zitadel Admin Console:

```
Applications
  └─ THK Mesh (landingtest)
      ├─ Configuration ← CLICK HERE
      │   └─ Client Credentials
      │       ├─ Client ID: 348213051452882951
      │       ├─ Client Secret: [HIDDEN]
      │       └─ [Generate] ← CLICK HERE
      │
      ├─ Token Settings
      ├─ Redirect Settings
      └─ Additional Origins/URLs
```

---

## ⚠️ Important Notes

✅ **Keep it Secret:**
- Never share your client secret
- Never commit `.env` to git
- Only use on backend (in Docker)

✅ **Copy Exactly:**
- Include all characters
- No extra spaces
- Match exactly what Zitadel shows

✅ **Regenerate if Needed:**
- You can generate a new secret anytime
- Old secrets will stop working
- Useful if secret is compromised

---

## ❓ Still Can't Find It?

If you can't find the Client Credentials section:

1. Make sure you're on the **Configuration** tab
2. Scroll down to the bottom of the page
3. Look for "Client Credentials" heading
4. If still not visible, try refreshing the page

---

## 🎯 Next Steps

1. ✅ Click **Configuration** tab
2. ✅ Find **Client Credentials** section
3. ✅ Click **Generate** button
4. ✅ Copy the secret
5. ✅ Update `.env` file
6. ✅ Rebuild Docker
7. ✅ Test login

---

**Once you have the secret, OAuth2 will work!** 🚀
