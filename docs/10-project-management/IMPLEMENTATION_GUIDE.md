# THK Mesh Landing Page - Implementation Guide

## Overview

This document provides a comprehensive guide to the local-first landing page implementation for THK Mesh, including architecture, components, and integration points.

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Landing Page (HTML/CSS/JS)                   │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Navigation (Home, Features, About)            │  │   │
│  │  │  Authentication UI (Login/Logout)              │  │   │
│  │  │  Status Indicators (Online/Offline)            │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Application State Manager                    │   │
│  │  ├─ Current Page                                     │   │
│  │  ├─ Online Status                                    │   │
│  │  ├─ User Session                                     │   │
│  │  └─ Navigation History                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Module Layer                                 │   │
│  │  ┌────────────────────┐  ┌────────────────────────┐ │   │
│  │  │ LocalStorageManager│  │   OAuth2Handler        │ │   │
│  │  │                    │  │                        │ │   │
│  │  │ ├─ User Data       │  │ ├─ Authorization URL   │ │   │
│  │  │ ├─ Documents       │  │ ├─ Token Exchange      │ │   │
│  │  │ ├─ Settings        │  │ ├─ User Info Fetch     │ │   │
│  │  │ └─ Auth Token      │  │ └─ PKCE Support        │ │   │
│  │  └────────────────────┘  └────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Browser Storage                              │   │
│  │  ├─ Local Storage (10MB)                             │   │
│  │  │  ├─ thk-mesh-user                                 │   │
│  │  │  ├─ thk-mesh-documents                            │   │
│  │  │  ├─ thk-mesh-settings                             │   │
│  │  │  └─ thk-mesh-auth-token                           │   │
│  │  └─ Session Storage (temporary)                      │   │
│  │     └─ oauth-state (CSRF protection)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────────┐
        │   Zitadel (zit.pkc.pub)                 │
        │   OAuth2 Provider                       │
        │   ├─ Authorization Endpoint             │
        │   ├─ Token Endpoint                     │
        │   └─ User Info Endpoint                 │
        └─────────────────────────────────────────┘
```

## Component Architecture

### 1. Landing Page (`landing-enhanced.html`)

**Responsibilities:**
- Render UI with Tailwind CSS
- Handle navigation between pages
- Display authentication status
- Show online/offline status
- Manage user interactions

**Key Elements:**
```html
<!-- Navigation Bar -->
<nav>
  <button onclick="app.navigate('home')">Home</button>
  <button onclick="app.navigate('features')">Features</button>
  <button onclick="app.navigate('about')">About</button>
  <button onclick="app.login()">Login</button>
</nav>

<!-- Pages (hidden/shown via CSS) -->
<div id="page-home" class="page active">...</div>
<div id="page-features" class="page">...</div>
<div id="page-about" class="page">...</div>

<!-- Status Indicators -->
<div id="status-dot"></div>
<div id="status-text"></div>
```

### 2. LocalStorageManager (`js/local-storage-manager.js`)

**Responsibilities:**
- Provide unified storage interface
- Handle data serialization/deserialization
- Manage user data lifecycle
- Manage document storage
- Handle settings persistence

**API:**
```javascript
// Initialization
storage.init()

// User Management
storage.setUser(userData)
storage.getUser()
storage.clearUser()

// Document Management
storage.addDocument(doc)
storage.getDocuments()
storage.getDocument(id)
storage.updateDocument(id, updates)
storage.deleteDocument(id)

// Settings
storage.setSettings(settings)
storage.getSettings()
storage.updateSettings(updates)

// Utilities
storage.export()
storage.import(data)
storage.getSize()
storage.keys()
```

### 3. OAuth2Handler (`js/oauth-handler.js`)

**Responsibilities:**
- Generate authorization URLs
- Handle OAuth2 callback
- Exchange authorization code for token
- Retrieve user information
- Implement PKCE support

**API:**
```javascript
// Initialization
const oauth = new OAuth2Handler(config)

