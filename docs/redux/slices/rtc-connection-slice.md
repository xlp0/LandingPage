# RTC Connection Slice - WebRTC Peer Connections & Status

**Purpose:** Manage WebRTC peer connections, connection status, media streams, and connection statistics

---

## State Structure

```javascript
{
  // Peer connections map
  connections: {
    [peerId]: {
      // Connection object (not serializable, stored separately)
      peerConnection: RTCPeerConnection,
      
      // Connection status
      status: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed',
      
      // Connection metadata
      userId: string,
      userName: string,
      
      // Connection statistics
      stats: {
        latency: number,        // ms
        bandwidth: number,      // kbps
        packetLoss: number,     // %
        lastUpdated: number     // timestamp
      },
      
      // Error information
      error: string | null,
      
      // Connection timing
      connectedAt: number,      // timestamp
      disconnectedAt: number | null
    }
  },
  
  // Local media stream
  localStream: MediaStream | null,
  
  // Local media controls
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  
  // ICE candidates
  iceCandidates: {
    [peerId]: RTCIceCandidate[]
  },
  
  // Pending offers/answers
  pendingOffers: {
    [peerId]: RTCSessionDescription
  },
  
  // Error state
  error: string | null,
  
  // Loading state
  loading: false
}
```

---

## Actions

### `initializeLocalStream(stream)`
**Trigger:** User grants media permissions  
**Effect:** Store local media stream

```javascript
{
  type: 'rtcConnection/initializeLocalStream',
  payload: MediaStream
}
```

### `addPeerConnection(peerId, userId, userName)`
**Trigger:** New peer joins room  
**Effect:** Create entry for peer connection

```javascript
{
  type: 'rtcConnection/addPeerConnection',
  payload: {
    peerId: 'peer-123',
    userId: 'user-456',
    userName: 'John Doe'
  }
}
```

### `updateConnectionStatus(peerId, status)`
**Trigger:** Connection state changes  
**Effect:** Update peer connection status

```javascript
{
  type: 'rtcConnection/updateConnectionStatus',
  payload: {
    peerId: 'peer-123',
    status: 'connected'
  }
}
```

### `updateConnectionStats(peerId, stats)`
**Trigger:** Stats collected from RTCStatsReport  
**Effect:** Update connection statistics

```javascript
{
  type: 'rtcConnection/updateConnectionStats',
  payload: {
    peerId: 'peer-123',
    stats: {
      latency: 45,
      bandwidth: 2500,
      packetLoss: 0.5
    }
  }
}
```

### `removePeerConnection(peerId)`
**Trigger:** Peer disconnects  
**Effect:** Remove peer connection entry

```javascript
{
  type: 'rtcConnection/removePeerConnection',
  payload: 'peer-123'
}
```

### `toggleAudio(enabled)`
**Trigger:** User clicks audio button  
**Effect:** Enable/disable audio tracks

```javascript
{
  type: 'rtcConnection/toggleAudio',
  payload: true
}
```

### `toggleVideo(enabled)`
**Trigger:** User clicks video button  
**Effect:** Enable/disable video tracks

```javascript
{
  type: 'rtcConnection/toggleVideo',
  payload: false
}
```

### `toggleScreenShare(enabled)`
**Trigger:** User clicks screen share button  
**Effect:** Start/stop screen sharing

```javascript
{
  type: 'rtcConnection/toggleScreenShare',
  payload: true
}
```

### `addICECandidate(peerId, candidate)`
**Trigger:** ICE candidate received  
**Effect:** Store candidate for peer

```javascript
{
  type: 'rtcConnection/addICECandidate',
  payload: {
    peerId: 'peer-123',
    candidate: RTCIceCandidate
  }
}
```

### `setConnectionError(error)`
**Trigger:** Connection error occurs  
**Effect:** Set error state

```javascript
{
  type: 'rtcConnection/setConnectionError',
  payload: 'Connection failed'
}
```

---

## Reducers

```javascript
const rtcConnectionSlice = createSlice({
  name: 'rtcConnection',
  initialState,
  reducers: {
    initializeLocalStream: (state, action) => {
      state.localStream = action.payload;
    },
    
    addPeerConnection: (state, action) => {
      const { peerId, userId, userName } = action.payload;
      state.connections[peerId] = {
        status: 'connecting',
        userId,
        userName,
        stats: {
          latency: 0,
          bandwidth: 0,
          packetLoss: 0,
          lastUpdated: Date.now()
        },
        error: null,
        connectedAt: null,
        disconnectedAt: null
      };
    },
    
    updateConnectionStatus: (state, action) => {
      const { peerId, status } = action.payload;
      if (state.connections[peerId]) {
        state.connections[peerId].status = status;
        
        if (status === 'connected') {
          state.connections[peerId].connectedAt = Date.now();
        } else if (status === 'disconnected') {
          state.connections[peerId].disconnectedAt = Date.now();
        }
      }
    },
    
    updateConnectionStats: (state, action) => {
      const { peerId, stats } = action.payload;
      if (state.connections[peerId]) {
        state.connections[peerId].stats = {
          ...stats,
          lastUpdated: Date.now()
        };
      }
    },
    
    removePeerConnection: (state, action) => {
      delete state.connections[action.payload];
    },
    
    toggleAudio: (state, action) => {
      state.audioEnabled = action.payload;
    },
    
    toggleVideo: (state, action) => {
      state.videoEnabled = action.payload;
    },
    
    toggleScreenShare: (state, action) => {
      state.screenSharing = action.payload;
    },
    
    setConnectionError: (state, action) => {
      state.error = action.payload;
    }
  }
});
```

