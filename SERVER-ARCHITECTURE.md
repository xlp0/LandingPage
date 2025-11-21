# WebRTC Dashboard - Server Architecture

## Overview

The server uses a **modular architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         ws-server.js (Main)             │
│  - WebSocket connection management      │
│  - Channel subscription handling        │
│  - Message routing                      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌─────────────────────┐
│room-registry │  │room-message-handler │
│   .js        │  │    -server.js       │
│              │  │                     │
│ - Room CRUD  │  │ - Message routing   │
│ - Participant│  │ - Registry updates  │
│   tracking   │  │ - Broadcast trigger │
│ - State mgmt │  │                     │
└──────────────┘  └─────────────────────┘
```

## Module Descriptions

### 1. ws-server.js (Main Server)

**Purpose:** WebSocket server and connection management

**Responsibilities:**
- Accept WebSocket connections
- Handle channel subscriptions
- Route messages to appropriate handlers
- Relay messages between clients
- Broadcast room lists periodically

**Key Functions:**
```javascript
broadcastClientCount()      // Send connected client count
broadcastRoomList()         // Send authoritative room list
wss.on('connection')        // Handle new connections
ws.on('message')            // Handle incoming messages
```

**Message Handling Flow:**
```
Message arrives
    ↓
Parse JSON
    ↓
Handle special messages (subscribe, ping, etc.)
    ↓
