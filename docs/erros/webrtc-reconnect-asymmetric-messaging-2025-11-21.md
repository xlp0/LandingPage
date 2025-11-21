# WebRTC Reconnect Asymmetric Messaging Bug

**Date:** November 21, 2025, 9:55 AM UTC+8  
**Severity:** CRITICAL  
**Status:** IDENTIFIED - FIX IN PROGRESS  
**Component:** WebRTC P2P Connection Establishment

---

## Problem Description

### Symptom
When two users join a room, the WebRTC connection requires manual reconnection, and only ONE user can send messages at a time. The messaging capability alternates based on who reconnects last.

### Exact Behavior

1. **Initial Join:**
   - User A (Host) creates room
   - User B (Joiner) joins room
   - ❌ Connection does NOT establish automatically
   - ❌ Neither user can send messages

2. **First Reconnect (User B clicks reconnect):**
   - User B clicks "Reconnect" button
   - User A must also click "Reconnect"
   - ✅ User B can now send messages → User A receives them
   - ❌ User A CANNOT send messages → User B doesn't receive them

3. **Second Reconnect (User A clicks reconnect):**
   - User A clicks "Reconnect" button
   - User B must also click "Reconnect"
   - ✅ User A can now send messages → User B receives them
   - ❌ User B CANNOT send messages → User A doesn't receive them

4. **Pattern:**
   - **Whoever reconnects FIRST can send messages**
   - **Whoever reconnects SECOND cannot send messages**
   - This creates an asymmetric, broken communication channel

---

## Root Cause Analysis

### The Core Issue: Offer/Answer Race Condition

WebRTC requires a strict **offer/answer negotiation**:
1. One peer creates an **offer** (SDP)
2. Other peer creates an **answer** (SDP)
3. Both peers exchange ICE candidates
4. Connection establishes

**The Problem:**
- When both users click reconnect, BOTH try to create offers simultaneously
- This creates a **race condition** where:
  - User A creates offer → User B creates offer (conflict!)
  - Only ONE direction gets properly negotiated
  - DataChannel opens in only ONE direction
  - Result: Asymmetric messaging

### Why Reconnect "Works" for One User

When User B reconnects first:
1. User B initiates offer
2. User A responds with answer
3. DataChannel opens: B → A (User B can send)
4. But A → B DataChannel never opens (User A cannot send)

When User A reconnects after:
1. User A initiates NEW offer
2. User B responds with answer
3. DataChannel opens: A → B (User A can send)
4. But B → A DataChannel gets REPLACED (User B cannot send anymore)

---

## Technical Details

### Affected Code Files

1. **`room-connection-manager.js`**
   - `createPeerConnection()` - Creates RTCPeerConnection
   - `setupDataChannel()` - Sets up DataChannel
   - Issue: No role negotiation (who offers, who answers)

2. **`webrtc-signaling.js`**
   - `sendOffer()` / `sendAnswer()` - Signaling messages
   - Issue: Both peers can send offers simultaneously

3. **`chat-manager.js`**
   - `sendMessage()` - Sends via DataChannel
   - Issue: Only works if DataChannel is open in that direction

### Connection State Logs

**When User B Reconnects First:**
```
[RoomConnection] Creating peer connection to: user_A (initiator: true)
[RoomConnection] DATA CHANNEL OPENED with: user_A
[ChatManager] Sending via WebRTC DataChannel to 1 peers
// User B can send, User A receives
// But User A's DataChannel to User B is NOT open
```

**When User A Reconnects After:**
```
[RoomConnection] Creating peer connection to: user_B (initiator: true)
[RoomConnection] DATA CHANNEL OPENED with: user_B
[ChatManager] Sending via WebRTC DataChannel to 1 peers
// User A can send, User B receives
// But User B's DataChannel to User A is NOW CLOSED (replaced)
```

---

## Why This Happens

### 1. No Role Assignment
- No logic to determine who should be "offerer" vs "answerer"
- Both peers try to initiate connection simultaneously

### 2. Duplicate Connections
- When both create offers, two separate connections are attempted
- Only one succeeds, the other fails silently
- Result: One-way DataChannel

