# Redux Documentation Index

**Version:** 1.0

---

## 📚 Documentation Structure

```
docs/redux/
├── INDEX.md (this file)
├── REDUX_ARCHITECTURE.md (main architecture overview)
├── slices/
│   ├── auth-slice.md ✅
│   ├── dashboard-slice.md (TODO)
│   ├── room-slice.md (TODO)
│   ├── rtc-connection-slice.md ✅
│   ├── participants-slice.md ✅
│   ├── invitations-slice.md ✅
│   └── messages-slice.md (TODO)
├── selectors/
│   ├── auth-selectors.md (TODO)
│   ├── room-selectors.md (TODO)
│   ├── rtc-selectors.md (TODO)
│   └── participant-selectors.md (TODO)
└── middleware/
    ├── auth-middleware.md (TODO)
    ├── rtc-middleware.md (TODO)
    └── sync-middleware.md (TODO)
```

---

## 🎯 Redux Slices Overview

### 1. **Auth Slice** ✅ `auth-slice.md`
**Manages:** User authentication, login/logout, tokens, user profile

**Key State:**
- `isAuthenticated` - Login status
- `user` - Current user data
- `token` - JWT token
- `loading` - Loading state
- `error` - Error messages

**Key Actions:**
- `loginStart()` - Begin login
- `loginSuccess(user, token)` - Login successful
- `logout()` - Logout user
- `updateUserProfile(profile)` - Update user info
- `setUserStatus(status)` - Set online/offline/away

**Integration:** Zitadel OAuth2, localStorage persistence

---

### 2. **Dashboard Slice** (TODO) `dashboard-slice.md`
**Manages:** UI state, navigation, theme, notifications

**Expected State:**
- `currentPage` - Active page
- `sidebarOpen` - Sidebar visibility
- `theme` - Light/dark mode
- `notifications` - Toast notifications
- `loading` - Global loading state

**Expected Actions:**
- `navigateTo(page)` - Change page
- `toggleSidebar()` - Toggle sidebar
- `setTheme(theme)` - Change theme
- `addNotification(notification)` - Show notification

---

### 3. **Room Slice** (TODO) `room-slice.md`
**Manages:** Room list, current room, room metadata

**Expected State:**
- `list` - All rooms
- `currentRoomId` - Active room ID
- `currentRoom` - Active room data
- `filter` - Search/sort filters
- `loading` - Loading state

**Expected Actions:**
- `fetchRoomsStart()` - Begin fetch
- `fetchRoomsSuccess(rooms)` - Rooms loaded
- `createRoom(roomData)` - Create room
- `joinRoom(roomId)` - Join room
- `leaveRoom(roomId)` - Leave room
- `setFilter(filter)` - Update filter

---

### 4. **RTC Connection Slice** ✅ `rtc-connection-slice.md`
**Manages:** WebRTC peer connections, connection status, media streams

**Key State:**
- `connections` - Map of peer connections
- `localStream` - Local media stream
- `audioEnabled` - Audio status
- `videoEnabled` - Video status
- `screenSharing` - Screen share status
- `iceCandidates` - ICE candidates
- `error` - Connection errors

**Key Actions:**
- `initializeLocalStream(stream)` - Set local stream
- `addPeerConnection(peerId, userId, userName)` - Add peer
- `updateConnectionStatus(peerId, status)` - Update status
- `updateConnectionStats(peerId, stats)` - Update stats
- `removePeerConnection(peerId)` - Remove peer
- `toggleAudio(enabled)` - Toggle audio
- `toggleVideo(enabled)` - Toggle video
- `toggleScreenShare(enabled)` - Toggle screen share

**Integration:** WebRTC API, connection statistics

---

### 5. **Participants Slice** ✅ `participants-slice.md`
**Manages:** Connected users, their status, media, permissions

**Key State:**
- `list` - All participants
- `localParticipant` - Current user
- `selectedParticipantId` - Focused participant
- `filter` - Search/filter options
- `loading` - Loading state

**Key Actions:**
- `addParticipant(participant)` - Add participant
- `removeParticipant(participantId)` - Remove participant
- `updateParticipantStatus(participantId, status)` - Update status
- `updateParticipantMedia(participantId, media)` - Update media
- `setLocalParticipant(participant)` - Set local user
- `selectParticipant(participantId)` - Select for focus
- `updateParticipantActivity(participantId)` - Update activity

**Integration:** RTC Connection slice, WebSocket events

---

### 6. **Invitations Slice** ✅ `invitations-slice.md`
**Manages:** Room invitations, invitation status, responses

**Key State:**
- `sent` - Sent invitations
- `received` - Received invitations
- `filter` - Search/filter options
- `loading` - Loading state

**Key Actions:**
- `sendInvitation(recipientId, roomId, message)` - Send invite
- `addReceivedInvitation(invitation)` - Receive invite
- `acceptInvitation(invitationId)` - Accept invite
- `rejectInvitation(invitationId, reason)` - Reject invite
- `cancelInvitation(invitationId)` - Cancel sent invite
- `updateInvitationStatus(invitationId, status)` - Update status

**Integration:** WebSocket events, server API

---

### 7. **Messages Slice** (TODO) `messages-slice.md`
**Manages:** Chat messages, message history, unread count

**Expected State:**
- `byRoom` - Messages grouped by room
- `currentRoomMessages` - Current room messages
- `unreadCount` - Unread message count
- `loading` - Loading state

