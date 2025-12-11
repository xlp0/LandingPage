# Modular Architecture - Cubical Logic Model

## 🎯 **Philosophy**

Following the **Cubical Logic Model**, every feature is a **self-contained module** that can be:
- ✅ Loaded independently
- ✅ Composed with other modules
- ✅ Replaced without breaking the system
- ✅ Tested in isolation
- ✅ Reused across different pages

---

## 📁 **File Structure**

```
LandingPage/
├── landing.html                    # Clean, modular landing page
├── landing-enhanced.html           # Legacy (to be deprecated)
├── index.html                      # Legacy (to be deprecated)
│
├── js/
│   ├── pkc-core.js                # Core PKC functionality
│   │
│   ├── modules/                   # All features as modules
│   │   ├── auth-module.js         # Authentication module
│   │   ├── webrtc-dashboard/      # WebRTC dashboard module
│   │   ├── video-meeting/         # Video meeting module
│   │   ├── p2p-serverless/        # P2P serverless module
│   │   └── ...                    # Other modules
│   │
│   └── redux/                     # Redux state management
│       └── slices/                # Redux slices as modules
│           ├── invitationsSlice.js
│           ├── participantsSlice.js
│           └── rtcConnectionSlice.js
│
└── docs/                          # Documentation
    └── MODULAR_ARCHITECTURE.md    # This file
```

---

## 🧩 **Module Design Principles**

### 1. **Self-Contained**
Each module has everything it needs:
```javascript
// ✅ Good - Self-contained module
export default class AuthModule {
    constructor(config) {
        this.config = config;
    }
    
    async login() { /* ... */ }
    async logout() { /* ... */ }
}

// ❌ Bad - Depends on global state
function login() {
    window.globalAuth.doLogin(); // Tight coupling
}
```

### 2. **Configurable**
Modules accept configuration:
```javascript
// ✅ Good - Configurable
const auth = new AuthModule({
    clientId: '123',
    domain: 'example.com'
});

// ❌ Bad - Hard-coded
const auth = new AuthModule(); // Uses hard-coded values
```

### 3. **Event-Driven**
Modules communicate via events:
```javascript
// ✅ Good - Event-driven
pkc.on('auth:login', (user) => {
    console.log('User logged in:', user);
});

// ❌ Bad - Direct coupling
auth.onLogin = () => {
    otherModule.doSomething(); // Tight coupling
};
```

### 4. **Lazy Loading**
Load modules only when needed:
```javascript
// ✅ Good - Lazy load
button.addEventListener('click', async () => {
    const { default: AuthModule } = await import('./js/modules/auth-module.js');
    const auth = new AuthModule();
    await auth.login();
});

// ❌ Bad - Load everything upfront
import AuthModule from './js/modules/auth-module.js';
import VideoModule from './js/modules/video-module.js';
import P2PModule from './js/modules/p2p-module.js';
// ... loads everything even if not used
```

---

## 📦 **Available Modules**

### **1. Auth Module** (`js/modules/auth-module.js`)
**Purpose:** OAuth2 authentication with PKCE

**Usage:**
```javascript
import AuthModule from './js/modules/auth-module.js';

const auth = new AuthModule({
    clientId: '348373619962871815',
    domain: 'vpn.pkc.pub',
    redirectUri: 'https://dev.pkc.pub/auth-callback-enhanced.html'
});

// Login
await auth.login();

// Check auth
const isAuth = await auth.checkAuth();

// Logout
await auth.logout();
```

**Features:**
- ✅ PKCE support
- ✅ Token management
- ✅ Auto-refresh
- ✅ Logout

---

### **2. WebRTC Dashboard** (`js/modules/webrtc-dashboard/`)
**Purpose:** Real-time video and audio communication

**Usage:**
```html
<a href="js/modules/webrtc-dashboard/index.html">Open WebRTC Dashboard</a>
```

**Features:**
- ✅ Video/audio streams
- ✅ Screen sharing
- ✅ Peer connections
- ✅ Statistics

---

### **3. Video Meeting** (`js/modules/video-meeting/`)
**Purpose:** P2P video conferencing

**Usage:**
```html
<a href="js/modules/video-meeting/index.html">Open Video Meeting</a>
```

**Features:**
- ✅ Multi-person video
- ✅ Text chat
- ✅ Room codes
- ✅ Media controls

---

### **4. P2P Serverless** (`js/modules/p2p-serverless/`)
**Purpose:** Direct peer-to-peer connections

**Usage:**
```html
<a href="js/modules/p2p-serverless/example.html">Open P2P Demo</a>
```

