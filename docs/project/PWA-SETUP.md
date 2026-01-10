# 📱 MCard Manager - PWA Setup Guide

MCard Manager is now a **Progressive Web App (PWA)**! This means it can be installed on devices and work offline.

## ✨ What's New

### PWA Features
- **📱 Installable** - Add to home screen on mobile and desktop
- **🔌 Offline Support** - Works without internet connection
- **💾 Smart Caching** - Fast loading with intelligent cache strategy
- **🔄 Auto-Updates** - Notifies when new version is available
- **📤 Share Target** - Receive files from other apps
- **🎨 Branded** - Custom theme colors and icons

---

## 🚀 Quick Start

### 1. Generate Icons (First Time Only)

Before installing, you need to generate the PWA icons:

```bash
# Open the icon generator in your browser
open http://localhost:3000/icons/generate-icons.html

# Or visit directly:
# http://localhost:3000/icons/generate-icons.html
```

**Steps:**
1. Click "Generate All Icons"
2. Click "Download All" to save all icon sizes
3. Save the downloaded icons to `/public/icons/` directory
4. Icons will be named: `icon-72x72.png`, `icon-96x96.png`, etc.

**Alternative:** Use your own branded icons (recommended for production)

---

### 2. Install the PWA

#### On Desktop (Chrome, Edge, Brave)

1. Visit `http://localhost:3000/mcard-manager.html`
2. Look for the install button in the address bar (⊕ icon)
3. Click "Install" or use the floating "Install App" button
4. The app will open in its own window

#### On Mobile (Android)

1. Open Chrome and visit the MCard Manager
2. Tap the menu (⋮) → "Add to Home screen"
3. Confirm the installation
4. App icon appears on your home screen

#### On Mobile (iOS/Safari)

1. Open Safari and visit the MCard Manager
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Confirm and the app icon appears

---

## 🔧 Configuration

### Manifest Settings

Edit `/public/manifest.json` to customize:

```json
{
  "name": "MCard Manager",           // Full app name
  "short_name": "MCard",             // Short name for home screen
  "theme_color": "#007acc",          // Theme color (blue)
  "background_color": "#1e1e1e",     // Background (dark)
  "start_url": "/mcard-manager.html" // Starting page
}
```

### Service Worker Cache

Edit `/public/sw.js` to modify caching:

```javascript
const CACHE_NAME = 'mcard-manager-v1';  // Increment for updates

const PRECACHE_ASSETS = [
  '/mcard-manager.html',
  '/css/mcard-manager.css',
  // Add more files to precache
];
```

---

## 🧪 Testing

### Check PWA Status

1. **Open DevTools** (F12)
2. Go to **Application** tab
3. Check:
   - **Manifest** - Should show all metadata
   - **Service Workers** - Should be "activated and running"
   - **Cache Storage** - Should show cached files

### Test Offline Mode

1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Refresh the page
4. App should still work!

### Lighthouse Audit

1. Open DevTools → Lighthouse tab
2. Select "Progressive Web App"
3. Click "Generate report"
4. Aim for 100% PWA score

---

## 📊 PWA Checklist

### ✅ Completed
- [x] HTTPS (required for PWA) - via localhost or production
- [x] Manifest file with all required fields
- [x] Service worker registered and active
- [x] Icons in multiple sizes (72-512px)
- [x] Offline fallback page
- [x] Cache strategy implemented
- [x] Install prompt handler
- [x] Update notification
- [x] Theme colors configured
- [x] Meta tags for mobile

### 🔄 Optional Enhancements
- [ ] Custom branded icons (replace placeholders)
- [ ] App screenshots for manifest
- [ ] Push notification implementation
- [ ] Background sync for offline actions
- [ ] Share target file handling
- [ ] Shortcuts for common actions
- [ ] App store submission (Google Play, Microsoft Store)

---

## 🎨 Customization

### Change Theme Color

Edit `manifest.json` and HTML meta tag:

```json
{
  "theme_color": "#YOUR_COLOR"
}
```

```html
<meta name="theme-color" content="#YOUR_COLOR">
```

### Add App Shortcuts

Edit `manifest.json`:

```json
{
  "shortcuts": [
    {
      "name": "New Card",
      "url": "/mcard-manager.html?action=new",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

### Custom Install Button

The install button appears automatically. To customize:

Edit the `showInstallPromotion()` function in `mcard-manager.html`

---

## 🐛 Troubleshooting

### Service Worker Not Registering

**Check:**
- HTTPS or localhost (required)
- No JavaScript errors in console
- Service worker file at `/sw.js`

**Fix:**
```javascript
// Unregister old service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

### Icons Not Showing

**Check:**
- Icons exist in `/public/icons/` directory
- Correct file names (e.g., `icon-192x192.png`)
- Valid PNG format
- Correct sizes

**Generate:**
Visit `/icons/generate-icons.html` to create placeholders

### Cache Not Updating

**Solution:**
1. Increment `CACHE_NAME` in `sw.js`
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear cache in DevTools

---

## 📱 Platform-Specific Notes

### Android
- Works best in Chrome
- Can be submitted to Google Play Store
- Supports all PWA features

### iOS
- Limited PWA support in Safari
- No push notifications
- No background sync
- Install via "Add to Home Screen"

### Desktop
- Chrome, Edge, Brave support installation
- Appears in app launcher
- Can be set as default handler for files

---

## 🚀 Deployment

### Production Checklist

1. **Generate real icons** (not placeholders)
2. **Add screenshots** to manifest
3. **Configure HTTPS** (required for PWA)
4. **Test on real devices**
5. **Run Lighthouse audit**
6. **Update cache version** when deploying
7. **Monitor service worker** updates

### HTTPS Setup

PWAs require HTTPS in production. Options:

- **Netlify/Vercel** - Automatic HTTPS
- **Cloudflare** - Free SSL
- **Let's Encrypt** - Free SSL certificates
- **GitHub Pages** - Automatic HTTPS

---

## 📚 Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox](https://developers.google.com/web/tools/workbox) - Advanced service worker library

---

## 🎉 Success!

Your MCard Manager is now a fully functional PWA! Users can:

- Install it like a native app
- Use it offline
- Receive updates automatically
- Share files to it from other apps
- Enjoy fast, cached performance

**Next:** Generate branded icons and test on real devices! 📱✨