Try RoomMessageHandler.handle()
    ├─ If handled → return (don't relay)
    └─ If not handled → relay to other clients
```

### 2. room-registry.js (Room State)

**Purpose:** Manage room state and participant tracking

**Responsibilities:**
- Create and delete rooms
- Add/remove participants
- Track user-room relationships
- Provide room data for broadcasting

**Public API:**
```javascript
createRoom(roomData)                    // Create new room
addUserToRoom(roomId, userId, userName) // Add participant
removeUserFromRoom(roomId, userId)      // Remove participant
getAllRooms()                           // Get all rooms as array
getRoom(roomId)                         // Get single room
getRoomCount()                          // Get total room count
clear()                                 // Clear all rooms
```

**Data Structures:**
```javascript
rooms = Map<roomId, {
    id: string,
    name: string,
    description: string,
    host: string,
    hostId: string,
    createdAt: timestamp,
    participants: Set<{id, name}>
}>

userRooms = Map<userId, Set<roomId>>
```

### 3. room-message-handler-server.js (Message Processing)

**Purpose:** Process room management messages

**Responsibilities:**
- Route room management messages
- Update registry based on messages
- Trigger broadcasts
- Return true if message was handled

**Public API:**
```javascript
handle(data)                // Route message to handler
                            // Returns: true if handled, false otherwise
```

**Handled Message Types:**
```javascript
'room-created'              // Create new room
'user-joined-room'          // User joins room
'user-left-room'            // User leaves room
'room-list-request'         // Client requests room list
```

**Message Processing:**
```javascript
if (data.type === 'room-created') {
    roomRegistry.createRoom(roomData);
    broadcastRoomList();
    return true;  // Don't relay
}

if (data.type === 'user-joined-room') {
    roomRegistry.addUserToRoom(roomId, userId, userName);
    broadcastRoomList();
    return true;  // Don't relay
}

// ... similar for other message types
```

## Data Flow

### Room Creation

```
Client A
    │
    ├─ Create room
    ├─ Send: room-created
    │
    └─► Server (ws-server.js)
            │
            ├─ RoomMessageHandler.handle()
            │
            ├─ RoomRegistry.createRoom()
            │   └─ Add to rooms Map
            │
            ├─ broadcastRoomList()
            │   └─ Send server-room-list to all clients
            │
            └─► Client A receives: server-room-list [room]
            └─► Client B receives: server-room-list [room]
```

### User Joining Room

```
Client B
    │
    ├─ Join room
    ├─ Send: user-joined-room
    │
    └─► Server (ws-server.js)
            │
            ├─ RoomMessageHandler.handle()
            │
            ├─ RoomRegistry.addUserToRoom()
            │   └─ Add to room.participants
            │
            ├─ broadcastRoomList()
            │   └─ Send server-room-list to all clients
            │
            └─► Client A receives: server-room-list [room, participants]
            └─► Client B receives: server-room-list [room, participants]
```

### Periodic Synchronization

```
Every 5 seconds:
    │
    ├─ Server checks if rooms exist
    │
    ├─ broadcastRoomList()
    │   └─ Send server-room-list to all subscribed clients
    │
    └─► All clients receive authoritative room state
```

## Message Types

### Client → Server

| Type | Channel | Purpose | Data |
|------|---------|---------|------|
| `subscribe` | any | Subscribe to channel | `{type, channel}` |
| `unsubscribe` | any | Unsubscribe from channel | `{type, channel}` |
| `ping` | any | Keep-alive | `{type}` |
| `room-created` | webrtc-dashboard-rooms | Notify room creation | `{type, data: {id, name, host, hostId}}` |
| `user-joined-room` | webrtc-dashboard-rooms | Notify user join | `{type, data: {roomId, userId, userName}}` |
| `user-left-room` | webrtc-dashboard-rooms | Notify user leave | `{type, data: {roomId, userId}}` |
| `room-list-request` | webrtc-dashboard-rooms | Request room list | `{type}` |
| Other | any | Relay to other clients | Original message |

### Server → Client

| Type | Channel | Purpose | Data |
|------|---------|---------|------|
| `client_count` | any | Connected client count | `{type, count, timestamp}` |
| `server-room-list` | webrtc-dashboard-rooms | Authoritative room list | `{type, channel, rooms: [...], timestamp}` |
| `pong` | any | Response to ping | `{type, timestamp}` |
| Other | any | Relayed from other clients | Original message |

## Channels

### webrtc-dashboard-rooms
- **Purpose:** Room management and discovery
- **Messages:** room-created, user-joined-room, user-left-room, room-list-request, server-room-list
- **Subscribers:** All dashboard clients

### webrtc-dashboard-chat
- **Purpose:** Chat participant notifications
- **Messages:** participant-joined, participant-left
- **Subscribers:** Clients in active rooms

### webrtc-signaling
- **Purpose:** WebRTC offer/answer/ICE exchange
- **Messages:** webrtc-offer, webrtc-answer, webrtc-ice
- **Subscribers:** Peers establishing connections

### webrtc-dashboard-access
- **Purpose:** Join request approval workflow
- **Messages:** join-request, join-approved, join-rejected
- **Subscribers:** Room hosts and joiners

## Server State

### In-Memory Storage

```javascript
// Room Registry
rooms: Map<roomId, RoomData>
  - Persists only during server runtime
  - Lost on server restart
  - Cleared when all participants leave

// User-Room Mapping
userRooms: Map<userId, Set<roomId>>
  - Tracks which rooms each user is in
  - Used for cleanup on disconnect
  - Cleared when user leaves all rooms

// Connected Clients
connectedClients: Set<clientId>
  - Tracks active WebSocket connections
  - Updated on connect/disconnect
  - Used for broadcasting
```

### No Persistence

**Important:** The server does NOT persist room data to disk.

- Rooms exist only in memory
- Rooms are lost on server restart
- This is intentional for a P2P system
- Clients maintain their own room state

## Logging

### Log Prefixes

```
[WebSocket]          - Connection events
[Server]             - General server operations
[RoomRegistry]       - Room state changes
[RoomMessageHandler] - Message processing
```

### Example Logs

```
[WebSocket] ✅ Client connected (123456): 192.168.1.100
[Server] 📡 Broadcasting room list: 2 rooms
[RoomRegistry] 🏠 Room created: Team Meeting (room_abc123)
[RoomRegistry] 👤 Alice in room Team Meeting (2 total)
[RoomMessageHandler] 📨 User join request: {roomId, userId, userName}
```

## Error Handling

### Room Not Found

```javascript
if (!room) {
    console.error(`[RoomRegistry] ❌ Room not found: ${roomId}`);
    return null;
}
```

### Invalid Message Format

```javascript
try {
    const data = JSON.parse(message.toString());
    // Process message
} catch (e) {
    console.error('Error processing message:', e);
    // Send echo response
}
```

## Performance Considerations

### Broadcast Frequency
- **On Change:** Broadcast immediately when room state changes
- **Periodic:** Broadcast every 5 seconds as fallback
- **On Request:** Broadcast when client requests room list

### Memory Usage
- **Per Room:** ~100 bytes + participant data
- **Per Participant:** ~50 bytes
- **Typical:** 10 rooms × 5 participants = ~2.5 KB

### Scalability Limits
- **Current:** Suitable for 10-100 concurrent users
- **Bottleneck:** WebSocket relay (O(n) clients per message)
- **Future:** Consider message queuing or clustering

## Testing

### Manual Testing

```bash
# Start server
npm start

# Test WebSocket connection
# Open ws-test.html in browser

# Create room (Client A)
# Join room (Client B)
# Verify both see each other
```

### Server Logs to Check

```
[Server] 🏠 Room created: Test Room
[Server] 👤 User joined room Test Room
[Server] 📡 Broadcasting room list: 1 rooms
```

## Deployment

### Environment Variables

```bash
PORT=3000                    # Server port
NODE_ENV=production          # Environment
```

### Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "ws-server.js"]
```

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
    "status": "ok",
    "connected_clients": 5,
    "rooms": {
        "total": 2,
        "list": [...]
    }
}
```

## Future Improvements

1. **Persistence:** Add database for room history
2. **Clustering:** Support multiple server instances
3. **Authentication:** Add user authentication
4. **Rate Limiting:** Prevent message spam
5. **Metrics:** Add Prometheus metrics
6. **Monitoring:** Add health checks and alerts