**Features:**
- ✅ WebRTC data channels
- ✅ No server required
- ✅ Discovery mechanism
- ✅ Connection management

---

### **5. Redux Slices** (`js/redux/slices/`)
**Purpose:** State management modules

**Usage:**
```javascript
import invitationsReducer from './js/redux/slices/invitationsSlice.js';
import participantsReducer from './js/redux/slices/participantsSlice.js';
import rtcConnectionReducer from './js/redux/slices/rtcConnectionSlice.js';

const store = configureStore({
    reducer: {
        invitations: invitationsReducer,
        participants: participantsReducer,
        rtcConnection: rtcConnectionReducer
    }
});
```

**Features:**
- ✅ Invitations management
- ✅ Participants tracking
- ✅ RTC connection state

---

## 🔄 **Module Communication**

### **Event Bus Pattern**
Modules communicate via PKC event bus:

```javascript
// Module A - Emit event
pkc.emit('auth:login', { userId: '123', name: 'John' });

// Module B - Listen to event
pkc.on('auth:login', (user) => {
    console.log('User logged in:', user);
});
```

### **Common Events**
```javascript
// Auth events
'auth:login'       // User logged in
'auth:logout'      // User logged out
'auth:refresh'     // Token refreshed

// WebSocket events
'ws:connected'     // WebSocket connected
'ws:disconnected'  // WebSocket disconnected
'ws:message'       // Message received

// P2P events
'peer:connected'   // Peer connected
'peer:disconnected' // Peer disconnected
'peer:count'       // Peer count changed

// RTC events
'rtc:stream'       // Stream received
'rtc:track'        // Track added
'rtc:datachannel'  // Data channel opened
```

---

## 🎨 **Landing Page Design**

### **Clean, Minimal Main Page**
```
┌─────────────────────────────────────┐
│         THK Mesh                    │
│  Modular. Local-first. Decentralized│
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ Auth │ │WebRTC│ │Video │       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ P2P  │ │ Game │ │ Docs │       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│              [Status]               │
└─────────────────────────────────────┘
```

### **Status Panel (Optional)**
```
┌─────────────────┐
│ System Status   │
├─────────────────┤
│ WebSocket: ✓    │
│ P2P Peers: 3    │
│ Auth: Logged in │
└─────────────────┘
```

---

## 🚀 **Migration Path**

### **Phase 1: Create Modular Landing** ✅
- ✅ Create `landing.html` with module cards
- ✅ Create `auth-module.js` for authentication
- ✅ Document modular architecture

### **Phase 2: Extract More Modules** ⏳
- ⏳ Extract status panel as module
- ⏳ Extract WebSocket handler as module
- ⏳ Extract P2P manager as module

### **Phase 3: Deprecate Legacy** ⏳
- ⏳ Mark `landing-enhanced.html` as deprecated
- ⏳ Mark `index.html` as deprecated
- ⏳ Update all links to use `landing.html`

### **Phase 4: Integration** ⏳
- ⏳ Integrate Redux slices
- ⏳ Add middleware for side effects
- ⏳ Connect modules to Redux store

---

## 📚 **Benefits**

### **1. Maintainability**
- Each module can be updated independently
- Clear separation of concerns
- Easy to understand and debug

### **2. Reusability**
- Modules can be used in multiple pages
- No duplication of code
- Consistent behavior across pages

### **3. Testability**
- Modules can be tested in isolation
- Mock dependencies easily
- Clear input/output contracts

### **4. Scalability**
- Add new modules without touching existing code
- Remove modules without breaking the system
- Compose modules in different ways

### **5. Performance**
- Lazy load modules only when needed
- Reduce initial page load time
- Better code splitting

---

## 🎯 **Next Steps**

1. **Test new landing page** - Verify all module links work
2. **Extract status panel** - Create status-module.js
3. **Extract WebSocket** - Create websocket-module.js
4. **Update documentation** - Add more examples
5. **Deprecate legacy pages** - Add deprecation notices
6. **Update all links** - Point to new landing.html

---

## ✅ **Checklist**

- [x] Create modular landing page
- [x] Create auth module
- [x] Document architecture
- [ ] Extract status panel module
- [ ] Extract WebSocket module
- [ ] Extract P2P module
- [ ] Integrate Redux slices
- [ ] Add middleware
- [ ] Deprecate legacy pages
- [ ] Update all links

---

**Created:** 2025-11-26  
**Author:** Cascade AI  
**Version:** 1.0.0  
**Philosophy:** Cubical Logic Model
