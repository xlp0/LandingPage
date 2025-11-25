# Invitations Slice - Room & Connection Invitations

**Purpose:** Manage sent and received room invitations, invitation status, and responses

---

## State Structure

```javascript
{
  // Invitations sent by current user
  sent: [
    {
      id: string,
      invitationId: string,
      
      // Recipient info
      recipientId: string,
      recipientName: string,
      recipientEmail: string,
      recipientAvatar: string,
      
      // Room info
      roomId: string,
      roomName: string,
      
      // Invitation status
      status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled',
      
      // Timing
      sentAt: number,
      respondedAt: number | null,
      expiresAt: number,
      
      // Message
      message: string | null,
      
      // Response
      response: string | null
    }
  ],
  
  // Invitations received by current user
  received: [
    {
      id: string,
      invitationId: string,
      
      // Sender info
      senderId: string,
      senderName: string,
      senderEmail: string,
      senderAvatar: string,
      
      // Room info
      roomId: string,
      roomName: string,
      roomDescription: string,
      
      // Invitation status
      status: 'pending' | 'accepted' | 'rejected' | 'expired',
      
      // Timing
      sentAt: number,
      respondedAt: number | null,
      expiresAt: number,
      
      // Message
      message: string | null,
      
      // Permissions
      canShare: boolean,
      canRecord: boolean
    }
  ],
  
  // Filters
  filter: {
    type: 'all' | 'sent' | 'received',
    status: 'all' | 'pending' | 'accepted' | 'rejected',
    search: string
  },
  
  // Loading & Error
  loading: false,
  error: null
}
```

---

## Actions

### `sendInvitation(recipientId, roomId, message)`
**Trigger:** User sends invitation  
**Effect:** Add to sent invitations

```javascript
{
  type: 'invitations/sendInvitation',
  payload: {
    recipientId: 'user-123',
    recipientName: 'John Doe',
    recipientEmail: 'john@example.com',
    roomId: 'room-456',
    roomName: 'Team Meeting',
    message: 'Join our meeting!',
    sentAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  }
}
```

### `addReceivedInvitation(invitation)`
**Trigger:** Invitation received via WebSocket  
**Effect:** Add to received invitations

```javascript
{
  type: 'invitations/addReceivedInvitation',
  payload: {
    id: 'inv-789',
    senderId: 'user-123',
    senderName: 'John Doe',
    senderEmail: 'john@example.com',
    roomId: 'room-456',
    roomName: 'Team Meeting',
    roomDescription: 'Weekly sync',
    status: 'pending',
    sentAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    message: 'Join our meeting!',
    canShare: true,
    canRecord: false
  }
}
```

### `acceptInvitation(invitationId)`
**Trigger:** User accepts invitation  
**Effect:** Update invitation status to accepted

```javascript
{
  type: 'invitations/acceptInvitation',
  payload: 'inv-789'
}
```

### `rejectInvitation(invitationId, reason)`
**Trigger:** User rejects invitation  
**Effect:** Update invitation status to rejected

```javascript
{
  type: 'invitations/rejectInvitation',
  payload: {
    invitationId: 'inv-789',
    reason: 'Not available'
  }
}
```

### `cancelInvitation(invitationId)`
**Trigger:** User cancels sent invitation  
**Effect:** Update invitation status to cancelled

```javascript
{
  type: 'invitations/cancelInvitation',
  payload: 'inv-789'
}
```

### `updateInvitationStatus(invitationId, status, respondedAt)`
**Trigger:** Invitation status changes  
**Effect:** Update status and response time

```javascript
{
  type: 'invitations/updateInvitationStatus',
  payload: {
    invitationId: 'inv-789',
    status: 'accepted',
    respondedAt: Date.now()
  }
}
```

### `setInvitationFilter(filter)`
**Trigger:** User filters invitations  
**Effect:** Update filter state

```javascript
{
  type: 'invitations/setInvitationFilter',
  payload: {
    type: 'received',
    status: 'pending',
    search: 'john'
  }
}
```

### `removeInvitation(invitationId, type)`
**Trigger:** User removes invitation  
**Effect:** Remove from sent or received

```javascript
{
  type: 'invitations/removeInvitation',
  payload: {
    invitationId: 'inv-789',
    type: 'received'
  }
}
```

---

## Reducers

