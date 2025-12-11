# Participants Slice - Connected Users & Status

**Purpose:** Manage participants in current room, their status, media streams, and interactions

---

## State Structure

```javascript
{
  // List of all participants in current room
  list: [
    {
      // Participant identification
      id: string,
      userId: string,
      name: string,
      email: string,
      avatar: string,
      
      // Participant status
      status: 'active' | 'idle' | 'away' | 'disconnected',
      
      // Media status
      audioEnabled: boolean,
      videoEnabled: boolean,
      screenSharing: boolean,
      
      // Connection info
      connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed',
      latency: number,
      
      // Timing
      joinedAt: number,
      lastActivityAt: number,
      
      // Permissions
      isModerator: boolean,
      canShare: boolean,
      canRecord: boolean
    }
  ],
  
  // Local participant (current user)
  localParticipant: {
    id: string,
    userId: string,
    name: string,
    email: string,
    avatar: string,
    status: 'active',
    audioEnabled: boolean,
    videoEnabled: boolean,
    screenSharing: boolean,
    isModerator: boolean
  } | null,
  
  // Selected participant for focus view
  selectedParticipantId: string | null,
  
  // Participant search/filter
  filter: {
    search: string,
    status: 'all' | 'active' | 'idle' | 'away'
  },
  
  // Loading & Error
  loading: false,
  error: null
}
```

---

## Actions

### `addParticipant(participant)`
**Trigger:** Peer joins room  
**Effect:** Add participant to list

```javascript
{
  type: 'participants/addParticipant',
  payload: {
    id: 'participant-123',
    userId: 'user-456',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'avatar_url',
    status: 'active',
    audioEnabled: true,
    videoEnabled: true,
    screenSharing: false,
    connectionStatus: 'connecting',
    joinedAt: Date.now(),
    isModerator: false
  }
}
```

### `removeParticipant(participantId)`
**Trigger:** Peer leaves room  
**Effect:** Remove participant from list

```javascript
{
  type: 'participants/removeParticipant',
  payload: 'participant-123'
}
```

### `updateParticipantStatus(participantId, status)`
**Trigger:** Participant status changes  
**Effect:** Update participant status

```javascript
{
  type: 'participants/updateParticipantStatus',
  payload: {
    participantId: 'participant-123',
    status: 'idle'
  }
}
```

### `updateParticipantMedia(participantId, media)`
**Trigger:** Participant enables/disables media  
**Effect:** Update media status

```javascript
{
  type: 'participants/updateParticipantMedia',
  payload: {
    participantId: 'participant-123',
    media: {
      audioEnabled: false,
      videoEnabled: true,
      screenSharing: false
    }
  }
}
```

### `updateParticipantConnection(participantId, connectionStatus, latency)`
**Trigger:** Connection status changes  
**Effect:** Update connection info

```javascript
{
  type: 'participants/updateParticipantConnection',
  payload: {
    participantId: 'participant-123',
    connectionStatus: 'connected',
    latency: 45
  }
}
```

### `setLocalParticipant(participant)`
**Trigger:** User joins room  
**Effect:** Set local participant data

```javascript
{
  type: 'participants/setLocalParticipant',
  payload: {
    id: 'participant-local',
    userId: 'user-789',
    name: 'You',
    email: 'you@example.com',
    avatar: 'your_avatar',
    status: 'active',
    audioEnabled: true,
    videoEnabled: true,
    isModerator: true
  }
}
```

### `updateLocalParticipantMedia(media)`
**Trigger:** Local user toggles media  
**Effect:** Update local media status

```javascript
{
  type: 'participants/updateLocalParticipantMedia',
  payload: {
    audioEnabled: true,
    videoEnabled: false,
    screenSharing: false
  }
}
```

### `selectParticipant(participantId)`
**Trigger:** User clicks on participant  
**Effect:** Set selected participant for focus view

```javascript
{
  type: 'participants/selectParticipant',
  payload: 'participant-123'
}
```