---

## Selectors

```javascript
// Basic selectors
export const selectConnections = (state) => state.rtcConnection.connections;
export const selectLocalStream = (state) => state.rtcConnection.localStream;
export const selectAudioEnabled = (state) => state.rtcConnection.audioEnabled;
export const selectVideoEnabled = (state) => state.rtcConnection.videoEnabled;
export const selectScreenSharing = (state) => state.rtcConnection.screenSharing;
export const selectRTCError = (state) => state.rtcConnection.error;

// Peer-specific selectors
export const selectConnectionStatus = (state, peerId) =>
  state.rtcConnection.connections[peerId]?.status;

export const selectConnectionStats = (state, peerId) =>
  state.rtcConnection.connections[peerId]?.stats;

export const selectPeerLatency = (state, peerId) =>
  state.rtcConnection.connections[peerId]?.stats?.latency;

export const selectPeerBandwidth = (state, peerId) =>
  state.rtcConnection.connections[peerId]?.stats?.bandwidth;

// Computed selectors
export const selectConnectedPeers = (state) =>
  Object.entries(state.rtcConnection.connections)
    .filter(([_, conn]) => conn.status === 'connected')
    .map(([peerId, conn]) => ({ peerId, ...conn }));

export const selectConnectionCount = (state) =>
  Object.keys(state.rtcConnection.connections).length;

export const selectConnectedCount = (state) =>
  Object.values(state.rtcConnection.connections)
    .filter(conn => conn.status === 'connected').length;

export const selectFailedConnections = (state) =>
  Object.entries(state.rtcConnection.connections)
    .filter(([_, conn]) => conn.status === 'failed')
    .map(([peerId, conn]) => ({ peerId, ...conn }));

export const selectMediaEnabled = (state) =>
  state.rtcConnection.audioEnabled || state.rtcConnection.videoEnabled;
```

---

## Async Thunks

### `initializeMedia(constraints)`
Request user media permissions

```javascript
export const initializeMedia = createAsyncThunk(
  'rtcConnection/initializeMedia',
  async (constraints = { audio: true, video: true }, { rejectWithValue }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### `startScreenShare()`
Start screen sharing

```javascript
export const startScreenShare = createAsyncThunk(
  'rtcConnection/startScreenShare',
  async (_, { getState, rejectWithValue }) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      return stream;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### `stopScreenShare()`
Stop screen sharing

```javascript
export const stopScreenShare = createAsyncThunk(
  'rtcConnection/stopScreenShare',
  async (_, { getState }) => {
    const { rtcConnection } = getState();
    if (rtcConnection.localStream) {
      rtcConnection.localStream.getTracks().forEach(track => track.stop());
    }
  }
);
```

### `collectConnectionStats(peerId)`
Collect WebRTC statistics

```javascript
export const collectConnectionStats = createAsyncThunk(
  'rtcConnection/collectConnectionStats',
  async (peerId, { getState, rejectWithValue }) => {
    try {
      const { rtcConnection } = getState();
      const peerConnection = rtcConnection.connections[peerId]?.peerConnection;
      
      if (!peerConnection) throw new Error('Peer connection not found');
      
      const stats = await peerConnection.getStats();
      const report = parseStats(stats);
      
      return { peerId, stats: report };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

---

## Connection Status Transitions

```
┌─────────────┐
│  Connecting │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       v                 v
   Connected         Failed
       │                 │
       │                 v
       │            Disconnected
       │                 │
       └────────┬────────┘
                │
                v
            Closed
```

---

## Error Handling

### Connection Errors
- `ICE Connection Failed` - No route to peer
- `DTLS Handshake Failed` - Encryption negotiation failed
- `Media Not Available` - Camera/microphone access denied
- `Stream Ended` - Media stream stopped unexpectedly

### Recovery Strategies
1. Retry connection with exponential backoff
2. Switch to audio-only if video fails
3. Use relay servers (TURN) if direct connection fails
4. Notify user of connection issues

---

## Integration with WebSocket

### Events Received
- `peer-joined` - New peer in room
- `peer-left` - Peer disconnected
- `offer` - WebRTC offer from peer
- `answer` - WebRTC answer from peer
- `ice-candidate` - ICE candidate from peer

### Events Sent
- `ready-for-offer` - Ready to receive offer
- `offer` - Send offer to peer
- `answer` - Send answer to peer
- `ice-candidate` - Send ICE candidate

---

## Usage Example

```javascript
import { useDispatch, useSelector } from 'react-redux';
import {
  initializeMedia,
  toggleAudio,
  toggleVideo,
  selectConnectedPeers,
  selectAudioEnabled,
  selectVideoEnabled
} from './rtcConnectionSlice';

function VideoConference() {
  const dispatch = useDispatch();
  const peers = useSelector(selectConnectedPeers);
  const audioEnabled = useSelector(selectAudioEnabled);
  const videoEnabled = useSelector(selectVideoEnabled);
  
  useEffect(() => {
    dispatch(initializeMedia());
  }, []);
  
  return (
    <div>
      <div className="video-grid">
        {peers.map(peer => (
          <VideoTile key={peer.peerId} peer={peer} />
        ))}
      </div>
      
      <div className="controls">
        <button onClick={() => dispatch(toggleAudio(!audioEnabled))}>
          {audioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button onClick={() => dispatch(toggleVideo(!videoEnabled))}>
          {videoEnabled ? 'Stop Video' : 'Start Video'}
        </button>
      </div>
    </div>
  );
}
```