```javascript
const invitationsSlice = createSlice({
  name: 'invitations',
  initialState,
  reducers: {
    sendInvitation: (state, action) => {
      state.sent.push({
        id: Date.now().toString(),
        status: 'pending',
        respondedAt: null,
        response: null,
        ...action.payload
      });
    },
    
    addReceivedInvitation: (state, action) => {
      state.received.push(action.payload);
    },
    
    acceptInvitation: (state, action) => {
      const invitation = state.received.find(i => i.id === action.payload);
      if (invitation) {
        invitation.status = 'accepted';
        invitation.respondedAt = Date.now();
      }
    },
    
    rejectInvitation: (state, action) => {
      const { invitationId, reason } = action.payload;
      const invitation = state.received.find(i => i.id === invitationId);
      if (invitation) {
        invitation.status = 'rejected';
        invitation.respondedAt = Date.now();
        invitation.response = reason;
      }
    },
    
    cancelInvitation: (state, action) => {
      const invitation = state.sent.find(i => i.id === action.payload);
      if (invitation) {
        invitation.status = 'cancelled';
      }
    },
    
    updateInvitationStatus: (state, action) => {
      const { invitationId, status, respondedAt } = action.payload;
      
      let invitation = state.sent.find(i => i.id === invitationId);
      if (invitation) {
        invitation.status = status;
        if (respondedAt) invitation.respondedAt = respondedAt;
        return;
      }
      
      invitation = state.received.find(i => i.id === invitationId);
      if (invitation) {
        invitation.status = status;
        if (respondedAt) invitation.respondedAt = respondedAt;
      }
    },
    
    setInvitationFilter: (state, action) => {
      state.filter = action.payload;
    },
    
    removeInvitation: (state, action) => {
      const { invitationId, type } = action.payload;
      
      if (type === 'sent') {
        state.sent = state.sent.filter(i => i.id !== invitationId);
      } else if (type === 'received') {
        state.received = state.received.filter(i => i.id !== invitationId);
      }
    }
  }
});
```

---

## Selectors

```javascript
// Basic selectors
export const selectSentInvitations = (state) => state.invitations.sent;
export const selectReceivedInvitations = (state) => state.invitations.received;
export const selectInvitationFilter = (state) => state.invitations.filter;

// Count selectors
export const selectSentInvitationCount = (state) => state.invitations.sent.length;
export const selectReceivedInvitationCount = (state) => state.invitations.received.length;

export const selectPendingReceivedCount = (state) =>
  state.invitations.received.filter(i => i.status === 'pending').length;

export const selectPendingSentCount = (state) =>
  state.invitations.sent.filter(i => i.status === 'pending').length;

// Status selectors
export const selectPendingReceivedInvitations = (state) =>
  state.invitations.received.filter(i => i.status === 'pending');

export const selectPendingSentInvitations = (state) =>
  state.invitations.sent.filter(i => i.status === 'pending');

export const selectAcceptedInvitations = (state) =>
  state.invitations.received.filter(i => i.status === 'accepted');

export const selectRejectedInvitations = (state) =>
  state.invitations.received.filter(i => i.status === 'rejected');

export const selectExpiredInvitations = (state) =>
  state.invitations.received.filter(i => i.status === 'expired');

// Filtered selectors
export const selectFilteredInvitations = (state) => {
  const { sent, received, filter } = state.invitations;
  let invitations = [];
  
  // Select by type
  if (filter.type === 'sent') {
    invitations = sent;
  } else if (filter.type === 'received') {
    invitations = received;
  } else {
    invitations = [...sent, ...received];
  }
  
  // Filter by status
  if (filter.status !== 'all') {
    invitations = invitations.filter(i => i.status === filter.status);
  }
  
  // Filter by search
  if (filter.search) {
    const search = filter.search.toLowerCase();
    invitations = invitations.filter(i => {
      const name = (i.senderName || i.recipientName || '').toLowerCase();
      const room = (i.roomName || '').toLowerCase();
      return name.includes(search) || room.includes(search);
    });
  }
  
  return invitations;
};

// Specific invitation selectors
export const selectInvitationById = (state, invitationId) => {
  const sent = state.invitations.sent.find(i => i.id === invitationId);
  if (sent) return sent;
  return state.invitations.received.find(i => i.id === invitationId);
};

export const selectInvitationsByRoom = (state, roomId) => {
  const sent = state.invitations.sent.filter(i => i.roomId === roomId);
  const received = state.invitations.received.filter(i => i.roomId === roomId);
  return { sent, received };
};

export const selectInvitationsByUser = (state, userId) => {
  const sent = state.invitations.sent.filter(i => i.recipientId === userId);
  const received = state.invitations.received.filter(i => i.senderId === userId);
  return { sent, received };
};

// Expiry selectors
export const selectExpiredInvitationCount = (state) =>
  state.invitations.received.filter(i => i.expiresAt < Date.now()).length;

export const selectExpiringInvitations = (state, hoursUntilExpiry = 24) => {
  const threshold = Date.now() + hoursUntilExpiry * 60 * 60 * 1000;
  return state.invitations.received.filter(i =>
    i.status === 'pending' && i.expiresAt < threshold
  );
};
```

