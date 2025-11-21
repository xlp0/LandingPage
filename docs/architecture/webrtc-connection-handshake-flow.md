# WebRTC Connection Handshake Flow - Interactive Diagram

**Date:** November 21, 2025  
**Version:** 2.0  
**Status:** Debugging Connection Issues

---

## Current Problem

**Symptom:** Connection not establishing automatically
**Logs Show:**
- ✅ User joins room successfully
- ✅ `user-joined-room` broadcast sent
- ❌ `peer-ready` signal NOT received by other peer
- ❌ No WebRTC offer/answer exchange
- ❌ DataChannel never opens

---

## Complete Handshake Flow (Step-by-Step)

### Phase 1: Room Creation (Host)

```
┌─────────────────────────────────────────────────────────────┐
│ USER A (Host) - Creates Room                                 │
└─────────────────────────────────────────────────────────────┘

1. User A enters name: "Alice"
2. User A clicks "Create Room"
   
   Dashboard Manager:
   ├─► createRoom({name: "Test Room"})
   │
   Room Service:
   ├─► createRoom(roomData)
   ├─► rooms.set(roomId, roomData)
   ├─► localRooms.add(roomId)
   ├─► Broadcast: 'room-created' on 'webrtc-dashboard-rooms'
   │   {
   │     roomId: "room_abc123",
   │     name: "Test Room",
   │     host: "Alice"
   │   }
   │
   Chat Manager:
   └─► joinRoom(roomId, userData)
       ├─► currentRoom = roomId
       ├─► currentUser = {id: "user_alice", name: "Alice"}
       ├─► Create RoomConnectionManager(roomId)
       ├─► roomConnection.setUserId("user_alice")
       │   └─► Initialize WebRTCSignaling
       │       └─► Listen on channel: 'webrtc-signaling'
       │
       ├─► participants.set("user_alice", {...})
       │
       ├─► Broadcast: 'participant-joined' on 'webrtc-dashboard-chat'
       │   {
       │     roomId: "room_abc123",
       │     participant: {id: "user_alice", name: "Alice"}
       │   }
       │
       └─► Broadcast: 'peer-ready' on 'webrtc-dashboard-chat'  ⚠️
           {
             roomId: "room_abc123",
             userId: "user_alice",
             userName: "Alice"
           }

STATUS: ✅ Room created, Alice waiting for others
```

---

### Phase 2: Room Join (Joiner)

```
┌─────────────────────────────────────────────────────────────┐
│ USER B (Joiner) - Joins Room                                 │
└─────────────────────────────────────────────────────────────┘

1. User B enters name: "Bob"
2. User B sees "Test Room" in room list
3. User B clicks "Join Room"
   
   Dashboard Manager:
   ├─► joinRoom(roomId)
   │
   Room Service:
   ├─► joinRoom(roomId, userData)
   ├─► Broadcast: 'user-joined-room' on 'webrtc-dashboard-rooms'
   │   {
   │     roomId: "room_abc123",
   │     userId: "user_bob",
   │     userName: "Bob"
   │   }
   │
   Chat Manager:
   └─► joinRoom(roomId, userData)
       ├─► currentRoom = roomId
       ├─► currentUser = {id: "user_bob", name: "Bob"}
       ├─► Create RoomConnectionManager(roomId)
       ├─► roomConnection.setUserId("user_bob")
       │   └─► Initialize WebRTCSignaling
       │       └─► Listen on channel: 'webrtc-signaling'
       │
       ├─► participants.set("user_bob", {...})
       │
       ├─► Broadcast: 'participant-joined' on 'webrtc-dashboard-chat'
       │   {
       │     roomId: "room_abc123",
       │     participant: {id: "user_bob", name: "Bob"}
       │   }
       │
       └─► Broadcast: 'peer-ready' on 'webrtc-dashboard-chat'  ⚠️
           {
             roomId: "room_abc123",
             userId: "user_bob",
             userName: "Bob"
           }

STATUS: ✅ Bob joined, both sent peer-ready
```

