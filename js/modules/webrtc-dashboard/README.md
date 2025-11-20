# WebRTC Dashboard

A serverless peer-to-peer dashboard system that allows users to create and join chat rooms with host approval.

## Overview

The WebRTC Dashboard provides a room-based chat system where:
- **Anyone** can create rooms and become the host
- **Room creators** automatically become hosts with management privileges
- **All participants** can invite others using shareable links
- **Real-time chat** happens directly between peers (no server required)
- **Host approval** system for controlled access to rooms
- **Automatic host handover** when the current host leaves the room

## Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph "User Interface"
        UI[Dashboard UI]
        RoomList[Room List View]
        ChatView[Chat Room View]
    end
    
    subgraph "Core Managers"
        DM[Dashboard Manager]
        RS[Room Service]
        ACM[Access Control Manager]
        CM[Chat Manager]
        RCM[Room Connection Manager]
    end
    
    subgraph "Communication Layer"
        WS[WebSocket Signaling]
        BC[Broadcast Service]
        WB[WebSocket Broadcast]
    end
    
    subgraph "WebRTC Layer"
        PC[Peer Connections]
        DC[Data Channels]
        ICE[ICE Candidates]
    end
    
    UI --> DM
    RoomList --> RS
    ChatView --> CM
    
    DM --> RS
    DM --> ACM
    DM --> CM
    
    RS --> RCM
    CM --> RCM
    
    RCM --> WS
    RS --> BC
    BC --> WB
    WB --> WS
    
    RCM --> PC
    PC --> DC
    PC --> ICE
    
    style UI fill:#e1f5ff
    style DM fill:#fff3e0
    style RS fill:#f3e5f5
    style WS fill:#e8f5e9
    style PC fill:#ffebee
```

### WebRTC Connection Flow

```mermaid
sequenceDiagram
    participant H as Host Browser
    participant WS as WebSocket Server
    participant J as Joiner Browser
    
    Note over H: User creates room
    H->>H: Initialize RoomService
    H->>H: Create RoomConnectionManager
    H->>WS: Subscribe to channels
    H->>WS: Broadcast "room-created"
    
    Note over J: User sees room list
    J->>WS: Subscribe to channels
    WS->>J: Receive "room-created"
    J->>J: Display room in list
    
    Note over J: User joins room
    J->>WS: Broadcast "user-joined-room"
    
    Note over H: Host receives join event
    WS->>H: Receive "user-joined-room"
    H->>H: _handleUserJoinedRoom()
    H->>H: Create RTCPeerConnection
    H->>H: Create Data Channel
    H->>H: Generate WebRTC Offer
    H->>WS: Send Offer via signaling
    
    Note over J: Joiner receives offer
    WS->>J: Receive WebRTC Offer
    J->>J: Create RTCPeerConnection
    J->>J: Set Remote Description (Offer)
    J->>J: Generate WebRTC Answer
    J->>WS: Send Answer via signaling
    
    Note over H: Host receives answer
    WS->>H: Receive WebRTC Answer
    H->>H: Set Remote Description (Answer)
    
    Note over H,J: ICE Candidate Exchange
    H->>WS: Send ICE Candidates
    WS->>J: Forward ICE Candidates
    J->>WS: Send ICE Candidates
    WS->>H: Forward ICE Candidates
    
    Note over H,J: Connection Established
    H-->>J: Direct P2P Data Channel Opens
    J-->>H: Direct P2P Data Channel Opens
    
    Note over H,J: Chat messages flow directly P2P
    H->>J: Send chat message (P2P)
    J->>H: Send chat message (P2P)
