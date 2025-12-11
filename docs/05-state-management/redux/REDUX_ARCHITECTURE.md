# Redux Architecture for THK Mesh Dashboard

**Version:** 1.0  
**Date:** November 25, 2025  
**Status:** Planning Phase

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Redux Slices Structure](#redux-slices-structure)
3. [State Tree](#state-tree)
4. [Slice Definitions](#slice-definitions)
5. [Actions & Reducers](#actions--reducers)
6. [Selectors](#selectors)
7. [Middleware](#middleware)
8. [Integration Points](#integration-points)

---

## Overview

Redux will manage the following domains:
- **User Authentication** - Login state, user profile, tokens
- **Dashboard** - UI state, navigation, settings
- **Rooms** - Room list, current room, room metadata
- **RTC Connections** - Peer connections, connection status
- **Participants** - Connected users, their status
- **Invitations** - Pending invites, invite status
- **Messages** - Chat messages, message history

---

## Redux Slices Structure

```
docs/redux/
├── REDUX_ARCHITECTURE.md (this file)
├── slices/
│   ├── auth-slice.md
│   ├── dashboard-slice.md
│   ├── room-slice.md
│   ├── rtc-connection-slice.md
│   ├── participants-slice.md
│   ├── invitations-slice.md
│   └── messages-slice.md
├── selectors/
│   ├── auth-selectors.md
│   ├── room-selectors.md
│   ├── rtc-selectors.md
│   └── participant-selectors.md
└── middleware/
    ├── auth-middleware.md
    ├── rtc-middleware.md
    └── sync-middleware.md
```

---

## State Tree

```javascript
{
  // Authentication & User
  auth: {
    isAuthenticated: boolean,
    user: {
      id: string,
      name: string,
      email: string,
      avatar: string,
      status: 'online' | 'offline' | 'away'
    },
    token: string,
    refreshToken: string,
    loading: boolean,
    error: string | null
  },

  // Dashboard UI State
  dashboard: {
    currentPage: 'login' | 'dashboard' | 'room' | 'settings',
    sidebarOpen: boolean,
    theme: 'light' | 'dark',
    notifications: Notification[],
    loading: boolean
  },

  // Rooms Management
  rooms: {
    list: Room[],
    currentRoomId: string | null,
    currentRoom: Room | null,
    loading: boolean,
    error: string | null,
    filter: {
      search: string,
      sortBy: 'name' | 'date' | 'participants'
    }
  },

  // RTC Connections
  rtcConnections: {
    connections: {
      [peerId]: {
        peerConnection: RTCPeerConnection,
        status: 'connecting' | 'connected' | 'disconnected' | 'failed',
        stats: {
          latency: number,
          bandwidth: number,
          packetLoss: number
        }
      }
    },
    localStream: MediaStream | null,
    audioEnabled: boolean,
    videoEnabled: boolean,
    screenSharing: boolean,
    error: string | null
  },

  // Participants in Current Room
  participants: {
    list: Participant[],
    localParticipant: Participant | null,
    selectedParticipant: string | null,
    loading: boolean
  },

  // Invitations
  invitations: {
    sent: Invitation[],
    received: Invitation[],
    loading: boolean
  },

  // Messages
  messages: {
    [roomId]: Message[],
    currentRoomMessages: Message[],
    unreadCount: number,
    loading: boolean
  }
}
```

---

## Slice Definitions

### 1. Auth Slice
**File:** `slices/auth-slice.md`

**State:**
```javascript
{
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null
}
```

**Actions:**
- `loginStart()` - Begin login process
- `loginSuccess(user, token)` - Login successful
- `loginFailure(error)` - Login failed
- `logout()` - User logout
- `refreshTokenSuccess(token)` - Token refreshed
- `updateUserProfile(profile)` - Update user info

---

### 2. Dashboard Slice
**File:** `slices/dashboard-slice.md`

**State:**
```javascript
{
  currentPage: 'login',
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  loading: false
}
```

**Actions:**
- `navigateTo(page)` - Change current page
- `toggleSidebar()` - Toggle sidebar visibility
- `setTheme(theme)` - Set UI theme
- `addNotification(notification)` - Add notification
- `removeNotification(id)` - Remove notification
- `setLoading(loading)` - Set loading state

---

### 3. Room Slice
**File:** `slices/room-slice.md`

**State:**
```javascript
{
  list: [],
  currentRoomId: null,
  currentRoom: null,
  loading: false,
  error: null,
  filter: {
    search: '',
    sortBy: 'name'
  }
}
```

**Actions:**
- `fetchRoomsStart()` - Begin fetching rooms
- `fetchRoomsSuccess(rooms)` - Rooms fetched
- `fetchRoomsFailure(error)` - Fetch failed
- `createRoom(roomData)` - Create new room
- `joinRoom(roomId)` - Join a room
- `leaveRoom(roomId)` - Leave current room
- `updateRoom(roomId, data)` - Update room info
- `setCurrentRoom(room)` - Set active room
- `setFilter(filter)` - Update filter/search

---

### 4. RTC Connection Slice
**File:** `slices/rtc-connection-slice.md`

**State:**
```javascript
{
  connections: {},
  localStream: null,
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  error: null
}
```

**Actions:**
- `initializeLocalStream(stream)` - Set local media stream
- `addPeerConnection(peerId, connection)` - Add peer connection
- `updateConnectionStatus(peerId, status)` - Update connection status
- `updateConnectionStats(peerId, stats)` - Update connection stats
- `removePeerConnection(peerId)` - Remove peer connection
- `toggleAudio(enabled)` - Toggle audio
- `toggleVideo(enabled)` - Toggle video
- `toggleScreenShare(enabled)` - Toggle screen sharing
- `setRTCError(error)` - Set error state

---

### 5. Participants Slice
**File:** `slices/participants-slice.md`

**State:**
```javascript
{
  list: [],
  localParticipant: null,
  selectedParticipant: null,
  loading: false
}
```

**Actions:**
- `addParticipant(participant)` - Add participant
- `removeParticipant(participantId)` - Remove participant
- `updateParticipantStatus(participantId, status)` - Update status
- `setLocalParticipant(participant)` - Set local user
- `selectParticipant(participantId)` - Select participant
- `updateParticipantStream(participantId, stream)` - Update media stream

---

### 6. Invitations Slice
**File:** `slices/invitations-slice.md`

**State:**
```javascript
{
  sent: [],
  received: [],
  loading: false
}
```

**Actions:**
- `sendInvitation(userId, roomId)` - Send invite
- `acceptInvitation(invitationId)` - Accept invite
- `rejectInvitation(invitationId)` - Reject invite
- `cancelInvitation(invitationId)` - Cancel sent invite
- `fetchInvitations()` - Fetch all invitations
- `updateInvitationStatus(invitationId, status)` - Update status

---

### 7. Messages Slice
**File:** `slices/messages-slice.md`

**State:**
```javascript
{
  byRoom: {},
  currentRoomMessages: [],
  unreadCount: 0,
  loading: false
}
```

**Actions:**
- `addMessage(roomId, message)` - Add message
- `fetchMessages(roomId)` - Fetch room messages
- `markAsRead(roomId)` - Mark messages as read
- `deleteMessage(messageId)` - Delete message
- `updateMessage(messageId, content)` - Edit message
- `setCurrentRoomMessages(messages)` - Set current room messages

---

## Actions & Reducers

### Example: Auth Slice Reducers

```javascript
// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null
};

// Reducers
const reducers = {
  loginStart: (state) => {
    state.loading = true;
    state.error = null;
  },
  
  loginSuccess: (state, action) => {
    state.isAuthenticated = true;
    state.user = action.payload.user;
    state.token = action.payload.token;
    state.refreshToken = action.payload.refreshToken;
    state.loading = false;
    state.error = null;
  },
  
  loginFailure: (state, action) => {
    state.loading = false;
    state.error = action.payload;
    state.isAuthenticated = false;
  },
  
  logout: (state) => {
    state.isAuthenticated = false;
    state.user = null;
    state.token = null;
    state.refreshToken = null;
    state.error = null;
  }
};
```

---

## Selectors

### Auth Selectors
```javascript
// selectors/auth-selectors.md

export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectUserName = (state) => state.auth.user?.name;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
```

### Room Selectors
```javascript
// selectors/room-selectors.md

export const selectAllRooms = (state) => state.rooms.list;
export const selectCurrentRoom = (state) => state.rooms.currentRoom;
export const selectRoomLoading = (state) => state.rooms.loading;
export const selectRoomById = (state, roomId) => 
  state.rooms.list.find(r => r.id === roomId);
```

### RTC Selectors
```javascript
// selectors/rtc-selectors.md

export const selectConnections = (state) => state.rtcConnections.connections;
export const selectConnectionStatus = (state, peerId) =>
  state.rtcConnections.connections[peerId]?.status;
export const selectAudioEnabled = (state) => state.rtcConnections.audioEnabled;
export const selectVideoEnabled = (state) => state.rtcConnections.videoEnabled;
```

---

## Middleware

### Auth Middleware
**File:** `middleware/auth-middleware.md`

Handles:
- Token refresh on expiry
- Auto-logout on auth failure
- Persist auth state to localStorage
- Sync auth across tabs

### RTC Middleware
**File:** `middleware/rtc-middleware.md`

Handles:
- WebRTC connection lifecycle
- Peer connection state changes
- ICE candidate handling
- Connection error recovery

### Sync Middleware
**File:** `middleware/sync-middleware.md`

Handles:
- Sync state with WebSocket
- Broadcast state changes
- Handle incoming updates
- Conflict resolution

---

## Integration Points

### With Landing Page
- Auth slice manages Zitadel login
- User data flows to dashboard

### With WebRTC Dashboard
- RTC Connection slice manages peer connections
- Participants slice tracks connected users
- Room slice manages room state
- Messages slice handles chat

### With WebSocket Server
- Middleware syncs state with server
- Receives real-time updates
- Broadcasts local changes

---

## Next Steps

1. Create individual slice documentation files
2. Implement Redux store configuration
3. Create action creators and thunks
4. Implement selectors
5. Add middleware
6. Integrate with React components
7. Add Redux DevTools for debugging

