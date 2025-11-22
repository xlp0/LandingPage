# WebRTC Dashboard

A peer-to-peer dashboard system that allows users to create and join chat rooms with real-time WebRTC connections.

## Quick Links

- **[Server Architecture](../../SERVER-ARCHITECTURE.md)** - Server-side room management and modular design
- **[Refactoring Guide](./REFACTORING-GUIDE.md)** - Modular client architecture
- **[Server Architecture Guide](./SERVER-ARCHITECTURE.md)** - Detailed server documentation

## Overview

The WebRTC Dashboard provides a room-based chat system where:
- **Anyone** can create rooms and become the host
- **Room creators** automatically become hosts with management privileges
- **All participants** can invite others using shareable links
- **Real-time chat** happens directly between peers via WebRTC
- **Server-side room registry** maintains authoritative room state
- **Automatic synchronization** keeps all clients in sync
- **Modular architecture** for easy maintenance and testing

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

### Detailed User A & User B Connection Flow

```mermaid
sequenceDiagram
    autonumber
    participant A as 👤 User A<br/>(Host)
    participant A_UI as User A<br/>Browser UI
    participant A_RS as User A<br/>RoomService
    participant A_RCM as User A<br/>RoomConnectionManager
    participant WS as 🌐 WebSocket<br/>Server
    participant B_RS as User B<br/>RoomService
    participant B_RCM as User B<br/>RoomConnectionManager
    participant B_UI as User B<br/>Browser UI
    participant B as 👤 User B<br/>(Joiner)
    
    Note over A,B: PHASE 1: Room Creation by User A
    A->>A_UI: Opens dashboard
    A->>A_UI: Clicks "Create Room"
    A->>A_UI: Enters room name "Team Chat"
    A_UI->>A_RS: createRoom({name: "Team Chat"})
    A_RS->>A_RS: Generate roomId: "room-abc123"
    A_RS->>A_RCM: Initialize RoomConnectionManager
    A_RCM->>A_RCM: Setup WebRTC signaling handlers
    A_RS->>WS: Subscribe to channels
    activate WS
    A_RS->>WS: Broadcast "room-created"
    WS-->>B_RS: Forward "room-created"
    deactivate WS
    A_UI->>A: Shows "Room created! You are the host"
    
    Note over A,B: PHASE 2: Room Discovery by User B
    B->>B_UI: Opens dashboard
    B_UI->>B_RS: Request room list
    B_RS->>WS: Subscribe to channels
    activate WS
    B_RS->>WS: Broadcast "room-list-request"
    WS-->>A_RS: Forward "room-list-request"
    A_RS->>WS: Broadcast "room-created" (response)
    WS-->>B_RS: Forward "room-created"
    deactivate WS
    B_RS->>B_UI: Update room list
    B_UI->>B: Shows "Team Chat" in available rooms
    
    Note over A,B: PHASE 3: User B Joins Room
    B->>B_UI: Clicks "Join Room" on "Team Chat"
    B_UI->>B_RS: joinRoom("room-abc123", {name: "User B"})
    B_RS->>B_RS: Add self to room.participants
    B_RS->>WS: Broadcast "user-joined-room"
    activate WS
    WS-->>A_RS: Forward "user-joined-room"
    deactivate WS
    B_UI->>B: Shows "Joining room..."
    
    Note over A,B: PHASE 4: Host Initiates WebRTC Connection
    A_RS->>A_RS: _handleUserJoinedRoom(message)
    A_RS->>A_RS: Check: Is this my room? ✅ Yes
    A_RS->>A_RCM: createOffer("user-b-id")
    A_RCM->>A_RCM: Create RTCPeerConnection
    A_RCM->>A_RCM: Create DataChannel "chat"
    A_RCM->>A_RCM: Generate SDP Offer
    A_RCM->>A_RCM: Set Local Description
    A_RCM->>WS: Send WebRTC Offer to User B
    activate WS
    WS-->>B_RCM: Forward WebRTC Offer
    deactivate WS
    A_UI->>A: Shows "User B is joining..."
    
    Note over A,B: PHASE 5: User B Processes Offer & Creates Answer
    B_RCM->>B_RCM: handleOffer(offer)
    B_RCM->>B_RCM: Create RTCPeerConnection
    B_RCM->>B_RCM: Set Remote Description (Offer)
    B_RCM->>B_RCM: Generate SDP Answer
    B_RCM->>B_RCM: Set Local Description
    B_RCM->>WS: Send WebRTC Answer to User A
    activate WS
    WS-->>A_RCM: Forward WebRTC Answer
    deactivate WS
    
    Note over A,B: PHASE 6: Host Processes Answer
    A_RCM->>A_RCM: handleAnswer(answer)
    A_RCM->>A_RCM: Set Remote Description (Answer)
    
    Note over A,B: PHASE 7: ICE Candidate Exchange
    A_RCM->>A_RCM: Gather ICE candidates
    A_RCM->>WS: Send ICE candidates
    activate WS
    WS-->>B_RCM: Forward ICE candidates
    deactivate WS
    B_RCM->>B_RCM: Add ICE candidates
    
    B_RCM->>B_RCM: Gather ICE candidates
    B_RCM->>WS: Send ICE candidates
    activate WS
    WS-->>A_RCM: Forward ICE candidates
    deactivate WS
    A_RCM->>A_RCM: Add ICE candidates
    
    Note over A,B: PHASE 8: P2P Connection Established
    A_RCM->>A_RCM: ICE Connection: checking → connected
    B_RCM->>B_RCM: ICE Connection: checking → connected
    A_RCM->>A_RCM: DataChannel: connecting → open
    B_RCM->>B_RCM: DataChannel: connecting → open
    A_RCM->>A_UI: onPeerConnected("user-b-id")
    B_RCM->>B_UI: onPeerConnected("user-a-id")
    A_UI->>A: Shows "User B connected ✅"
    B_UI->>B: Shows "Connected to room ✅"
    
    Note over A,B: PHASE 9: Direct P2P Messaging
    rect rgb(200, 255, 200)
        Note over A,B: WebSocket no longer needed for messages!
        A->>A_UI: Types "Hello User B!"
        A_UI->>A_RCM: sendMessage("Hello User B!")
        A_RCM-->>B_RCM: Direct P2P DataChannel
        B_RCM->>B_UI: Display message
        B_UI->>B: Shows "User A: Hello User B!"
        
        B->>B_UI: Types "Hi User A!"
        B_UI->>B_RCM: sendMessage("Hi User A!")
        B_RCM-->>A_RCM: Direct P2P DataChannel
        A_RCM->>A_UI: Display message
        A_UI->>A: Shows "User B: Hi User A!"
    end
    
    Note over A,B: ✅ Connection Complete - All messages now P2P!
```