```

## Core Components

### 1. Dashboard Manager
```javascript
class DashboardManager {
  - Manages main dashboard UI
  - Handles room creation and discovery
  - Coordinates between different views
  - Manages user preferences and settings
}
```

### 2. Room Service
```javascript
class RoomService {
  - Creates and manages WebRTC rooms
  - Handles room broadcasting and discovery
  - Manages room metadata and status
  - Coordinates with BroadcastChannel for room sync
}
```

### 3. Access Control Manager
```javascript
class AccessControlManager {
  - Handles join requests from participants
  - Manages host approval workflow
  - Maintains pending requests queue
  - Sends approval/rejection notifications
  - Manages host handover when current host leaves
}
```

### 4. Chat Manager
```javascript
class ChatManager {
  - Manages P2P chat connections
  - Handles message routing between peers
  - Maintains chat history and user list
  - Manages user name changes and status
}
```

### 5. WebRTC Connection Handler
```javascript
class WebRTCConnectionHandler {
  - Establishes peer-to-peer connections
  - Handles ICE candidates and offers/answers
  - Manages connection state and reconnection
  - Coordinates multi-peer mesh network
}
```

## User Interaction Diagrams

### Complete User Journey

```mermaid
stateDiagram-v2
    [*] --> Dashboard: Open App
    Dashboard --> CreateRoom: Click "Create Room"
    Dashboard --> BrowseRooms: View Available Rooms
    
    CreateRoom --> HostView: Room Created
    BrowseRooms --> JoinRequest: Click "Join Room"
    
    JoinRequest --> WaitingApproval: Request Sent
    WaitingApproval --> ParticipantView: Approved
    WaitingApproval --> Dashboard: Rejected
    
    HostView --> Chatting: Send/Receive Messages
    ParticipantView --> Chatting: Send/Receive Messages
    
    Chatting --> HostView: Continue as Host
    Chatting --> ParticipantView: Continue as Participant
    Chatting --> Dashboard: Leave Room
    
    HostView --> HostTransfer: Host Leaves
    HostTransfer --> ParticipantView: New Host Assigned
```

### Multi-User Chat Interaction

```mermaid
sequenceDiagram
    participant U1 as User 1 (Host)
    participant U2 as User 2
    participant U3 as User 3
    participant WS as WebSocket Server
    
    Note over U1: Creates Room
    U1->>WS: Broadcast "room-created"
    WS->>U2: Room appears in list
    WS->>U3: Room appears in list
    
    Note over U2: Joins Room
    U2->>WS: Broadcast "user-joined-room"
    WS->>U1: User 2 joined notification
    U1->>U1: Create WebRTC offer for U2
    U1->>WS: Send offer to U2
    WS->>U2: Receive offer from U1
    U2->>WS: Send answer to U1
    WS->>U1: Receive answer from U2
    U1-->>U2: P2P Connection Established
    
    Note over U3: Joins Room
    U3->>WS: Broadcast "user-joined-room"
    WS->>U1: User 3 joined notification
    WS->>U2: User 3 joined notification
    
    U1->>U1: Create WebRTC offer for U3
    U1->>WS: Send offer to U3
    WS->>U3: Receive offer from U1
    U3->>WS: Send answer to U1
    WS->>U1: Receive answer from U3
    U1-->>U3: P2P Connection Established
    
    Note over U2,U3: U2 and U3 connect directly
    U2->>U2: Create WebRTC offer for U3
    U2->>WS: Send offer to U3
    WS->>U3: Receive offer from U2
    U3->>WS: Send answer to U2
    WS->>U2: Receive answer from U3
    U2-->>U3: P2P Connection Established
    
    Note over U1,U3: All users connected in mesh
    U1->>U2: Chat message (P2P)
    U1->>U3: Chat message (P2P)
    U2->>U1: Chat message (P2P)
    U2->>U3: Chat message (P2P)
    U3->>U1: Chat message (P2P)
    U3->>U2: Chat message (P2P)