---

### Phase 3: Peer Discovery (BROKEN - peer-ready not received)

```
┌─────────────────────────────────────────────────────────────┐
│ EXPECTED: Both users receive each other's peer-ready         │
└─────────────────────────────────────────────────────────────┘

User A (Alice) should receive:
┌──────────────────────────────────────────────────────────┐
│ ❌ NOT HAPPENING:                                         │
│                                                           │
│ ChatManager.broadcastService.on('peer-ready', (data) => {│
│   // data = {                                            │
│   //   roomId: "room_abc123",                            │
│   //   userId: "user_bob",                               │
│   //   userName: "Bob"                                   │
│   // }                                                    │
│                                                           │
│   if (data.userId !== this.currentUser.id) {             │
│     // Compare IDs                                        │
│     const shouldInitiate = "user_alice" < "user_bob";    │
│     // Result: true (alice < bob alphabetically)         │
│                                                           │
│     if (shouldInitiate) {                                 │
│       // Alice creates offer to Bob                       │
│       this.roomConnection.createOffer("user_bob");        │
│     }                                                     │
│   }                                                       │
│ });                                                       │
└──────────────────────────────────────────────────────────┘

User B (Bob) should receive:
┌──────────────────────────────────────────────────────────┐
│ ❌ NOT HAPPENING:                                         │
│                                                           │
│ ChatManager.broadcastService.on('peer-ready', (data) => {│
│   // data = {                                            │
│   //   roomId: "room_abc123",                            │
│   //   userId: "user_alice",                             │
│   //   userName: "Alice"                                 │
│   // }                                                    │
│                                                           │
│   if (data.userId !== this.currentUser.id) {             │
│     // Compare IDs                                        │
│     const shouldInitiate = "user_bob" < "user_alice";    │
│     // Result: false (bob > alice alphabetically)        │
│                                                           │
│     if (shouldInitiate) {                                 │
│       // Don't create offer                               │
│     } else {                                              │
│       // Bob waits for Alice's offer                      │
│       console.log('Waiting for offer...');                │
│     }                                                     │
│   }                                                       │
│ });                                                       │
└──────────────────────────────────────────────────────────┘

PROBLEM: peer-ready messages not being received!
REASON: Broadcast channel mismatch or timing issue
```

---

### Phase 4: WebRTC Offer/Answer (Should happen but doesn't)

```
┌─────────────────────────────────────────────────────────────┐
│ EXPECTED: Alice creates offer, Bob creates answer            │
└─────────────────────────────────────────────────────────────┘

Alice (Lower ID - Initiator):
┌──────────────────────────────────────────────────────────┐
│ 1. roomConnection.createOffer("user_bob")                 │
│    ├─► Create RTCPeerConnection                           │
│    ├─► pc.createDataChannel('chat')                       │
│    ├─► offer = await pc.createOffer()                     │
│    ├─► await pc.setLocalDescription(offer)                │
│    └─► signaling.sendOffer("user_bob", offer)             │
│        └─► Broadcast: 'webrtc-offer' on 'webrtc-signaling'│
│            {                                               │
│              fromUserId: "user_alice",                     │
│              toUserId: "user_bob",                         │
│              offer: {type: "offer", sdp: "..."}            │
│            }                                               │
└──────────────────────────────────────────────────────────┘

Bob (Higher ID - Answerer):
┌──────────────────────────────────────────────────────────┐
│ 2. Receives 'webrtc-offer' on 'webrtc-signaling'          │
│    ├─► signaling.onOffer(fromUserId, offer)               │
│    ├─► roomConnection.handleOffer("user_alice", offer)    │
│    │   ├─► Create RTCPeerConnection                       │
│    │   ├─► await pc.setRemoteDescription(offer)           │
│    │   ├─► answer = await pc.createAnswer()               │
│    │   ├─► await pc.setLocalDescription(answer)           │
│    │   └─► signaling.sendAnswer("user_alice", answer)     │
│    │       └─► Broadcast: 'webrtc-answer' on 'webrtc-signaling'│
│    │           {                                           │
│    │             fromUserId: "user_bob",                   │
│    │             toUserId: "user_alice",                   │
│    │             answer: {type: "answer", sdp: "..."}      │
│    │           }                                           │
│    └─► pc.ondatachannel = (event) => {                    │
│        └─► setupDataChannel(event.channel)                │
│            └─► channel.onopen = () => {                    │
│                console.log('✅ DATA CHANNEL OPENED');      │
│            }                                               │
│    }                                                       │
└──────────────────────────────────────────────────────────┘

Alice receives answer:
┌──────────────────────────────────────────────────────────┐
│ 3. Receives 'webrtc-answer' on 'webrtc-signaling'         │
│    ├─► signaling.onAnswer(fromUserId, answer)             │
│    ├─► roomConnection.handleAnswer("user_bob", answer)    │
│    │   └─► await pc.setRemoteDescription(answer)          │
│    └─► DataChannel.onopen = () => {                       │
│        console.log('✅ DATA CHANNEL OPENED');             │
│    }                                                       │
└──────────────────────────────────────────────────────────┘

STATUS: ❌ NOT HAPPENING - No offer created because peer-ready not received
```