---

## Async Thunks

### `sendInvitationToServer(recipientId, roomId, message)`
Send invitation via server

```javascript
export const sendInvitationToServer = createAsyncThunk(
  'invitations/sendInvitationToServer',
  async ({ recipientId, roomId, message }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, roomId, message })
      });
      
      if (!response.ok) throw new Error('Failed to send invitation');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### `respondToInvitation(invitationId, response)`
Accept or reject invitation

```javascript
export const respondToInvitation = createAsyncThunk(
  'invitations/respondToInvitation',
  async ({ invitationId, response }, { rejectWithValue }) => {
    try {
      const endpoint = response === 'accept' ? 'accept' : 'reject';
      const url = `/api/invitations/${invitationId}/${endpoint}`;
      
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to respond to invitation');
      
      return { invitationId, response };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### `fetchInvitations()`
Fetch all invitations

```javascript
export const fetchInvitations = createAsyncThunk(
  'invitations/fetchInvitations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/invitations');
      if (!response.ok) throw new Error('Failed to fetch invitations');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

---

## Invitation Lifecycle

```
┌─────────────┐
│   Created   │
└──────┬──────┘
       │
       v
┌─────────────┐
│   Pending   │ ◄─── Waiting for response
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
       v              v              v
   Accepted      Rejected        Expired
       │              │              │
       └──────────────┴──────────────┘
              │
              v
          Resolved
```

---

## Notification Integration

### Pending Invitations Notification
```javascript
// Show badge with pending invitation count
<Badge count={selectPendingReceivedCount(state)} />
```

### Invitation Expiry Warning
```javascript
// Warn user about expiring invitations
const expiringInvitations = selectExpiringInvitations(state, 24);
if (expiringInvitations.length > 0) {
  showNotification('Invitations expiring soon');
}
```

---

## WebSocket Integration

### Events Received
- `invitation-sent` - Someone sent you an invitation
- `invitation-accepted` - Someone accepted your invitation
- `invitation-rejected` - Someone rejected your invitation
- `invitation-expired` - Your invitation expired

### Events Sent
- `send-invitation` - Send invitation to user
- `accept-invitation` - Accept invitation
- `reject-invitation` - Reject invitation

---

## Usage Example

```javascript
import { useDispatch, useSelector } from 'react-redux';
import {
  selectPendingReceivedInvitations,
  selectPendingReceivedCount,
  acceptInvitation,
  rejectInvitation,
  sendInvitationToServer
} from './invitationsSlice';

function InvitationsPanel() {
  const dispatch = useDispatch();
  const pendingInvitations = useSelector(selectPendingReceivedInvitations);
  const pendingCount = useSelector(selectPendingReceivedCount);
  
  const handleAccept = (invitationId) => {
    dispatch(acceptInvitation(invitationId));
  };
  
  const handleReject = (invitationId) => {
    dispatch(rejectInvitation(invitationId, 'Not available'));
  };
  
  return (
    <div className="invitations-panel">
      <h3>Invitations ({pendingCount})</h3>
      
      {pendingInvitations.map(invitation => (
        <div key={invitation.id} className="invitation-card">
          <div className="sender-info">
            <img src={invitation.senderAvatar} alt={invitation.senderName} />
            <div>
              <p>{invitation.senderName}</p>
              <p className="room-name">{invitation.roomName}</p>
            </div>
          </div>
          
          {invitation.message && (
            <p className="message">{invitation.message}</p>
          )}
          
          <div className="actions">
            <button onClick={() => handleAccept(invitation.id)}>
              Accept
            </button>
            <button onClick={() => handleReject(invitation.id)}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