```

### Room Creation and Discovery Flow

```mermaid
flowchart TD
    Start([User Opens Dashboard]) --> CheckRooms{Any Rooms<br/>Available?}
    
    CheckRooms -->|Yes| ShowList[Display Room List]
    CheckRooms -->|No| EmptyState[Show Empty State]
    
    ShowList --> UserChoice{User Action?}
    EmptyState --> UserChoice
    
    UserChoice -->|Create Room| EnterDetails[Enter Room Name<br/>& Settings]
    UserChoice -->|Join Room| SelectRoom[Select Room<br/>from List]
    
    EnterDetails --> CreateRoom[Create Room]
    CreateRoom --> BecomeHost[Become Host]
    BecomeHost --> InitWebRTC[Initialize WebRTC<br/>Connection Manager]
    InitWebRTC --> BroadcastRoom[Broadcast Room<br/>to Network]
    BroadcastRoom --> HostDashboard[Host Dashboard<br/>View]
    
    SelectRoom --> SendJoinReq[Send Join Request]
    SendJoinReq --> WaitApproval{Host<br/>Approval?}
    
    WaitApproval -->|Approved| EstablishConn[Establish WebRTC<br/>Connection]
    WaitApproval -->|Rejected| ShowRejected[Show Rejection<br/>Message]
    ShowRejected --> Start
    
    EstablishConn --> ParticipantView[Participant<br/>Chat View]
    
    HostDashboard --> ChatActive{Active<br/>Chat?}
    ParticipantView --> ChatActive
    
    ChatActive -->|Yes| SendMessages[Send/Receive<br/>Messages]
    ChatActive -->|No| Idle[Idle State]
    
    SendMessages --> ChatActive
    Idle --> ChatActive
    
    HostDashboard --> HostLeaves{Host<br/>Leaves?}
    HostLeaves -->|Yes| TransferHost[Transfer Host<br/>to Participant]
    TransferHost --> ParticipantView
    
    style Start fill:#e1f5ff
    style CreateRoom fill:#c8e6c9
    style BecomeHost fill:#fff9c4
    style HostDashboard fill:#ffccbc
    style ParticipantView fill:#d1c4e9
    style SendMessages fill:#b2dfdb
```

### WebRTC Signaling State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Initialize
    
    Idle --> CreatingOffer: Host creates offer
    CreatingOffer --> OfferCreated: Offer generated
    OfferCreated --> SendingOffer: Send via WebSocket
    SendingOffer --> WaitingAnswer: Offer sent
    
    Idle --> ReceivingOffer: Joiner receives offer
    ReceivingOffer --> ProcessingOffer: Set remote description
    ProcessingOffer --> CreatingAnswer: Generate answer
    CreatingAnswer --> SendingAnswer: Send via WebSocket
    SendingAnswer --> WaitingICE: Answer sent
    
    WaitingAnswer --> ReceivingAnswer: Answer received
    ReceivingAnswer --> ProcessingAnswer: Set remote description
    ProcessingAnswer --> ExchangingICE: Start ICE exchange
    
    WaitingICE --> ExchangingICE: ICE candidates ready
    
    ExchangingICE --> Connecting: ICE candidates exchanged
    Connecting --> Connected: Connection established
    Connected --> DataChannelOpen: Data channel opens
    
    DataChannelOpen --> Active: Ready for messaging
    Active --> Active: Send/Receive messages
    
    Active --> Disconnecting: User leaves
    Disconnecting --> Closed: Connection closed
    Closed --> [*]
    
    Active --> Failed: Connection error
    Failed --> Reconnecting: Attempt reconnect
    Reconnecting --> ExchangingICE: Retry connection
    Reconnecting --> Closed: Max retries exceeded
```

## User Flow

### Room Creation Flow (Anyone can create)
```
1. User opens Dashboard
   ├─> Sees available rooms list
   ├─> Clicks "Create New Room"
   └─> Enters room name and settings

2. Room Creation & Host Assignment
   ├─> Generates unique room ID
   ├─> Creator automatically becomes host
   ├─> Creates WebRTC offer
   ├─> Broadcasts room to other tabs/users
   ├─> Generates shareable room link
   └─> Shows room management interface

3. Link Sharing (Available to all participants)
   ├─> Any participant can copy shareable link
   ├─> Send link via email/chat/social media
   ├─> Link contains room ID and access token
   └─> Recipients can join directly via link

4. Host Management Privileges
   ├─> Receives join requests (dashboard users)
   ├─> Receives direct joins (link users)
   ├─> Reviews participant info
   ├─> Approves/rejects requests
   └─> Can manage room settings and participants

5. Host Handover (Manual or Automatic)
   ├─> Manual: Host can transfer privileges to any participant
   ├─> Automatic: System detects host disconnection
   ├─> Automatically promotes most recent participant
   ├─> New host receives management privileges
   ├─> Room continues without interruption
   └─> All participants notified of host change
```