### `updateParticipantActivity(participantId)`
**Trigger:** Participant performs action  
**Effect:** Update last activity timestamp

```javascript
{
  type: 'participants/updateParticipantActivity',
  payload: 'participant-123'
}
```

### `setParticipantFilter(filter)`
**Trigger:** User filters participants  
**Effect:** Update filter state

```javascript
{
  type: 'participants/setParticipantFilter',
  payload: {
    search: 'john',
    status: 'active'
  }
}
```

---

## Reducers

```javascript
const participantsSlice = createSlice({
  name: 'participants',
  initialState,
  reducers: {
    addParticipant: (state, action) => {
      state.list.push(action.payload);
    },
    
    removeParticipant: (state, action) => {
      state.list = state.list.filter(p => p.id !== action.payload);
      if (state.selectedParticipantId === action.payload) {
        state.selectedParticipantId = null;
      }
    },
    
    updateParticipantStatus: (state, action) => {
      const { participantId, status } = action.payload;
      const participant = state.list.find(p => p.id === participantId);
      if (participant) {
        participant.status = status;
        participant.lastActivityAt = Date.now();
      }
    },
    
    updateParticipantMedia: (state, action) => {
      const { participantId, media } = action.payload;
      const participant = state.list.find(p => p.id === participantId);
      if (participant) {
        Object.assign(participant, media);
        participant.lastActivityAt = Date.now();
      }
    },
    
    updateParticipantConnection: (state, action) => {
      const { participantId, connectionStatus, latency } = action.payload;
      const participant = state.list.find(p => p.id === participantId);
      if (participant) {
        participant.connectionStatus = connectionStatus;
        participant.latency = latency;
      }
    },
    
    setLocalParticipant: (state, action) => {
      state.localParticipant = action.payload;
    },
    
    updateLocalParticipantMedia: (state, action) => {
      if (state.localParticipant) {
        Object.assign(state.localParticipant, action.payload);
      }
    },
    
    selectParticipant: (state, action) => {
      state.selectedParticipantId = action.payload;
    },
    
    updateParticipantActivity: (state, action) => {
      const participant = state.list.find(p => p.id === action.payload);
      if (participant) {
        participant.lastActivityAt = Date.now();
      }
    },
    
    setParticipantFilter: (state, action) => {
      state.filter = action.payload;
    }
  }
});
```

---

## Selectors

```javascript
// Basic selectors
export const selectAllParticipants = (state) => state.participants.list;
export const selectLocalParticipant = (state) => state.participants.localParticipant;
export const selectSelectedParticipant = (state) => {
  const id = state.participants.selectedParticipantId;
  return state.participants.list.find(p => p.id === id);
};
export const selectParticipantFilter = (state) => state.participants.filter;

// Count selectors
export const selectParticipantCount = (state) => state.participants.list.length;
export const selectActiveParticipantCount = (state) =>
  state.participants.list.filter(p => p.status === 'active').length;

export const selectConnectedParticipantCount = (state) =>
  state.participants.list.filter(p => p.connectionStatus === 'connected').length;

// Status selectors
export const selectParticipantsByStatus = (state, status) =>
  state.participants.list.filter(p => p.status === status);

export const selectActiveParticipants = (state) =>
  state.participants.list.filter(p => p.status === 'active');

export const selectIdleParticipants = (state) =>
  state.participants.list.filter(p => p.status === 'idle');

export const selectDisconnectedParticipants = (state) =>
  state.participants.list.filter(p => p.connectionStatus === 'disconnected');

// Media selectors
export const selectParticipantsWithAudio = (state) =>
  state.participants.list.filter(p => p.audioEnabled);

export const selectParticipantsWithVideo = (state) =>
  state.participants.list.filter(p => p.videoEnabled);

export const selectParticipantsScreenSharing = (state) =>
  state.participants.list.filter(p => p.screenSharing);

// Search/Filter selectors
export const selectFilteredParticipants = (state) => {
  const { list, filter } = state.participants;
  let filtered = list;
  
  // Filter by status
  if (filter.status !== 'all') {
    filtered = filtered.filter(p => p.status === filter.status);
  }
  
  // Filter by search
  if (filter.search) {
    const search = filter.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.email.toLowerCase().includes(search)
    );
  }
  
  return filtered;
};

// Moderator selectors
export const selectModerators = (state) =>
  state.participants.list.filter(p => p.isModerator);

export const selectIsLocalModerator = (state) =>
  state.participants.localParticipant?.isModerator || false;

// Connection quality selectors
export const selectParticipantsByLatency = (state) =>
  state.participants.list.sort((a, b) => a.latency - b.latency);

export const selectHighLatencyParticipants = (state, threshold = 100) =>
  state.participants.list.filter(p => p.latency > threshold);

export const selectParticipantById = (state, participantId) =>
  state.participants.list.find(p => p.id === participantId);
```