### User A & User B Connection Timeline

```mermaid
gantt
    title WebRTC Connection Establishment Timeline
    dateFormat X
    axisFormat %L ms
    
    section User A (Host)
    Opens Dashboard           :a1, 0, 100
    Creates Room              :a2, 100, 200
    Initializes WebRTC        :a3, 200, 300
    Broadcasts Room           :a4, 300, 400
    Waits for Joiner          :a5, 400, 1000
    Receives Join Event       :a6, 1000, 1100
    Creates Offer             :a7, 1100, 1300
    Sends Offer               :a8, 1300, 1400
    Waits for Answer          :a9, 1400, 1700
    Receives Answer           :a10, 1700, 1800
    ICE Exchange              :a11, 1800, 2200
    Connection Established    :crit, a12, 2200, 2400
    Ready to Chat             :done, a13, 2400, 2500
    
    section User B (Joiner)
    Opens Dashboard           :b1, 500, 600
    Sees Room List            :b2, 600, 900
    Clicks Join Room          :b3, 900, 1000
    Broadcasts Join           :b4, 1000, 1100
    Waits for Offer           :b5, 1100, 1400
    Receives Offer            :b6, 1400, 1500
    Creates Answer            :b7, 1500, 1700
    Sends Answer              :b8, 1700, 1800
    ICE Exchange              :b9, 1800, 2200
    Connection Established    :crit, b10, 2200, 2400
    Ready to Chat             :done, b11, 2400, 2500
    
    section WebSocket Server
    Relays room-created       :ws1, 300, 400
    Relays room-list-request  :ws2, 600, 700
    Relays user-joined-room   :ws3, 1000, 1100
    Relays WebRTC Offer       :ws4, 1300, 1400
    Relays WebRTC Answer      :ws5, 1700, 1800
    Relays ICE Candidates     :ws6, 1800, 2200
    No longer needed          :done, ws7, 2200, 2500
```