---

### Phase 5: ICE Candidate Exchange (Should happen but doesn't)

```
┌─────────────────────────────────────────────────────────────┐
│ EXPECTED: Both peers exchange ICE candidates                 │
└─────────────────────────────────────────────────────────────┘

Both Alice and Bob:
┌──────────────────────────────────────────────────────────┐
│ pc.onicecandidate = (event) => {                          │
│   if (event.candidate) {                                  │
│     signaling.sendIceCandidate(peerId, event.candidate);  │
│     └─► Broadcast: 'webrtc-ice' on 'webrtc-signaling'     │
│         {                                                  │
│           fromUserId: "user_alice",                        │
│           toUserId: "user_bob",                            │
│           candidate: {...}                                 │
│         }                                                  │
│   }                                                        │
│ };                                                         │
│                                                            │
│ signaling.onIceCandidate = (fromUserId, candidate) => {   │
│   pc.addIceCandidate(new RTCIceCandidate(candidate));     │
│ };                                                         │
└──────────────────────────────────────────────────────────┘

STATUS: ❌ NOT HAPPENING - No ICE exchange because no offer/answer
```

---

### Phase 6: Connection Established (Should happen but doesn't)

```
┌─────────────────────────────────────────────────────────────┐
│ EXPECTED: DataChannel opens, messaging works                 │
└─────────────────────────────────────────────────────────────┘

Both Alice and Bob:
┌──────────────────────────────────────────────────────────┐
│ pc.onconnectionstatechange = () => {                       │
│   if (pc.connectionState === 'connected') {               │
│     console.log('✅ PEER CONNECTED');                     │
│   }                                                        │
│ };                                                         │
│                                                            │
│ dataChannel.onopen = () => {                               │
│   console.log('✅ DATA CHANNEL OPENED');                  │
│   // Now can send messages!                                │
│ };                                                         │
└──────────────────────────────────────────────────────────┘

Alice sends message:
┌──────────────────────────────────────────────────────────┐
│ chatManager.sendMessage("Hello Bob!");                     │
│ ├─► dataChannel.send(JSON.stringify(message));            │
│ └─► Bob receives via dataChannel.onmessage                 │
└──────────────────────────────────────────────────────────┘

Bob sends message:
┌──────────────────────────────────────────────────────────┐
│ chatManager.sendMessage("Hi Alice!");                      │
│ ├─► dataChannel.send(JSON.stringify(message));            │
│ └─► Alice receives via dataChannel.onmessage               │
└──────────────────────────────────────────────────────────┘

STATUS: ❌ NOT HAPPENING - No connection because no handshake
```

