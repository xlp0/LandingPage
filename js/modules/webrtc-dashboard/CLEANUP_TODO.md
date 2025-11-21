# WebRTC Dashboard Cleanup TODO

## Files to Review/Remove

### 1. dashboard-manager.js ❌ REMOVE
- **Status:** OLD VERSION, NOT USED
- **Why:** `index.html` imports it but never actually uses it
- **Action:** Remove file and remove unused import from `index.html` line 196

### 2. Files Currently Imported by dashboard-manager-v2.js
Need to verify if these are actually used:

#### access-control-manager.js ⚠️ CHECK
- Imported in dashboard-manager-v2.js line 5
- Created in init() line 38
- **Check:** Are join requests/approvals working?
- **Action:** If not used, remove import and initialization

#### ui-components.js ⚠️ CHECK
- Imported in dashboard-manager-v2.js line 7
- Created in init() line 40
- **Check:** What does this do? Is it used?
- **Action:** If not used, remove import and initialization

### 3. Other Files to Check

#### broadcast-service.js ⚠️ CHECK
- **Check:** Is this used or replaced by websocket-broadcast-service.js?

#### validate-flow.js ⚠️ CHECK
- **Check:** Is this used anywhere?

#### utils.js ⚠️ CHECK
- **Check:** Is this used anywhere?

---

## Cleanup Steps

### Step 1: Remove Unused dashboard-manager.js
```bash
# Remove the old file
rm js/modules/webrtc-dashboard/dashboard-manager.js

# Update index.html - remove line 196:
# <script type="module" src="dashboard-manager.js?v=8.0"></script>
```

### Step 2: Test Current Functionality
1. Open dashboard
2. Create room - does it work?
3. Join room - does it work?
4. Send messages - does it work?
5. Check console for errors about missing modules

### Step 3: Remove Unused Imports from dashboard-manager-v2.js
Based on testing, remove unused imports:
- If AccessControlManager not used → remove import and init
- If UIComponents not used → remove import and init

### Step 4: Remove Unused Files
After confirming what's not used:
```bash
rm js/modules/webrtc-dashboard/access-control-manager.js  # if not used
rm js/modules/webrtc-dashboard/ui-components.js  # if not used
rm js/modules/webrtc-dashboard/broadcast-service.js  # if duplicate
rm js/modules/webrtc-dashboard/validate-flow.js  # if not used
rm js/modules/webrtc-dashboard/utils.js  # if not used
```

---

## Current Working Files (DO NOT REMOVE)

✅ **Core Services:**
- `room-service.js` - Room management
- `chat-manager.js` - Chat and messaging
- `websocket-broadcast-service.js` - WebSocket communication
- `shared-broadcast.js` - Shared broadcast instance
- `config.js` - Configuration loading

✅ **Managers:**
- `managers/room-manager.js` - Room operations
- `managers/participant-manager.js` - Participant management
- `managers/room-connection-manager.js` - WebRTC connections
- `managers/webrtc-signaling.js` - WebRTC signaling

✅ **Main Entry:**
- `dashboard-manager-v2.js` - Main controller
- `index.html` - UI

---

## Testing Checklist

After cleanup:
- [ ] Dashboard loads without errors
- [ ] Can create room
- [ ] Can join room
- [ ] Can send/receive messages
- [ ] Reconnect button works
- [ ] No console errors about missing modules