### Connection State Transitions

```mermaid
graph LR
    subgraph "User A (Host) States"
        A1[Idle] --> A2[Room Created]
        A2 --> A3[Waiting for Joiner]
        A3 --> A4[Creating Offer]
        A4 --> A5[Offer Sent]
        A5 --> A6[Waiting Answer]
        A6 --> A7[Answer Received]
        A7 --> A8[ICE Exchange]
        A8 --> A9[Connected ✅]
        A9 --> A10[Chatting]
    end
    
    subgraph "User B (Joiner) States"
        B1[Idle] --> B2[Browsing Rooms]
        B2 --> B3[Joining Room]
        B3 --> B4[Join Sent]
        B4 --> B5[Waiting Offer]
        B5 --> B6[Offer Received]
        B6 --> B7[Creating Answer]
        B7 --> B8[Answer Sent]
        B8 --> B9[ICE Exchange]
        B9 --> B10[Connected ✅]
        B10 --> B11[Chatting]
    end
    
    subgraph "Synchronization Points"
        A3 -.->|user-joined-room| B4
        A5 -.->|WebRTC Offer| B5
        B8 -.->|WebRTC Answer| A6
        A8 <-.->|ICE Candidates| B9
        A9 <-.->|P2P Messages| B10
    end
    
    style A9 fill:#90EE90
    style B10 fill:#90EE90
    style A10 fill:#87CEEB
    style B11 fill:#87CEEB
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

## Module Architecture

### Overview
The WebRTC Dashboard is organized into functional modules, each responsible for specific aspects of the system:

```
┌─────────────────────────────────────────────────────────────┐
│                    WebRTC Dashboard                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  UI Layer (index.html + dashboard-manager-v2.js)       │ │
│  │  - User interface and interaction                       │ │
│  │  - Event handling and DOM manipulation                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Layer                                          │ │
│  │  ├─► RoomService (room-service.js)                     │ │
│  │  ├─► ChatManager (chat-manager.js)                     │ │
│  │  ├─► AccessControlManager (access-control-manager.js)  │ │
│  │  └─► ParticipantManager (participant-manager.js)       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebRTC Layer                                           │ │
│  │  ├─► RoomConnectionManager (managers/)                 │ │
│  │  ├─► WebRTCSignaling (managers/)                       │ │
│  │  └─► Perfect Negotiation Pattern                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Communication Layer                                    │ │
│  │  ├─► WebSocketBroadcastService                         │ │
│  │  ├─► SharedBroadcast                                    │ │
│  │  └─► P2P Serverless Infrastructure                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## RoomService Module Breakdown

### File: `room-service.js` (655 lines)

The RoomService is the central orchestrator for room management. Here's the functional breakdown:

#### 1. **Initialization Module** (Lines 1-56)
```javascript
// Functions:
- constructor()           // Initialize service state
- init()                 // Setup P2P and broadcast services
- _initializeP2P()       // Connect to P2P infrastructure
- _initializeBroadcastService()  // Setup WebSocket channels
- _setupCleanup()        // Register cleanup handlers

// State:
- rooms: Map              // All discovered rooms
- localRooms: Set         // Rooms created by this client
- roomConnectionManagers  // WebRTC managers per room
- currentUserId           // Current user's ID
- isInitialized           // Initialization flag
```

**Purpose**: Bootstrap the service, connect to infrastructure, prepare for room operations.

---

#### 2. **Room Creation Module** (Lines 57-95)
```javascript
// Functions:
- createRoom(roomData)   // Create new room and broadcast

// Workflow:
1. Generate unique roomId
2. Store room locally
3. Broadcast 'room-created' to network
4. Emit room list update event
5. Return room object

// Broadcasts:
→ 'room-created': Notify all peers of new room
```

