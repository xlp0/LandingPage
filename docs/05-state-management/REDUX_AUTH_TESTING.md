# Redux Auth Integration Testing Guide

## Testing landing-enhanced.html with Redux Store

### Prerequisites

✅ Docker container running on port 3000  
✅ Zitadel OAuth2 configured at `vpn.pkc.pub`  
✅ Client ID: `348213051452882951`  
✅ Redirect URI: `https://henry.pkc.pub/auth-callback-enhanced.html`  

---

## Test Scenarios

### 1. **Local Testing (http://localhost:3000)**

#### Test 1.1: App Initialization
```
1. Open http://localhost:3000/landing-enhanced.html
2. Check browser console for:
   - "[App] Initialized with Redux store"
   - "[App] Auth restored from store"
3. Verify Redux store is loaded:
   - Open DevTools → Console
   - Type: window.app.store.getState()
   - Should show auth state with isAuthenticated: false
```

#### Test 1.2: Redux Store State
```
1. In DevTools Console, check auth state:
   window.app.store.getState().auth
   
   Expected output:
   {
     isAuthenticated: false,
     user: null,
     token: null,
     refreshToken: null,
     loading: false,
     error: null,
     loginMethod: null
   }
```

#### Test 1.3: Auth Button Display
```
1. Verify "Login" button is visible in navbar
2. Button should be white with purple text
3. Click button should not cause errors
```

---

### 2. **OAuth Login Flow Testing**

#### Test 2.1: Login Button Click
```
1. Click "Login" button on landing page
2. Should redirect to: https://vpn.pkc.pub/oauth/v2/authorize?...
3. Check console for: "[App] Initiating login flow..."
4. Verify redirect URL contains:
   - client_id=348213051452882951
   - redirect_uri=https://henry.pkc.pub/auth-callback-enhanced.html
   - response_type=code
   - scope=openid profile email
```

#### Test 2.2: Zitadel Login
```
1. At Zitadel login page, enter credentials
2. Grant permissions if prompted
3. Should redirect to: https://henry.pkc.pub/auth-callback-enhanced.html?code=...&state=...
```

#### Test 2.3: Auth Callback
```
1. auth-callback-enhanced.html should:
   - Extract code and state from URL
   - Call Redux loginWithZitadel thunk
   - Exchange code for tokens
   - Store tokens in localStorage
   - Redirect back to landing page
2. Check console for success messages
```

---

### 3. **Redux State After Login**

#### Test 3.1: Check Auth State
```
1. After successful login, in DevTools Console:
   window.app.store.getState().auth
   
   Expected output:
   {
     isAuthenticated: true,
     user: {
       id: "user-id",
       name: "Your Name",
       email: "your-email@example.com",
       avatar: "avatar-url",
       status: "online"
     },
     token: "jwt-token...",
     refreshToken: "refresh-token...",
     loading: false,
     error: null,
     loginMethod: "zitadel"
   }
```

#### Test 3.2: Auth Button Update
```
1. Navbar should now show:
   - User avatar (or placeholder)
   - User name
   - "Logout" button (red)
2. Avatar should be clickable (if implemented)
```

#### Test 3.3: localStorage Persistence
```
1. In DevTools → Application → Local Storage
2. Check for:
   - auth_token: jwt-token...
   - refresh_token: refresh-token...
3. These should persist across page reloads
```

---

### 4. **Page Reload Test**

#### Test 4.1: Auth Persistence
```
1. After successful login, refresh page (F5)
2. App should:
   - Restore auth from localStorage
   - Dispatch restoreAuth() thunk
   - Verify token is still valid
   - Show user info without re-login
3. Check console for: "[App] Auth restored from store"
```

#### Test 4.2: Token Verification
```
1. After page reload, verify:
   - User name still displayed
   - Logout button still visible
   - Redux store has auth state
   - No login required
```

---

### 5. **Logout Test**

#### Test 5.1: Logout Button Click
```
1. Click "Logout" button
2. Should:
   - Dispatch logoutUser() thunk
   - Clear tokens from localStorage
   - Clear Redux auth state
   - Show "Login" button again
   - Navigate to home page
3. Check console for: "[App] Logged out from Redux store"
```

#### Test 5.2: Post-Logout State
```
1. In DevTools Console:
   window.app.store.getState().auth
   
   Expected output:
   {
     isAuthenticated: false,
     user: null,
     token: null,
     refreshToken: null,
     loading: false,
     error: null,
     loginMethod: null
   }
```

#### Test 5.3: localStorage Cleanup
```
1. In DevTools → Application → Local Storage
2. Verify auth tokens are removed:
   - auth_token: (should be gone)
   - refresh_token: (should be gone)
```

---

