# Zitadel Client Secret - Complete Guide

## 📍 Where You Are

You're viewing the **THK Mesh** application in Zitadel Console:
- Application Name: `landingtest`
- Type: `Web`
- Status: `Active`
- Client ID: `348213051452882951`

---

## 🎯 Where to Find Client Secret

### **Option 1: During Application Creation** (If you just created it)
When you first create a web application in Zitadel, a modal appears showing:
```
Client Information
├─ Client ID: 348213051452882951
└─ Client Secret: [SHOWN HERE]
```

**⚠️ Important:** This secret is only shown ONCE. You must copy it immediately!

If you didn't copy it then, you need to **regenerate** it (see below).

---

## 🔄 How to Regenerate Client Secret

Since you didn't copy it during creation, you need to regenerate it:

### **Step 1: Go to Application Settings**

In the Zitadel Console, on your application page:

```
landingtest (Web Application)
├─ Configuration ← CLICK HERE
├─ Token Settings
├─ Redirect Settings
└─ Additional Origins/URLs
```

Click the **Configuration** tab.

### **Step 2: Find Authentication Method**

On the Configuration page, look for:
```
Authentication Method
├─ Client Secret Basic ← This is what you need
├─ [Toggle/Button to change]
└─ Client Credentials Section
```

### **Step 3: Look for "Generate" or "Regenerate" Button**

In the Client Credentials section, you should see:
```
Client ID: 348213051452882951
Client Secret: [HIDDEN or GENERATE button]

[Generate New Secret] button
or
[Regenerate Secret] button
```

### **Step 4: Click Generate/Regenerate**

Click the button to generate a new secret.

A modal will appear with:
```
New Client Secret Generated

Client Secret: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

[Copy] button
[Close] button
```

### **Step 5: Copy the Secret**

Click the **[Copy]** button to copy to clipboard.

**⚠️ Important:** Copy it immediately! It's only shown once.

---

## 📝 Update Your .env File

Once you have the secret:

1. Open `.env` file in your project
2. Find this line:
   ```env
   ZITADEL_CLIENT_SECRET=your_actual_client_secret_from_zitadel
   ```
3. Replace with your actual secret:
   ```env
   ZITADEL_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ```

---

## 🔄 Rebuild Docker

After updating `.env`:

```bash
docker-compose down && docker-compose up -d --build
```

---

## 🧪 Test OAuth Flow

1. Open http://localhost:3000/landing-enhanced.html
2. Click "Login"
3. Authenticate with Zitadel
4. Check console for success logs
5. Verify Redux store shows real user data:
   ```javascript
   window.app.store.getState().auth
   ```

---

## 📸 Visual Navigation in Zitadel Console

```
Zitadel Console
└─ Organizations
   └─ Projects
      └─ Applications
         └─ landingtest (THK Mesh)
            ├─ Configuration ← CLICK HERE
            │  └─ Client Credentials
            │     ├─ Client ID: 348213051452882951
            │     ├─ Client Secret: [HIDDEN]
            │     └─ [Generate New Secret] ← CLICK HERE
            │
            ├─ Token Settings
            ├─ Redirect Settings
            └─ Additional Origins/URLs
```

---

## ⚠️ Important Security Notes

✅ **Secret is Only Shown Once:**
- When first created, secret appears in modal
- If you don't copy it, you must regenerate
- Regenerating invalidates old secret

✅ **Keep it Secret:**
- Never share your client secret
- Never commit `.env` to git
- Only use on backend (in Docker)

✅ **If Compromised:**
- Regenerate immediately
- Old secret stops working
- Update `.env` with new secret

---

## ❓ Troubleshooting

### "I can't find the Configuration tab"
- Make sure you're on the application page (not the project page)
- Refresh the page
- Try clicking on the application name again

### "I don't see Client Credentials section"
- Scroll down on the Configuration page
- Make sure you're on the Configuration tab (not Token Settings)
- Refresh the page

### "The secret I copied doesn't work"
- Make sure you copied the ENTIRE secret
- Check for extra spaces or characters
- Verify it matches exactly what Zitadel shows
- Try regenerating a new secret

### "Still getting 'code_challenge required' error"
- Verify `.env` file has the actual secret (not placeholder)
- Rebuild Docker: `docker-compose down && docker-compose up -d --build`
- Check backend logs: `docker logs landingpage-local`

---

## 🔗 Official Zitadel Documentation

- [ZITADEL Applications Guide](https://zitadel.com/docs/guides/manage/console/applications)
- [OAuth2 Configuration](https://zitadel.com/docs/guides/integrate/login/oidc/login-users)
- [Client Credentials](https://zitadel.com/docs/guides/integrate/service-users/client-credentials)

---

## ✅ Checklist

- [ ] Logged into Zitadel Console
- [ ] Found THK Mesh application
- [ ] Clicked Configuration tab
- [ ] Found Client Credentials section
- [ ] Clicked Generate/Regenerate button
- [ ] Copied the secret
- [ ] Updated `.env` file with secret
- [ ] Rebuilt Docker
- [ ] Tested login flow
- [ ] Verified real user data in Redux

---

**Once you have the secret, OAuth2 will work completely!** 🚀