**Purpose**: Allow users to create rooms and become hosts.

---

#### 3. **Room Join Module** (Lines 101-152)
```javascript
// Functions:
- joinRoom(roomId, userData)  // Join existing room

// Workflow:
1. Validate room exists
2. Get existing participants BEFORE adding new user
3. Add new user to room.participants
4. Broadcast 'user-joined-room' with existingParticipants list
5. Emit room list update

// Broadcasts:
→ 'user-joined-room': {
    roomId,
    userId,
    userName,
    existingParticipants: [{id, name, joinedAt}]
  }
```

**Purpose**: Allow users to join rooms and notify existing participants.

**CRITICAL**: Must get existing participants BEFORE adding new user to send correct list to joiner.

---

#### 4. **Room Leave Module** (Lines 154-171)
```javascript
// Functions:
- leaveRoom(roomId)      // Leave room and cleanup

// Workflow:
1. Check if room exists
2. If local room, broadcast removal
3. Delete from rooms map
4. Disconnect WebRTC connections
5. Emit room list update

// Broadcasts:
→ 'room-removed': {roomId}
```

**Purpose**: Clean exit from rooms with proper cleanup.

---

#### 5. **Room Discovery Module** (Lines 173-202)
```javascript
// Functions:
- startDiscovery()       // Begin discovering rooms
- refreshRooms()         // Manual refresh
- getRooms()            // Get all active rooms
- getRoom(roomId)       // Get specific room

// Workflow:
1. Broadcast 'room-list-request' periodically
2. Listen for 'room-created' responses
3. Update local rooms map
4. Handle visibility changes (tab active/inactive)

// Broadcasts:
→ 'room-list-request': Request all peers send their rooms
← 'room-created': Response with room data
```

**Purpose**: Find available rooms across the network.

---

#### 6. **Event Handler Module** (Lines 204-218)
```javascript
// Functions:
- onRoomListUpdated(handler)   // Subscribe to room list changes
- onRoomJoinRequest(handler)   // Subscribe to join requests
- on(eventName, handler)       // Generic event subscription
- _addEventListener()          // Internal event registration
- _emitEvent()                // Internal event emission
- _emitRoomListUpdate()       // Emit room list change

// Events:
- 'roomListUpdated'    // Rooms changed
- 'roomJoinRequest'    // Someone wants to join
- 'user-joined-room'   // User joined a room
```

**Purpose**: Provide pub/sub event system for UI updates.

---

#### 7. **P2P Infrastructure Module** (Lines 220-248)
```javascript
// Functions:
- _initializeP2P()      // Setup P2P connections
- _connectToPeer(roomId, peerId)  // Establish peer connection
- _disconnectFromRoom(roomId)     // Close all connections

// Dependencies:
- ConnectionManager     // From p2p-serverless
- DiscoveryManager      // From p2p-serverless
- resolveP2PConfig      // Configuration resolver

// State:
- connectionManager     // P2P connection handler
- discoveryManager      // Peer discovery handler
```

**Purpose**: Integrate with existing P2P infrastructure.

---

#### 8. **Broadcast Service Module** (Lines 250-350)
```javascript
// Functions:
- _initializeBroadcastService()  // Setup WebSocket broadcast
- _broadcastMessage(type, data)  // Send message to network
- _handleBroadcastMessage()      // Process incoming messages

// Message Types:
- 'room-created'         // New room available
- 'room-removed'         // Room closed
- 'room-list-request'    // Query for rooms
- 'user-joined-room'     // User joined a room
- 'user-left-room'       // User left a room

// Channels:
- 'webrtc-dashboard-rooms'  // Main channel for room ops
```

**Purpose**: Handle cross-tab and cross-peer communication.

---