### 6. **Production Testing (https://henry.pkc.pub)**

#### Test 6.1: HTTPS Access
```
1. Open https://henry.pkc.pub/landing-enhanced.html
2. Should load without SSL errors
3. Check console for Redux initialization
```

#### Test 6.2: OAuth Redirect
```
1. Click Login button
2. Should redirect to: https://vpn.pkc.pub/oauth/v2/authorize?...
3. After login, redirect back to: https://henry.pkc.pub/auth-callback-enhanced.html
```

#### Test 6.3: Secure Token Storage
```
1. Tokens stored in localStorage (same origin)
2. Verify tokens are not exposed in URL
3. Check Network tab for secure token transmission
```

---

## Console Commands for Testing

### Check Redux Store State
```javascript
window.app.store.getState()
```

### Check Auth State Only
```javascript
window.app.store.getState().auth
```

### Check Selectors
```javascript
import { selectIsAuthenticated, selectUser } from './js/modules/webrtc-dashboard/store/authSlice.js';

const state = window.app.store.getState();
console.log('Is Authenticated:', selectIsAuthenticated(state));
console.log('User:', selectUser(state));
```

### Manually Dispatch Login
```javascript
import { loginWithZitadel } from './js/modules/webrtc-dashboard/store/authSlice.js';

window.app.store.dispatch(loginWithZitadel({
  code: 'auth-code-from-url',
  state: 'state-from-url'
}));
```

### Manually Dispatch Logout
```javascript
import { logoutUser } from './js/modules/webrtc-dashboard/store/authSlice.js';

window.app.store.dispatch(logoutUser());
```

### Subscribe to Store Changes
```javascript
const unsubscribe = window.app.store.subscribe(() => {
  console.log('Store updated:', window.app.store.getState());
});

// To unsubscribe later:
unsubscribe();
```

---

## Debugging Tips

### 1. **Enable Redux DevTools**
```
Install Redux DevTools browser extension
Open DevTools → Redux tab
See all actions and state changes in real-time
```

### 2. **Check Network Requests**
```
DevTools → Network tab
Filter by XHR/Fetch
Monitor:
- /api/auth/token (token exchange)
- /api/auth/verify (token verification)
- /api/auth/refresh (token refresh)
- /api/auth/logout (logout)
```

### 3. **Monitor localStorage**
```
DevTools → Application → Local Storage
Watch for:
- auth_token changes
- refresh_token changes
- Other app data
```

### 4. **Check Console Logs**
```
All app actions logged with [App] prefix:
- [App] Initialized with Redux store
- [App] Auth restored from store
- [App] User authenticated via Redux: Name
- [App] Initiating login flow...
- [App] Logged out from Redux store
```

---

## Common Issues & Solutions

### Issue 1: "Module not found" errors
**Solution:**
- Verify Redux store path: `./js/modules/webrtc-dashboard/store/store.js`
- Check authSlice.js exists and exports correctly
- Ensure all imports use correct relative paths

### Issue 2: "Redux store is undefined"
**Solution:**
- Check Redux store is initialized before use
- Verify store.js imports are correct
- Check for circular dependencies

### Issue 3: Auth state not persisting
**Solution:**
- Verify localStorage is enabled
- Check browser privacy settings
- Clear localStorage and retry: `localStorage.clear()`
- Verify restoreAuth() thunk is working

### Issue 4: Login redirect not working
**Solution:**
- Verify Zitadel domain is correct: `vpn.pkc.pub`
- Check Client ID: `348213051452882951`
- Verify redirect URI matches in Zitadel config
- Check browser console for OAuth errors

### Issue 5: UI not updating after login
**Solution:**
- Verify store subscription is active
- Check updateAuthUI() is being called
- Verify selectors return correct values
- Check for JavaScript errors in console

---

## Test Checklist

- [ ] App initializes with Redux store
- [ ] Redux store state is accessible
- [ ] Login button visible when not authenticated
- [ ] Login redirects to Zitadel
- [ ] OAuth callback exchanges code for tokens
- [ ] Auth state updates after login
- [ ] User name and avatar displayed
- [ ] Logout button visible when authenticated
- [ ] Tokens stored in localStorage
- [ ] Auth persists after page reload
- [ ] Logout clears auth state
- [ ] Logout removes tokens from localStorage
- [ ] All console logs appear correctly
- [ ] No JavaScript errors in console
- [ ] Works on localhost:3000
- [ ] Works on henry.pkc.pub (HTTPS)

---

## Next Steps

After successful testing:
1. Implement other Redux slices (Room, RTC, Participants, etc.)
2. Add Redux DevTools integration
3. Implement middleware for side effects
4. Add error handling and retry logic
5. Implement token refresh on expiry
6. Add loading indicators for async operations