### Participant Flow (Joining Room)

#### Option A: Dashboard Discovery
```
1. Participant opens Dashboard
   ├─> Sees list of available rooms
   ├─> Clicks on desired room
   └─> Sees room details

2. Join Request
   ├─> Clicks "Request to Join"
   ├─> Enters display name
   ├─> Sends join request to host
   └─> Waits for approval

3. Approved Access
   ├─> Receives approval notification
   ├─> Establishes WebRTC connection
   ├─> Joins chat room
   └─> Can chat with other participants
```

#### Option B: Direct Link Access
```
1. Participant receives shared link
   ├─> Clicks on room link
   ├─> Opens dashboard with room pre-selected
   └─> Sees room join interface

2. Direct Join Process
   ├─> Enters display name
   ├─> Clicks "Join Room"
   ├─> Sends join request with link token
   └─> Waits for host approval (if required)

3. Quick Access
   ├─> Host can enable instant join for links
   ├─> Bypasses approval for trusted links
   ├─> Establishes WebRTC connection immediately
   └─> Joins chat room directly
```

## Features

### 🏠 Dashboard Features
- **Open Room Creation**: Anyone can create new rooms and become host
- **Room Discovery**: Browse available chat rooms
- **Real-time Updates**: Live room list with participant counts
- **Search & Filter**: Find rooms by name or topic

### 🔐 Access Control Features
- **Democratic Link Sharing**: All participants can generate and share room links
- **Join Requests**: Participants request access to rooms
- **Host Approval**: Room creators can approve/reject join requests
- **Link-based Joining**: Users can join directly via shared links
- **Host Transfer**: Manual transfer to any participant or automatic handover when host leaves
- **Pending Queue**: Visual queue of pending requests
- **User Profiles**: Display names and basic info

### 💬 Chat Features
- **Real-time Messaging**: Instant P2P chat
- **Multi-peer Support**: Support for multiple participants
- **Name Changes**: Users can change display names
- **Chat History**: Local message history
- **User List**: See who's in the room

### 🔧 Technical Features
- **Serverless**: No backend server required
- **P2P Architecture**: Direct peer-to-peer connections
- **Cross-tab Sync**: Room discovery across browser tabs
- **Connection Recovery**: Automatic reconnection handling
- **Host Continuity**: Seamless host handover when host disconnects
- **Mobile Responsive**: Works on desktop and mobile

## File Structure

```
webrtc-dashboard/
├── README.md                    # This file
├── index.html                   # Main dashboard page
├── dashboard-manager.js         # Main dashboard controller
├── room-service.js             # Room creation and management
├── access-control-manager.js   # Join requests and approval
├── chat-manager.js             # P2P chat functionality
├── webrtc-handler.js           # WebRTC connection management
├── ui-components.js            # Reusable UI components
├── styles.css                  # Dashboard styling
└── utils.js                    # Utility functions
```

## Usage Examples

### Creating a Room (Anyone can create)
```javascript
const dashboard = new DashboardManager();
const room = await dashboard.createRoom({
  name: "Team Meeting",
  description: "Weekly team sync",
  maxParticipants: 10,
  requireApproval: true,
  allowDirectLinks: true
});

// Creator automatically becomes host
console.log("You are now the host of:", room.name);

// Anyone in the room can generate shareable links
const shareableLink = dashboard.generateRoomLink(room.id, {
  instantJoin: false, // Still require approval
  expiresIn: 24 * 60 * 60 * 1000 // 24 hours
});
console.log("Share this link:", shareableLink);
```

### Joining via Dashboard
```javascript
const joinRequest = await dashboard.requestToJoin(roomId, {
  displayName: "John Doe",
  message: "Hi, I'd like to join the meeting"
});
```

