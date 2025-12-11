# How to Find and Regenerate Client Secret - Visual Guide

## 🎯 You're on the Right Page!

You're viewing the **THK Mesh** application in Zitadel Console. The page shows:
```
landingtest
Web
Status: Active
ID: 348213051452817415
Created: 25. November 2025, 13:05
Changed: 25. November 2025, 13:05
Client Id: 348213051452882951
```

And you see tabs/buttons:
- **Configuration** ← This is what you need!
- Token Settings
- Redirect Settings
- Additional Origins/URLs

---

## 🔍 Step 1: Look for "Configuration" Tab/Button

The tabs should be visible on the page. Look for:
- A horizontal menu/tabs area
- Or a left sidebar with options

**Click on "Configuration"**

---

## 🔄 Step 2: After Clicking Configuration

Once you're in the Configuration section, scroll down and look for:

### **Client Credentials Section**

You should see something like:

```
┌─────────────────────────────────────┐
│ Client Credentials                  │
├─────────────────────────────────────┤
│ Client ID                           │
│ 348213051452882951                  │
│                                     │
│ Client Secret                       │
│ [HIDDEN] or [Generate] button       │
│                                     │
│ [Generate New Secret] button        │
│ or                                  │
│ [Regenerate] button                 │
└─────────────────────────────────────┘
```

---

## 🎬 Step 3: Click the Generate/Regenerate Button

Look for one of these buttons:
- **"Generate"** - If no secret exists yet
- **"Generate New Secret"** - To create a new one
- **"Regenerate"** - To replace the old one
- **"Reset"** - Alternative name

**Click whichever button you see.**

---

## 📋 Step 4: A Modal/Dialog Will Appear

After clicking Generate, a popup should appear showing:

```
┌──────────────────────────────────────┐
│ New Client Secret Generated          │
├──────────────────────────────────────┤
│                                      │
│ Client Secret:                       │
│ abc123def456ghi789jkl012mno345pqr   │
│                                      │
│ [Copy] button                        │
│ [Close] button                       │
│                                      │
│ ⚠️ WARNING:                          │
│ This secret is only shown once!      │
│ Copy it now!                         │
└──────────────────────────────────────┘
```

---

## 📋 Step 5: Copy the Secret

1. Click the **[Copy]** button
2. Or manually select and copy the entire secret string

**⚠️ IMPORTANT:** Copy it immediately! It won't be shown again!

---

## 📝 Step 6: Update Your .env File

Paste the secret into your `.env` file:

```env
ZITADEL_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr
```

Replace `abc123def456ghi789jkl012mno345pqr` with your actual secret.

---

## 🔄 Step 7: Rebuild Docker

```bash
docker-compose down && docker-compose up -d --build
```

---

## ❓ Can't Find the Button?

### **If you don't see a "Generate" button:**

1. **Check if you're on the right page:**
   - You should be on the **THK Mesh** application page
   - Not on the project page
   - Not on the organization page

2. **Try scrolling down:**
   - The Client Credentials section might be below the fold
   - Scroll down on the Configuration page

3. **Look for a "..." menu:**
   - Sometimes there's a three-dot menu (⋮)
   - Click it to see more options
   - Look for "Generate Secret" or similar

4. **Try refreshing:**
   - Refresh the page: `Cmd + R` or `Ctrl + R`
   - Sometimes UI elements don't load properly

5. **Check different tabs:**
   - Try clicking other tabs
   - Then go back to Configuration
   - Sometimes this helps load the UI

---

## 🆘 Still Can't Find It?

If you still can't find the button after trying all above:

1. **Take a screenshot** of what you see
2. **Share it** so I can help locate the exact button
3. **Or try these alternative locations:**
   - Look in "Token Settings" tab
   - Look in "Additional Settings" section
   - Look for a "Credentials" or "Keys" section

---

## ✅ Checklist

- [ ] Navigated to THK Mesh application
- [ ] Clicked "Configuration" tab
- [ ] Scrolled down to find "Client Credentials"
- [ ] Found "Generate" or "Regenerate" button
- [ ] Clicked the button
- [ ] Modal appeared with secret
- [ ] Copied the secret
- [ ] Updated .env file
- [ ] Rebuilt Docker
- [ ] Tested login

---

## 🎯 Expected Result

After completing these steps:

1. Your `.env` file will have the real client secret
2. Docker will be rebuilt with the new secret
3. Login will work properly
4. Redux store will show real user data

---

**If you still have trouble, please share a screenshot of what you see!** 📸
