# WebRTC Signaling Flow

## Current Architecture

### 1. Server (ws-server.js)
- **Role:** Message relay ONLY
- **Channels:** 
  - `webrtc-dashboard-rooms` - Room management
  - `webrtc-dashboard-chat` - Chat messages  
  - `webrtc-signaling` - WebRTC signaling (offer/answer/ICE)
- **Behavior:** Relays all messages to subscribed clients

### 2. Client Components

#### A. WebRTCSignaling (managers/webrtc-signaling.js)
- Handles signaling message exchange
- Listens for: `webrtc-offer`, `webrtc-answer`, `webrtc-ice`
- Sends to specific `toUserId`

#### B. WebRTCCoordinator (services/webrtc-coordinator.js)
- Decides who initiates connections
- Uses **Perfect Negotiation Pattern**
- Rule: Lower userId initiates offer

#### C. RoomConnectionManager (managers/room-connection-manager.js)
- Manages RTCPeerConnection instances
- Creates offers/answers
- Handles ICE candidates
- Manages data channels

### 3. Connection Flow

```
User A (ID: user_abc) joins room
User B (ID: user_xyz) joins room

Server broadcasts: user-joined-room { userId: user_xyz, existingParticipants: [user_abc] }

User A receives:
  - handleUserJoined(user_xyz)
  - Compare IDs: user_abc < user_xyz
  - ✅ A initiates (lower ID)
  - A creates offer
  - A sends: webrtc-offer { fromUserId: user_abc, toUserId: user_xyz, offer: SDP }

User B receives:
  - handleExistingParticipants([user_abc])
  - Compare IDs: user_xyz > user_abc  
  - ⏳ B waits for offer
  - B receives: webrtc-offer
  - B creates answer
  - B sends: webrtc-answer { fromUserId: user_xyz, toUserId: user_abc, answer: SDP }

User A receives:
  - webrtc-answer
  - A applies answer
  - ✅ Connection established

Both exchange ICE candidates:
  - webrtc-ice messages
  - Connection completes
```

### 4. Perfect Negotiation Pattern

**Why:** Prevents offer collisions when both peers try to initiate simultaneously

**Rule:** 
```javascript
const shouldInitiate = this.currentUserId < userId;
```

**Benefits:**
- Deterministic: Always same peer initiates
- No race conditions
- Works for mesh networks (N peers)

### 5. Current Issue

**Problem:** WebRTC connections not establishing

**Possible Causes:**
1. ❓ RoomConnectionManager not registered
2. ❓ Signaling messages not being sent
3. ❓ ICE candidates not exchanged
4. ❓ STUN/TURN servers not configured

**Debug Steps:**
1. Check if `connectionManager.createOffer()` is called
2. Verify `webrtc-offer` messages sent to server
3. Confirm server relays to correct `toUserId`
4. Check if receiver processes offer
5. Verify answer is sent back
6. Monitor ICE candidate exchange
7. Check RTCPeerConnection state

### 6. Expected Server Logs

```
[Server] 📤 Relaying message type "webrtc-offer" on channel "webrtc-signaling"
[Server] ✅ Message relayed to 1 clients

[Server] 📤 Relaying message type "webrtc-answer" on channel "webrtc-signaling"
[Server] ✅ Message relayed to 1 clients

[Server] 📤 Relaying message type "webrtc-ice" on channel "webrtc-signaling"
[Server] ✅ Message relayed to 1 clients
```

### 7. Expected Client Logs

**User A (Initiator):**
```
[WebRTCCoordinator] 🔑 SENDING WebRTC KEY to: User B
[RoomConnectionManager] Creating offer for peer: user_xyz
[WebRTCSignaling] Sending offer to: user_xyz
[WebRTCSignaling] ✅ Received answer from: user_xyz
[RoomConnectionManager] ✅ Connection established with: user_xyz
```

**User B (Responder):**
```
[WebRTCCoordinator] 📥 WAITING for WebRTC KEY from: User A
[WebRTCSignaling] ✅ Received offer from: user_abc
[RoomConnectionManager] Creating answer for peer: user_abc
[WebRTCSignaling] Sending answer to: user_abc
[RoomConnectionManager] ✅ Connection established with: user_abc
```

### 8. Next Steps

1. Add detailed logging to RoomConnectionManager
2. Verify signaling messages reach server
3. Confirm server relays to correct recipients
4. Check ICE server configuration
5. Monitor connection state transitions
6. Test with different network conditions