### Joining via Direct Link
```javascript
// When user clicks a shared link like:
// https://yoursite.com/webrtc-dashboard?room=abc123&token=xyz789

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const token = urlParams.get('token');

if (roomId && token) {
  const joinRequest = await dashboard.joinViaLink(roomId, token, {
    displayName: "Jane Smith"
  });
}
```

### Managing Join Requests (Host only)
```javascript
// Only room creators (hosts) can approve/reject requests
dashboard.onJoinRequest((request) => {
  // Show approval UI with request source
  showApprovalDialog({
    ...request,
    source: request.viaLink ? 'Direct Link' : 'Dashboard'
  });
});

// Approve request (host privilege)
await dashboard.approveJoinRequest(requestId);

// Any participant can generate links for sharing
const participantLink = dashboard.generateRoomLink(room.id, {
  instantJoin: false, // Still requires host approval
  sharedBy: "participant_name"
});

// Host can generate instant-join links (bypasses approval)
const instantLink = dashboard.generateRoomLink(room.id, {
  instantJoin: true,
  maxUses: 5 // Limit to 5 uses
});
```

### Host Transfer (Manual & Automatic)
```javascript
// Manual Host Transfer (Host can choose successor)
dashboard.transferHost(participantId, {
  reason: "Going offline, passing host to John"
});

// Get list of participants for transfer selection
const participants = dashboard.getParticipants();
participants.forEach(participant => {
  if (!participant.isHost) {
    console.log(`Can transfer to: ${participant.name} (${participant.id})`);
  }
});

// Listen for host changes (manual or automatic)
dashboard.onHostChange((newHost, previousHost, transferType) => {
  if (newHost.isMe) {
    console.log("You are now the host!");
    // Show host controls
    showHostControls();
  } else {
    console.log(`${newHost.name} is now the host`);
  }
  
  // Show different messages based on transfer type
  if (transferType === 'manual') {
    showNotification(`${previousHost.name} transferred host to ${newHost.name}`);
  } else {
    showNotification(`Host automatically transferred to ${newHost.name}`);
  }
});

// Automatic handover happens when:
// 1. Current host closes browser/tab
// 2. Current host loses connection
// 3. Current host explicitly leaves room
// → System automatically promotes the most recent participant

// Manual transfer happens when:
// 1. Host explicitly transfers to chosen participant
// 2. Host uses "Transfer Host" button in UI
// 3. Host wants to step down but stay in room
```

## Integration

The WebRTC Dashboard integrates with:
- **BroadcastChannel API**: For cross-tab room synchronization
- **WebRTC API**: For peer-to-peer connections
- **Local Storage**: For user preferences and room history
- **Existing P2P modules**: Reuses connection handling logic

## Security Considerations

- **Host Control**: Only current host can approve participants
- **Host Transfer Options**: Manual transfer to chosen participant or automatic succession
- **P2P Encryption**: WebRTC provides built-in encryption
- **No Server Storage**: All data stays client-side
- **Room Continuity**: Rooms persist even when original host leaves

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Getting Started

### For Room Creators (Anyone):
1. Open `index.html` in a modern browser
2. Click "Create Room" to start hosting (you become the host automatically)
3. **Option A**: Let others discover your room via dashboard
4. **Option B**: Generate and share direct room link
5. Approve join requests as they come in
6. Start chatting with participants!

### For Participants:
1. **Via Dashboard**: Open dashboard, browse rooms, request to join
2. **Via Link**: Click shared room link, enter name, join directly
3. Wait for host approval (if required)
4. **Share with others**: Generate your own invite links once in the room
5. Start chatting once approved!

### Link Sharing Examples:
```
Standard Link (requires approval):
https://yoursite.com/webrtc-dashboard?room=abc123&token=xyz789

Instant Join Link (no approval needed):
https://yoursite.com/webrtc-dashboard?room=abc123&token=xyz789&instant=true
```

---

*Built with vanilla JavaScript and WebRTC - no external dependencies required.*
