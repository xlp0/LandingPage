# THK Mesh Landing Page - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: No Setup Required (Recommended for Testing)

1. **Open the landing page directly in your browser:**
   ```
   file:///Users/Henrykoo/Documents/GovTech/THKMesh/LandingPage/landing-enhanced.html
   ```

2. **Or use a local server:**
   ```bash
   cd /Users/Henrykoo/Documents/GovTech/THKMesh/LandingPage
   python -m http.server 3000
   ```
   Then open: http://localhost:3000/landing-enhanced.html

3. **Test offline functionality:**
   - Open DevTools (F12)
   - Go to Network tab
   - Set to "Offline"
   - Navigate between pages - everything still works!

### Option 2: With Zitadel Authentication

1. **Get your Zitadel credentials:**
   - Go to https://zit.pkc.pub
   - Create an OAuth2 application
   - Note your Client ID

2. **Update the configuration:**
   - Open `landing-enhanced.html`
   - Find this line:
     ```javascript
     clientId: 'YOUR_ZITADEL_CLIENT_ID',
     ```
   - Replace with your actual Client ID

3. **Add redirect URI to Zitadel:**
   - In Zitadel, add: `http://localhost:3000/auth-callback-enhanced.html`

4. **Test login:**
   - Click "Login" button
   - You'll be redirected to Zitadel
   - After login, you'll be redirected back

## 📁 File Structure

```
landing-enhanced.html          ← Main landing page (START HERE)
auth-callback-enhanced.html    ← Authentication callback handler
test-offline.html              ← Test offline functionality
config.js                      ← Configuration file
js/
  ├── local-storage-manager.js ← Local storage module
  └── oauth-handler.js         ← OAuth2 authentication module
```

## ✨ Features

### ✅ Works Offline
- Navigate between pages
- View stored documents
- Create new documents
- All data saved locally

### ✅ Local-First Storage
- All data in browser's local storage
- No server required
- ~10MB storage per domain

### ✅ Static Navigation
- Fast, instant page transitions
- No page reloads
- Pure client-side routing

### ✅ Secure Authentication
- OAuth2 with Zitadel
- State parameter for CSRF protection
- Optional cloud sync

## 🧪 Testing

### Test Local Storage
```bash
open test-offline.html
```
Click "Run All Tests" to verify:
- Storage initialization
- Document management
- Settings management
- Data persistence

### Test Offline Mode
1. Open landing page
2. Open DevTools (F12)
3. Network tab → Set to "Offline"
4. Navigate between pages
5. Create a document
6. Everything still works!

### Test Authentication
1. Click "Login" button
2. You'll be redirected to Zitadel
3. Log in with your credentials
4. You'll be redirected back
5. Check DevTools → Application → Local Storage
6. Look for `thk-mesh-user` and `thk-mesh-auth-token`

## 📊 Local Storage

### What Gets Stored

```javascript
// User data
{
  "id": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "authenticated": true
}

// Documents
[
  {
    "id": "doc-456",
    "title": "My Document",
    "content": "...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]

// Settings
{
  "theme": "dark",
  "language": "en"
}
```

### View Storage in Browser

1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Local Storage"
4. Select your domain
5. Look for keys starting with `thk-mesh-`

## 🔐 Security Notes

### ✅ Safe
- Local storage is isolated per domain
- No sensitive data exposed
- CSRF protection via state parameter

### ⚠️ Not Recommended for Production
- Don't store passwords in local storage
- Don't store API keys in local storage
- Use secure cookies for tokens
- Implement server-side token validation

## 🛠️ Customization

### Change Colors

Edit `landing-enhanced.html`:
```css
:root {
    --primary: #667eea;      /* Change this */
    --secondary: #764ba2;    /* Change this */
    --accent: #ffd700;       /* Change this */
}
```

### Change Content

Edit the HTML sections:
- `<div id="page-home">` - Home page content
- `<div id="page-features">` - Features page content
- `<div id="page-about">` - About page content

### Add New Pages

1. Add HTML section:
   ```html
   <div id="page-mypage" class="page">
       <h1>My Page</h1>
   </div>
   ```

2. Add navigation button:
   ```html
   <button onclick="app.navigate('mypage')">My Page</button>
   ```

## 🚀 Deployment

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir .
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy --prod
```

### Deploy to GitHub Pages

```bash
git push origin main
# Enable GitHub Pages in repository settings
```

## 🐛 Troubleshooting

### "Login button doesn't work"
- Check Client ID is set correctly
- Verify redirect URI matches Zitadel config
- Check browser console for errors

### "Local storage not working"
- Check if localStorage is enabled
- Try incognito/private mode
- Check browser privacy settings

### "Offline mode doesn't work"
- Verify data was saved before going offline
- Check DevTools → Application → Local Storage
- Try refreshing the page

### "CORS errors"
- Token exchange must happen server-side
- Don't call Zitadel directly from frontend
- Implement backend endpoint

## 📚 Learn More

- [Local-First Software](https://www.inkandswitch.com/local-first/)
- [Zitadel Documentation](https://zitadel.com/docs)
- [OAuth2 Guide](https://oauth.net/2/)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

## 💡 Next Steps

1. ✅ Test the landing page locally
2. ✅ Configure Zitadel authentication
3. ⏭️ Implement backend token exchange
4. ⏭️ Add cloud sync functionality
5. ⏭️ Integrate P2P features
6. ⏭️ Convert to Progressive Web App (PWA)

## 📞 Support

For issues or questions:
1. Check the console (F12) for error messages
2. Review [LANDING_PAGE_README.md](./LANDING_PAGE_README.md)
3. Check [ZITADEL_SETUP.md](./ZITADEL_SETUP.md) for auth issues
4. Open an issue on GitHub

---

**Ready to get started?** Open `landing-enhanced.html` in your browser now! 🎉