#### 9. **Room List Management Module** (Lines 352-385)
```javascript
// Functions:
- _handleRoomCreated(data)       // Add room to local list
- _handleRoomRemoved(data)       // Remove room from list
- _handleRoomListRequest(data)   // Respond with our rooms
- _updateRoomParticipants()      // Sync participant counts

// State Management:
- rooms: Map<roomId, roomData>
- localRooms: Set<roomId>

// Data Flow:
Peer A creates room
  → Broadcast 'room-created'
  → Peer B receives, adds to rooms map
  → UI shows room in list
```

**Purpose**: Maintain synchronized room list across all peers.

---

#### 10. **User Join Handling Module** (Lines 387-450)
```javascript
// Functions:
- _handleUserJoinedRoom(data)    // Process join event

// Workflow:
1. Check if user joined OUR room
2. Get RoomConnectionManager for this room
3. Check if we should initiate WebRTC:
   - If myUserId < theirUserId: We create offer
   - If myUserId > theirUserId: We wait for offer
4. Call createOffer() or wait

// WebRTC Initiation:
→ Lower ID peer creates WebRTC offer
→ Higher ID peer waits for offer
→ Prevents simultaneous offers (collision)

// States:
- roomConnectionManagers: Map<roomId, RoomConnectionManager>
```

**Purpose**: Coordinate WebRTC connection establishment when users join.

**CRITICAL**: Role-based initiation (lower ID offers) prevents offer collisions.

---

#### 11. **WebRTC Offer/Answer Module** (Lines 452-520)
```javascript
// Functions:
- _handleWebRTCOffer(data)       // Process incoming offer
- _handleWebRTCAnswer(data)      // Process incoming answer
- _handleICECandidate(data)      // Process ICE candidates

// WebRTC Flow:
Host (lower ID):
  1. createOffer()
  2. Send offer via signaling
  3. Wait for answer
  4. Receive answer
  5. Add ICE candidates
  6. Connection established

Joiner (higher ID):
  1. Receive offer
  2. createAnswer()
  3. Send answer via signaling
  4. Add ICE candidates
  5. Connection established

// Signaling Channel:
'webrtc-signaling' - Separate channel for WebRTC messages
```

**Purpose**: Handle WebRTC signaling for connection establishment.

---

#### 12. **Utility Functions Module** (Lines 522-580)
```javascript
// Functions:
- _generateRoomId()              // Create unique room ID
- _sanitizeRoomForBroadcast()    // Prepare room data for network
- _validateRoomData()            // Check room data validity
- _log()                         // Logging utility

// Helpers:
- generateId()                   // From utils.js
- timestamp()                    // Current time
- sanitize()                     // Remove sensitive data
```

**Purpose**: Common utilities used across modules.

---

#### 13. **Cleanup Module** (Lines 582-620)
```javascript
// Functions:
- _setupCleanup()                // Register cleanup handlers
- _cleanup()                     // Perform cleanup
- destroy()                      // Full service destruction

// Cleanup Tasks:
1. Stop discovery intervals
2. Close all WebRTC connections
3. Unsubscribe from broadcast channels
4. Remove event listeners
5. Clear state maps

// Triggers:
- Page unload (beforeunload)
- Tab close (visibilitychange)
- Manual destroy()
```

**Purpose**: Prevent memory leaks and clean shutdown.

---

#### 14. **State Management Module** (Lines 622-655)
```javascript
// State Objects:
- rooms: Map<roomId, {
    id: string,
    name: string,
    host: string,
    participants: Array<{id, name, joinedAt, isHost}>,
    createdAt: Date,
    status: 'active' | 'closed'
  }>

- localRooms: Set<roomId>        // Rooms we created
- roomConnectionManagers: Map<roomId, RoomConnectionManager>
- eventHandlers: Map<eventName, Set<handler>>
- currentUserId: string          // Our ID

// State Transitions:
NULL → INITIALIZING → INITIALIZED → ACTIVE → DESTROYED
```

**Purpose**: Central state management for the service.

---

## File Structure