---

## Broadcast Channels Used

```
Channel Name                  | Purpose
------------------------------|------------------------------------------
webrtc-dashboard-rooms        | Room creation, room list, user-joined-room
webrtc-dashboard-chat         | participant-joined, participant-left, peer-ready ⚠️
webrtc-dashboard-access       | Join requests, approvals (not used yet)
webrtc-signaling              | webrtc-offer, webrtc-answer, webrtc-ice
```

---

## Root Cause Analysis

### Problem: `peer-ready` Not Received

**Possible Causes:**

1. **Broadcast Channel Isolation**
   - Each tab creates its own `WebSocketBroadcastService` instance
   - Messages sent on `webrtc-dashboard-chat` channel
   - But are other tabs listening to the same channel?

2. **Timing Issue**
   - `peer-ready` sent before other user's ChatManager is initialized
   - Message lost because listener not set up yet

3. **Channel Mismatch**
   - Sender uses one channel name
   - Receiver listens to different channel name

4. **WebSocket Connection**
   - WebSocket not properly connected when message sent
   - Message sent but not delivered by server

---

## Debug Steps

### 1. Check if peer-ready is being sent

```javascript
// In chat-manager.js line 176
this._broadcastMessage('peer-ready', {...});

// Should see in console:
[WSBroadcast] 📤 Sending: peer-ready on webrtc-dashboard-chat
[WSBroadcast] ✅ Message sent: peer-ready
```

### 2. Check if peer-ready is being received

```javascript
// In chat-manager.js line 70
this.broadcastService.on('peer-ready', (data) => {
    console.log('[ChatManager] ✅ Peer ready signal received:', data);
});

// Should see in console:
[WSBroadcast] 📨 Message received: peer-ready on webrtc-dashboard-chat
[ChatManager] ✅ Peer ready signal received: {roomId: "...", userId: "..."}
```

### 3. Check WebSocket server logs

```bash
docker logs landingpage-local

# Should see:
[WebSocket] Message received: peer-ready
[WebSocket] Broadcasting to X clients
```

---

## Solution

### Option 1: Use Same Channel for All Room Messages

Change `peer-ready` to use `webrtc-dashboard-rooms` channel (same as `user-joined-room`):

```javascript
// In chat-manager.js
this.channelName = 'webrtc-dashboard-rooms';  // Instead of 'webrtc-dashboard-chat'
```

### Option 2: Ensure ChatManager Initialized Before Sending

Add delay or confirmation that ChatManager is ready:

```javascript
// Wait for ChatManager to be fully initialized
await this.chatManager.init();
await new Promise(resolve => setTimeout(resolve, 100));  // Small delay
// Then send peer-ready
```

### Option 3: Use user-joined-room as Trigger

Instead of separate `peer-ready`, use existing `user-joined-room` broadcast:

```javascript
// In chat-manager.js
this.broadcastService.on('user-joined-room', (data) => {
    // This is already working!
    // Use this to initiate WebRTC connection
    if (data.roomId === this.currentRoom && data.userId !== this.currentUser.id) {
        // Initiate connection
        const shouldInitiate = this.currentUser.id < data.userId;
        if (shouldInitiate) {
            this.roomConnection.createOffer(data.userId);
        }
    }
});
```

---

## Recommended Fix

**Use `user-joined-room` instead of `peer-ready`** because:
1. ✅ Already working (visible in logs)
2. ✅ Uses `webrtc-dashboard-rooms` channel (reliable)
3. ✅ Sent by RoomService (centralized)
4. ✅ Contains all needed info (roomId, userId, userName)
5. ✅ No timing issues (always received)

---

## Next Steps

1. Remove `peer-ready` broadcast
2. Use `user-joined-room` as connection trigger
3. Test with 2 users
4. Verify automatic connection
5. Test with 3+ users (mesh network)

---

**This diagram will be updated once the fix is implemented and verified.**