// Authorization Flow
oauth.redirectToLogin()
oauth.getAuthorizationUrl(state)

// Callback Handling
oauth.handleCallback(params)

// Token Exchange
oauth.exchangeCodeForToken(code)

// User Info
oauth.getUserInfo(accessToken)

// PKCE
oauth.generatePKCE()
oauth.generateState()
```

### 4. Application State Manager (`window.app`)

**Responsibilities:**
- Manage current page
- Track online/offline status
- Handle navigation
- Manage authentication state
- Coordinate between modules

**API:**
```javascript
// Navigation
app.navigate(page)

// Authentication
app.login()
app.logout()
app.checkAuthStatus()

// Status Management
app.updateStatus()
app.updateStorageInfo()

// Initialization
app.init()
```

## Data Flow

### Authentication Flow

```
1. User clicks "Login"
   ↓
2. app.login() called
   ↓
3. oauth.redirectToLogin() generates authorization URL
   ↓
4. User redirected to Zitadel
   ↓
5. User authenticates with credentials
   ↓
6. Zitadel redirects to auth-callback-enhanced.html with code
   ↓
7. oauth.handleCallback() processes callback
   ↓
8. Code exchanged for token (server-side in production)
   ↓
9. User data retrieved from Zitadel
   ↓
10. storage.setUser() saves user data
    storage.setAuthToken() saves token
   ↓
11. Redirect back to landing page
   ↓
12. app.checkAuthStatus() updates UI
```

### Document Creation Flow

```
1. User creates document (offline)
   ↓
2. storage.addDocument(doc) called
   ↓
3. Document stored in local storage
   ↓
4. Document ID returned to user
   ↓
5. User can view/edit document offline
   ↓
6. When online, document can be synced to cloud (future)
```

### Navigation Flow

```
1. User clicks navigation button
   ↓
2. app.navigate(page) called
   ↓
3. All pages hidden (display: none)
   ↓
4. Selected page shown (display: block)
   ↓
5. Fade-in animation triggered
   ↓