```
webrtc-dashboard/
├── README.md                    # This file - Architecture documentation
├── index.html                   # Main dashboard UI
│
├── Core Controllers
│   ├── dashboard-manager-v2.js  # Main application controller
│   └── config.js                # Configuration management
│
├── Service Layer
│   ├── room-service.js          # Room management (14 modules, 655 lines)
│   ├── chat-manager.js          # P2P chat and messaging
│   ├── access-control-manager.js # Join requests and approval
│   ├── participant-manager.js   # Participant tracking
│   └── room-manager.js          # Room state management
│
├── WebRTC Layer (managers/)
│   ├── room-connection-manager.js  # Per-room WebRTC connections
│   └── webrtc-signaling.js         # WebRTC offer/answer signaling
│
├── Communication Layer
│   ├── websocket-broadcast-service.js # WebSocket client
│   ├── shared-broadcast.js            # Shared service instances
│   └── validate-flow.js               # Message validation
│
├── UI Components
│   ├── ui-components.js         # Reusable UI components
│   └── styles.css               # Dashboard styling
│
├── Utilities
│   └── utils.js                 # Helper functions
│
└── Documentation
    ├── CLEANUP_TODO.md          # Cleanup tasks
    ├── PRODUCTION_VERSION.md    # Production notes
    ├── docs/
    │   ├── architecture/
    │   │   ├── webrtc-communication-design.md
    │   │   └── webrtc-connection-handshake-flow.md
    │   └── erros/
    │       └── webrtc-reconnect-asymmetric-messaging-2025-11-21.md
    └── DIAGRAM_TO_CODE_MAPPING.md
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

## Deployment Guide

### Docker Compose Deployment

The application can be deployed using Docker Compose with configurable environment variables for WebSocket URL and STUN servers.

#### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/xlp0/LandingPage.git
   cd LandingPage
   ```

2. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application:**
   - Local: `http://localhost:8765`
   - WebRTC Dashboard: `http://localhost:8765/js/modules/webrtc-dashboard/`

#### Configuration Options

The application is configured via environment variables in `docker-compose.yml`:

##### 1. WebSocket URL Configuration

**For Local Development (HTTP):**
```yaml
environment:
  - WEBSOCKET_URL=ws://localhost:8765/ws/
```

**For Local Network Testing (same WiFi):**
```yaml
environment:
  - WEBSOCKET_URL=ws://192.168.1.149:8765/ws/
```
> Replace `192.168.1.149` with your machine's local IP address

**For Production (HTTPS):**
```yaml
environment:
  - WEBSOCKET_URL=wss://henry.pkc.pub/ws/
```
> ⚠️ **Important**: Use `wss://` (WebSocket Secure) for HTTPS sites, `ws://` for HTTP sites

##### 2. STUN Server Configuration

STUN servers help establish peer-to-peer connections by discovering public IP addresses and NAT types.

**Using Google STUN Servers (Public, Reliable):**
```yaml
environment:
  - STUN_SERVERS=stun:stun.l.google.com:19302
```

**Using Multiple STUN Servers (Recommended for Production):**
```yaml
environment:
  - STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```

**Using Local STUN Server (For LAN Testing):**
```yaml
environment:
  - STUN_SERVERS=stun:192.168.1.149:7302
```

**Using Custom STUN Server:**
```yaml
environment:
  - STUN_SERVERS=stun:your-server.com:3478
```

#### Complete docker-compose.yml Example

**Local Development:**
```yaml
services:
  landingpage:
    build: .
    container_name: landingpage-local
    restart: unless-stopped
    ports:
      - "8765:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBSOCKET_URL=ws://localhost:8765/ws/
      - STUN_SERVERS=stun:stun.l.google.com:19302
    networks:
      - landingpage-network

networks:
  landingpage-network:
    driver: bridge
```

**Production Deployment:**
```yaml
services:
  landingpage:
    build: .
    container_name: landingpage-production
    restart: unless-stopped
    ports:
      - "8765:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBSOCKET_URL=wss://henry.pkc.pub/ws/
      - STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
    networks:
      - landingpage-network

networks:
  landingpage-network:
    driver: bridge
```

#### Building and Deploying

##### Option 1: Build Locally

```bash
# Build the Docker image
docker-compose build

# Start the container
docker-compose up -d

# View logs
docker logs -f landingpage-local

# Stop the container
docker-compose down
```