**Expected Actions:**
- `addMessage(roomId, message)` - Add message
- `fetchMessages(roomId)` - Fetch room messages
- `markAsRead(roomId)` - Mark as read
- `deleteMessage(messageId)` - Delete message
- `updateMessage(messageId, content)` - Edit message

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  (Landing Page → Dashboard → Room → Video Conference)       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─ dispatch(action)
                 │
┌────────────────v────────────────────────────────────────────┐
│                    Redux Store                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Slice   │  │ Room Slice   │  │ RTC Slice    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Participants │  │ Invitations  │  │ Messages     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─ subscribe(selector)
                 │
┌────────────────v────────────────────────────────────────────┐
│                    Middleware                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth MW      │  │ RTC MW       │  │ Sync MW      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─ API calls
                 ├─ WebSocket events
                 ├─ WebRTC operations
                 │
┌────────────────v────────────────────────────────────────────┐
│                External Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Zitadel      │  │ Backend API  │  │ WebSocket    │      │
│  │ OAuth2       │  │ /api/*       │  │ Server       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Integration Points

### Landing Page → Auth Slice
```
User clicks "Login"
  ↓
Redirects to vpn.pkc.pub
  ↓
User authenticates
  ↓
Callback receives code
  ↓
dispatch(loginWithZitadel(code, state))
  ↓
Auth Slice stores user & token
  ↓
Redirect to dashboard
```

### Dashboard → Room Slice
```
User navigates to dashboard
  ↓
dispatch(fetchRooms())
  ↓
Room Slice loads room list
  ↓
User clicks room
  ↓
dispatch(joinRoom(roomId))
  ↓
Redirect to room
```

### Room → RTC Connection Slice
```
User joins room
  ↓
dispatch(initializeLocalStream())
  ↓
WebSocket: peer-joined event
  ↓
dispatch(addPeerConnection(peerId))
  ↓
Establish WebRTC connection
  ↓
dispatch(updateConnectionStatus(peerId, 'connected'))
```

### RTC Connection ↔ Participants Slice
```
RTC connection established
  ↓
dispatch(updateParticipantConnection(peerId, status))
  ↓
Participants slice updates participant status
  ↓
UI re-renders with updated participant list
```

---

## 📊 State Tree Example

```javascript
{
  auth: {
    isAuthenticated: true,
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'online'
    },
    token: 'eyJhbGc...',
    loading: false,
    error: null
  },
  
  rooms: {
    list: [
      { id: 'room-1', name: 'Team Meeting', participants: 5 },
      { id: 'room-2', name: 'Project Sync', participants: 3 }
    ],
    currentRoomId: 'room-1',
    loading: false
  },
  
  rtcConnections: {
    connections: {
      'peer-1': {
        status: 'connected',
        stats: { latency: 45, bandwidth: 2500 }
      },
      'peer-2': {
        status: 'connected',
        stats: { latency: 52, bandwidth: 2200 }
      }
    },
    audioEnabled: true,
    videoEnabled: true,
    screenSharing: false
  },
  
  participants: {
    list: [
      { id: 'p-1', name: 'John', status: 'active', audioEnabled: true },
      { id: 'p-2', name: 'Jane', status: 'active', audioEnabled: false }
    ],
    localParticipant: { id: 'p-1', name: 'You', status: 'active' }
  },
  
  invitations: {
    sent: [],
    received: [
      { id: 'inv-1', senderName: 'Bob', roomName: 'Meeting', status: 'pending' }
    ]
  }
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Slices (✅ Complete)
- [x] Auth Slice
- [x] RTC Connection Slice
- [x] Participants Slice
- [x] Invitations Slice

### Phase 2: UI Slices (In Progress)
- [ ] Dashboard Slice
- [ ] Room Slice
- [ ] Messages Slice

### Phase 3: Middleware (TODO)
- [ ] Auth Middleware (token refresh, persistence)
- [ ] RTC Middleware (connection lifecycle)
- [ ] Sync Middleware (WebSocket sync)

### Phase 4: Integration (TODO)
- [ ] Connect to React components
- [ ] Implement async thunks
- [ ] Add Redux DevTools
- [ ] Performance optimization

---

## 📖 Quick Reference

### Common Selectors
```javascript
// Auth
selectIsAuthenticated(state)
selectUser(state)
selectUserName(state)

// RTC
selectConnectedPeers(state)
selectConnectionStatus(state, peerId)
selectAudioEnabled(state)

// Participants
selectAllParticipants(state)
selectLocalParticipant(state)
selectParticipantsWithVideo(state)

// Invitations
selectPendingReceivedInvitations(state)
selectPendingReceivedCount(state)
```

### Common Actions
```javascript
// Auth
dispatch(loginWithZitadel(code, state))
dispatch(logout())
dispatch(updateUserProfile(profile))

// RTC
dispatch(initializeMedia())
dispatch(toggleAudio(!audioEnabled))
dispatch(toggleVideo(!videoEnabled))

// Participants
dispatch(addParticipant(participant))
dispatch(updateParticipantStatus(id, status))

// Invitations
dispatch(sendInvitationToServer(recipientId, roomId))
dispatch(acceptInvitation(invitationId))
```

---

## 🔗 Related Documentation

- `REDUX_ARCHITECTURE.md` - Complete architecture overview
- `../webrtc-dashboard-architecture.md` - WebRTC system architecture
- `../QUICKSTART.md` - Quick start guide

---

## 📝 Notes

- All slices use Redux Toolkit for simplified syntax
- Async operations use `createAsyncThunk`
- Selectors use `reselect` for memoization
- Middleware handles side effects and API calls
- State is normalized for efficient updates