### 3. Connection Replacement
- When second user reconnects, they create a NEW offer
- This replaces the existing connection
- Previous DataChannel is closed
- New DataChannel opens in opposite direction

---

## Expected Behavior

### Correct WebRTC Negotiation

1. **Deterministic Role Assignment:**
   - Use peer IDs to determine roles
   - Example: `if (myId < theirId)` → I offer, else I answer
   - This ensures only ONE peer creates offer

2. **Automatic Connection:**
   - Connection should establish automatically on join
   - No manual reconnect needed

3. **Bidirectional DataChannel:**
   - BOTH users can send and receive
   - DataChannel is bidirectional by default
   - But requires proper offer/answer negotiation

4. **Stable Connection:**
   - Once connected, stays connected
   - Reconnect only needed if connection actually drops

---

## Solution Design

### 1. Implement Polite/Impolite Peer Pattern

**Polite Peer (Lower ID):**
- Always accepts incoming offers
- Rolls back own offer if collision occurs
- Waits for other peer's offer

**Impolite Peer (Higher ID):**
- Ignores incoming offers if already sent one
- Continues with own offer
- Forces polite peer to accept

### 2. Add Connection State Machine

```javascript
States:
- IDLE: No connection
- OFFERING: Sent offer, waiting for answer
- ANSWERING: Received offer, sending answer
- CONNECTED: DataChannel open
- RECONNECTING: Connection lost, attempting recovery
```

### 3. Prevent Duplicate Connections

```javascript
// Before creating connection, check:
if (existingConnection && existingConnection.connectionState === 'connected') {
    console.log('Already connected, skipping');
    return existingConnection;
}
```

### 4. Add Offer Collision Detection

```javascript
async handleOffer(fromPeer, offer) {
    if (this.isOffering && this.isImpolite) {
        // Ignore incoming offer, continue with ours
        console.log('Ignoring offer, we are impolite peer');
        return;
    }
    
    if (this.isOffering && this.isPolite) {
        // Roll back our offer, accept theirs
        console.log('Rolling back our offer, accepting theirs');
        await this.rollbackOffer();
    }
    
    // Accept offer
    await this.acceptOffer(offer);
}
```

---

## Implementation Plan

### Phase 1: Add Role Determination (CRITICAL)
- [ ] Add `isPolite` flag based on peer ID comparison
- [ ] Modify `createPeerConnection()` to respect roles
- [ ] Add offer collision handling

### Phase 2: Fix Signaling (HIGH)
- [ ] Add offer collision detection in `webrtc-signaling.js`
- [ ] Implement rollback mechanism
- [ ] Add connection state tracking

### Phase 3: Improve Connection Management (MEDIUM)
- [ ] Prevent duplicate connections
- [ ] Add automatic reconnection logic
- [ ] Improve error handling and logging

### Phase 4: Testing (HIGH)
- [ ] Test with 2 users joining simultaneously
- [ ] Test reconnection scenarios
- [ ] Test with 3+ users (mesh network)
- [ ] Test network interruptions

---

## References

### WebRTC Perfect Negotiation Pattern
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
- https://w3c.github.io/webrtc-pc/#perfect-negotiation-example

### Key Concepts
- **Offer Collision:** Both peers send offers simultaneously
- **Polite Peer:** Yields to other peer's offer
- **Impolite Peer:** Ignores other peer's offer if already sent one
- **Rollback:** Canceling own offer to accept incoming offer

---

## Workaround (Temporary)

Until fix is implemented:
1. User B joins room
2. User B clicks "Reconnect" first
3. User A clicks "Reconnect" after
4. User B can now send messages
5. If User A needs to send, both click "Reconnect" again in reverse order

**This is NOT acceptable for production!**

---

## Impact

- **User Experience:** BROKEN - Manual reconnection required
- **Reliability:** LOW - Only one-way messaging at a time
- **Scalability:** BLOCKED - Cannot work with 3+ users
- **Production Ready:** NO - Critical bug

---

## Next Steps

1. ✅ Document error (this file)
2. 🔄 Implement polite/impolite peer pattern
3. 🔄 Add offer collision handling
4. 🔄 Test with multiple users
5. ⏳ Deploy fix
6. ⏳ Verify in production

---

**This bug MUST be fixed before production deployment!**
