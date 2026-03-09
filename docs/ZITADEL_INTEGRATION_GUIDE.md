# ZITADEL Integration Guide for Monopoly Game

This guide explains how to integrate ZITADEL authentication with the PKC Monopoly game board.

## Overview

The integration requires users to authenticate via ZITADEL (https://zit.pkc.pub) before they can access and play the Monopoly game. This ensures:

- **Secure user identification** - Each player is authenticated via OIDC/OAuth 2.0
- **User profile integration** - Player names and avatars come from ZITADEL profiles
- **Session management** - Persistent login sessions across page reloads
- **Future multiplayer support** - Foundation for real-time multiplayer with WebSockets

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ├──1. Access Game──────────────────────────────┐
         │                                              │
         ▼                                              ▼
┌─────────────────────┐                    ┌──────────────────────┐
│ monopoly-auth.html  │                    │   ZITADEL IdP        │
│  (Auth Wrapper)     │◄───2. Redirect─────│  zit.pkc.pub         │
└──────────┬──────────┘                    └──────────────────────┘
           │                                           │
           │◄──────3. Auth Code + Tokens──────────────┘
           │
           ├──4. Load Game (if authenticated)
           │
           ▼
┌─────────────────────┐
│   monopoly.html     │
│   (Game Board)      │
└─────────────────────┘
```

## Setup Instructions

### Step 1: Configure ZITADEL Application

1. **Access ZITADEL Console**
   - Navigate to https://zit.pkc.pub
   - Log in with your administrator account

2. **Create a New Project** (if not exists)
   - Go to Projects → New Project
   - Name: "PKC Games" or similar
   - Click Create

3. **Create a New Application**
   - Inside your project, click "New Application"
   - Application Type: **Web** / **User Agent**
   - Name: "Monopoly Game"
   - Authentication Method: **PKCE** (Public Client)

4. **Configure Redirect URIs**
   Add the following redirect URIs based on your deployment:
   
   **For local development:**
   ```
   http://localhost:3000/public/examples/games/monopoly-auth.html
   ```
   
   **For production:**
   ```
   https://your-domain.com/public/examples/games/monopoly-auth.html
   ```

5. **Configure Post Logout Redirect URIs**
   ```
   http://localhost:3000
   https://your-domain.com
   ```

6. **Copy the Client ID**
   - After creating the application, copy the **Client ID**
   - You'll need this for the next step

### Step 2: Update Configuration File

Edit `public/config/zitadel-config.js`:

```javascript
const ZITADEL_CONFIG = {
  issuer: 'https://zit.pkc.pub',
  clientId: 'YOUR_CLIENT_ID_HERE', // ← Paste your Client ID here
  redirectUri: window.location.origin + window.location.pathname,
  scope: 'openid profile email'
};
```

Replace `YOUR_CLIENT_ID_HERE` with the Client ID from Step 1.

### Step 3: Update App Views Configuration

Edit `public/config/app-views.json` to use the authenticated version:

```json
{
  "id": "monopoly",
  "elementId": "monopolyView",
  "label": "Monopoly (Auth)",
  "icon": "dice-5",
  "displayStyle": "flex",
  "logPrefix": "[Monopoly]"
}
```

Update the iframe source in `app.html`:

```html
<div id="monopolyView" class="view-content" style="display: none;">
  <iframe src="/public/examples/games/monopoly-auth.html" 
          style="width: 100%; height: 100%; border: none;"
          allow="fullscreen"></iframe>
</div>
```

### Step 4: Test the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Access the game:**
   - Navigate to http://localhost:3000/app.html
   - Click on "Apps" → "Monopoly (Auth)" in the sidebar

3. **Test authentication flow:**
   - You should see the login screen
   - Click "Login with ZITADEL"
   - You'll be redirected to ZITADEL login page
   - After successful login, you'll be redirected back to the game
   - The game should load with your user profile displayed

## Files Created

### 1. `public/js/auth/zitadel-auth.js`
Core authentication library implementing:
- OIDC/OAuth 2.0 with PKCE flow
- Token management (access token, ID token)
- Session persistence (localStorage)
- User profile extraction from ID token

### 2. `public/config/zitadel-config.js`
Configuration file containing:
- ZITADEL issuer URL
- Client ID
- Redirect URIs
- OAuth scopes

### 3. `public/examples/games/monopoly-auth.html`
Authentication wrapper that:
- Shows login screen for unauthenticated users
- Handles OAuth callback
- Displays user profile after login
- Loads the game in an iframe after authentication
- Passes user data to the game

## User Flow

1. **Unauthenticated User**
   - Sees login screen with "Login with ZITADEL" button
   - Cannot access the game

2. **Login Process**
   - User clicks login button
   - Redirected to ZITADEL (zit.pkc.pub)
   - Enters credentials
   - ZITADEL redirects back with authorization code
   - App exchanges code for tokens
   - User profile extracted from ID token

3. **Authenticated User**
   - User profile displayed in header (name, email, avatar)
   - Game loads automatically
   - Session persists across page reloads
   - Logout button available

4. **Logout**
   - User clicks logout button
   - Session cleared from localStorage
   - Redirected to ZITADEL logout endpoint
   - Returns to login screen

## Security Features

### PKCE (Proof Key for Code Exchange)
- Protects against authorization code interception attacks
- Required for public clients (browser-based apps)
- Generates cryptographic code verifier and challenge

### Token Storage
- Access token and ID token stored in localStorage
- Tokens automatically cleared on expiry
- Session validation on page load

### State Parameter
- Prevents CSRF attacks
- Verified during OAuth callback

### Nonce
- Prevents replay attacks
- Included in ID token validation

## Future Enhancements

### Phase 1: Current Implementation ✅
- Basic authentication with ZITADEL
- User profile display
- Session management
- Single-player game with authentication

### Phase 2: Multiplayer Support (Planned)
- WebSocket server with token validation
- Game lobby system
- Real-time state synchronization
- Multiple players per game room

### Phase 3: Advanced Features (Planned)
- Player statistics and leaderboards
- Game history and replays
- Trading between authenticated players
- Tournament mode

## Troubleshooting

### Issue: "Invalid redirect URI"
**Solution:** Ensure the redirect URI in ZITADEL matches exactly with your deployment URL.

### Issue: "Client ID not found"
**Solution:** Verify you've updated `zitadel-config.js` with the correct Client ID from ZITADEL Console.

### Issue: Token expired
**Solution:** The app automatically detects expired tokens and shows the login screen. Simply log in again.

### Issue: CORS errors
**Solution:** Ensure ZITADEL is configured to allow your domain. Check the ZITADEL Console → Application → Allowed Origins.

### Issue: User profile not showing
**Solution:** Verify that the `openid profile email` scopes are configured in ZITADEL and in `zitadel-config.js`.

## API Reference

### ZitadelAuth Class

```javascript
// Initialize
const auth = new ZitadelAuth(config);

// Login
await auth.login();

// Logout
await auth.logout();

// Check authentication status
const isAuth = auth.isAuthenticated();

// Get user profile
const profile = auth.getUserProfile();
// Returns: { id, name, email, picture, username }

// Get access token
const token = auth.getAccessToken();
```

## Support

For issues related to:
- **ZITADEL configuration**: Check ZITADEL documentation at https://zitadel.com/docs
- **PKC integration**: Refer to this guide or contact PKC support
- **Game functionality**: See the Monopoly game documentation

## License

This integration follows the same license as the PKC Landing Page project.