##### Option 2: Use Pre-built Image from GitHub Actions

If your repository has GitHub Actions configured to build and push Docker images:

```yaml
services:
  landingpage:
    image: ghcr.io/xlp0/landingpage:latest  # Use pre-built image
    container_name: landingpage-production
    restart: unless-stopped
    ports:
      - "8765:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBSOCKET_URL=wss://henry.pkc.pub/ws/
      - STUN_SERVERS=stun:stun.l.google.com:19302
    networks:
      - landingpage-network
```

Then deploy:
```bash
# Pull the latest image
docker-compose pull

# Start the container
docker-compose up -d
```

#### Updating Configuration

When you change environment variables in `docker-compose.yml`:

```bash
# Restart to apply changes (no rebuild needed)
docker-compose down && docker-compose up -d
```

#### Verifying Configuration

Check if environment variables are correctly loaded:

```bash
# Check environment variables inside container
docker exec landingpage-local printenv WEBSOCKET_URL
docker exec landingpage-local printenv STUN_SERVERS

# Check API configuration endpoint
curl http://localhost:8765/api/config | python3 -m json.tool
```

Expected output:
```json
{
    "WEBSOCKET_URL": "ws://localhost:8765/ws/",
    "NODE_ENV": "production",
    "PORT": "3000",
    "STUN_SERVERS": [
        {
            "urls": "stun:stun.l.google.com:19302"
        }
    ]
}
```

#### Setting Up Local STUN Server (Optional)

For local network testing, you can run your own STUN server using coturn:

1. **Start the STUN server:**
   ```bash
   docker-compose -f docker-compose.stun.yml up -d
   ```

2. **Update docker-compose.yml:**
   ```yaml
   environment:
     - STUN_SERVERS=stun:192.168.1.149:7302
   ```

3. **Restart the application:**
   ```bash
   docker-compose restart
   ```

See `STUN-SERVER-SETUP.md` for detailed STUN server configuration.

#### Troubleshooting

**WebSocket Connection Issues:**
- Verify `WEBSOCKET_URL` matches your deployment (use `wss://` for HTTPS)
- Check firewall rules allow WebSocket connections
- Ensure port 8765 is accessible

**WebRTC Connection Issues:**
- Verify STUN servers are reachable
- Check browser console for ICE connection errors
- Try using Google STUN servers for testing

**Configuration Not Applied:**
- Restart container after changing environment variables
- Verify environment variables inside container
- Check `/api/config` endpoint returns correct values

**Docker Build Issues:**
- Clear Docker cache: `docker-compose build --no-cache`
- Check Dockerfile is present in project root
- Ensure all required files are copied to container

#### Environment-Specific Configurations

**Development (localhost):**
```yaml
- WEBSOCKET_URL=ws://localhost:8765/ws/
- STUN_SERVERS=stun:stun.l.google.com:19302
```

**Local Network Testing (same WiFi):**
```yaml
- WEBSOCKET_URL=ws://192.168.1.149:8765/ws/
- STUN_SERVERS=stun:192.168.1.149:7302
```

**Staging/Production (HTTPS):**
```yaml
- WEBSOCKET_URL=wss://henry.pkc.pub/ws/
- STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```

#### Port Mapping

The default port mapping is `8765:3000`:
- `8765` = Host machine port (external access)
- `3000` = Container internal port

To change the external port:
```yaml
ports:
  - "9000:3000"  # Access via http://localhost:9000
```

#### Health Checks

Add health checks to monitor container status:

```yaml
services:
  landingpage:
    # ... other config ...
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/config"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### Production Best Practices

1. **Use HTTPS/WSS**: Always use secure WebSocket (`wss://`) in production
2. **Multiple STUN Servers**: Configure backup STUN servers for reliability
3. **Resource Limits**: Set memory and CPU limits in docker-compose.yml
4. **Logging**: Configure log rotation and monitoring
5. **Backups**: Regularly backup configuration and data
6. **Updates**: Keep Docker images updated via GitHub Actions
7. **Monitoring**: Set up health checks and alerting

---

*Built with vanilla JavaScript and WebRTC - no external dependencies required.*