6. Page content visible to user
```

## Storage Schema

### User Data

```javascript
{
  "id": "user-123456",
  "name": "John Doe",
  "email": "john@example.com",
  "authenticated": true,
  "authenticatedAt": "2024-01-15T10:30:00Z",
  "code": "authorization-code" // For backend exchange
}
```

### Documents

```javascript
[
  {
    "id": "doc-1234567890",
    "title": "My Document",
    "content": "Document content here...",
    "tags": ["work", "important"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "synced": false
  }
]
```

### Settings

```javascript
{
  "theme": "dark",
  "language": "en",
  "notifications": true,
  "autoSync": false,
  "fontSize": "16px"
}
```

### Auth Token

```javascript
"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Integration Points

### 1. Zitadel Integration

**Configuration Required:**
- Client ID
- Client Secret (backend only)
- Redirect URI
- Scopes

**Endpoints Used:**
- `https://zit.pkc.pub/oauth/v2/authorization` - Authorization
- `https://zit.pkc.pub/oauth/v2/token` - Token Exchange
- `https://zit.pkc.pub/oauth/v2/userinfo` - User Info

### 2. Backend Integration (Recommended)

**Token Exchange Endpoint:**
```
POST /api/auth/callback
Request: { code: "authorization-code" }
Response: { user: {...}, token: "access-token" }
```

**User Sync Endpoint:**
```
POST /api/sync/documents
Request: { documents: [...], token: "access-token" }
Response: { synced: true, conflicts: [] }
```

### 3. P2P Integration (Future)

**WebRTC Connection:**
```
1. User shares document
2. Generate share code
3. Other user enters share code
4. P2P connection established
5. Document synced via WebRTC
```

## Security Considerations

### Frontend Security

✅ **Safe Practices:**
- Store user ID in localStorage
- Store auth code temporarily
- Use state parameter for CSRF protection
- Validate redirect URIs
- Implement PKCE for public clients

❌ **Unsafe Practices:**
- Never store passwords
- Never store client secret
- Never store sensitive API keys
- Don't trust client-side validation alone

### Backend Security

✅ **Required:**
- Token exchange server-side
- Client secret kept secure
- Token validation on every request
- HTTPS only
- Secure cookie settings (HttpOnly, Secure, SameSite)

### Data Security

✅ **Recommendations:**
- Encrypt sensitive data before storing
- Implement data expiration
- Add audit logging
- Regular security audits
- Implement rate limiting

## Performance Optimization

### 1. Lazy Loading

```javascript
// Load modules only when needed
import('./js/oauth-handler.js').then(module => {
  const oauth = new module.OAuth2Handler(config);
});
```

### 2. Caching

```javascript
// Cache user data
const user = storage.getUser();
if (user) {
  // Use cached data
}
```

### 3. Debouncing

```javascript
// Debounce storage updates
let saveTimeout;
function saveDocument(doc) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    storage.updateDocument(doc.id, doc);
  }, 500);
}
```

### 4. Storage Cleanup

```javascript
// Remove old documents
const docs = storage.getDocuments();
const old = docs.filter(d => {
  const age = Date.now() - new Date(d.updatedAt).getTime();
  return age > 30 * 24 * 60 * 60 * 1000; // 30 days
});
old.forEach(d => storage.deleteDocument(d.id));
```

## Testing Strategy

### Unit Tests

```javascript
// Test LocalStorageManager
test('should store and retrieve user data', () => {
  storage.setUser({ name: 'John' });
  expect(storage.getUser().name).toBe('John');
});

// Test OAuth2Handler
test('should generate authorization URL', () => {
  const url = oauth.getAuthorizationUrl();
  expect(url).toContain('client_id');
});
```

### Integration Tests

```javascript
// Test full authentication flow
test('should handle OAuth callback', async () => {
  const params = new URLSearchParams('code=test-code');
  const result = await oauth.handleCallback(params);
  expect(result.code).toBe('test-code');
});
```

### E2E Tests

```javascript
// Test user journey
test('user can login and create document', async () => {
  // Navigate to landing page
  // Click login button
  // Authenticate with Zitadel
  // Create document
  // Verify document in storage
});
```

## Deployment Checklist

- [ ] Update Zitadel redirect URIs to production domain
- [ ] Set environment variables (Client ID, etc.)
- [ ] Enable HTTPS
- [ ] Configure CORS headers
- [ ] Set up backend token exchange endpoint
- [ ] Configure secure cookies
- [ ] Enable logging and monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure CDN for static assets
- [ ] Set up automated backups
- [ ] Test authentication flow
- [ ] Test offline functionality
- [ ] Performance testing
- [ ] Security audit
- [ ] Load testing

## Troubleshooting

### Common Issues

**Issue: "Invalid redirect_uri"**
- Verify exact match in Zitadel config
- Check protocol (http vs https)
- Check domain and port
- Check path

**Issue: "CORS error"**
- Token exchange must be server-side
- Don't call Zitadel directly from frontend
- Implement backend proxy

**Issue: "Storage quota exceeded"**
- Implement cleanup of old documents
- Compress data before storing
- Use IndexedDB for larger storage

**Issue: "Login loop"**
- Check redirect URI is correct
- Verify token is being stored
- Check auth status check logic

## Future Enhancements

1. **Progressive Web App (PWA)**
   - Service workers
   - Offline sync
   - Install prompt

2. **P2P Collaboration**
   - WebRTC mesh
   - Real-time sync
   - Conflict resolution

3. **Cloud Sync**
   - Incremental sync
   - Conflict detection
   - Version history

4. **Advanced Features**
   - Rich text editing
   - Markdown support
   - LaTeX rendering
   - Collaborative editing

## References

- [Local-First Software](https://www.inkandswitch.com/local-first/)
- [Zitadel OAuth2](https://zitadel.com/docs/apis/openidconnect)
- [OAuth2 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)

---

**Last Updated:** January 2024
**Version:** 1.0.0