---

## Async Thunks

### `fetchParticipants(roomId)`
Fetch participants from server

```javascript
export const fetchParticipants = createAsyncThunk(
  'participants/fetchParticipants',
  async (roomId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/participants`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### `updateParticipantOnServer(participantId, data)`
Update participant on server

```javascript
export const updateParticipantOnServer = createAsyncThunk(
  'participants/updateParticipantOnServer',
  async ({ participantId, data }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update participant');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

---

## Participant Status Lifecycle

```
┌─────────────┐
│   Joining   │
└──────┬──────┘
       │
       v
┌─────────────┐
│   Active    │ ◄─── User interacting
└──────┬──────┘
       │
       v
┌─────────────┐
│    Idle     │ ◄─── No activity for X seconds
└──────┬──────┘
       │
       v
┌─────────────┐
│     Away    │ ◄─── No activity for Y seconds
└──────┬──────┘
       │
       v
┌─────────────────┐
│  Disconnected   │ ◄─── Connection lost
└─────────────────┘
```

---

## Media Status Indicators

```javascript
// Audio status
🔊 Audio enabled
🔇 Audio muted

// Video status
📹 Video enabled
📷 Video disabled

// Screen sharing
🖥️ Screen sharing
📺 Watching shared screen

// Connection quality
🟢 Good (latency < 50ms)
🟡 Fair (latency 50-100ms)
🔴 Poor (latency > 100ms)
```

---

## Integration with RTC Connection Slice

### Sync Connection Status
```javascript
// When RTC connection status changes
dispatch(updateParticipantConnection(peerId, status, latency));
```

### Sync Media Status
```javascript
// When peer enables/disables media
dispatch(updateParticipantMedia(peerId, { audioEnabled, videoEnabled }));
```

---

## Usage Example

```javascript
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAllParticipants,
  selectLocalParticipant,
  selectFilteredParticipants,
  selectParticipantsWithVideo,
  selectParticipantsByStatus,
  selectParticipant,
  updateLocalParticipantMedia
} from './participantsSlice';

function ParticipantsList() {
  const dispatch = useDispatch();
  const participants = useSelector(selectFilteredParticipants);
  const localParticipant = useSelector(selectLocalParticipant);
  
  const handleToggleAudio = () => {
    dispatch(updateLocalParticipantMedia({
      audioEnabled: !localParticipant.audioEnabled
    }));
  };
  
  return (
    <div className="participants">
      <h2>Participants ({participants.length})</h2>
      
      <div className="local-participant">
        <ParticipantCard participant={localParticipant} isLocal />
        <button onClick={handleToggleAudio}>
          {localParticipant.audioEnabled ? 'Mute' : 'Unmute'}
        </button>
      </div>
      
      <div className="remote-participants">
        {participants
          .filter(p => p.id !== localParticipant?.id)
          .map(participant => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
            />
          ))}
      </div>
    </div>
  );
}
```

