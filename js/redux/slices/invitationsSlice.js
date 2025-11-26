/**
 * Invitations Slice - Room & Connection Invitations
 * 
 * Manages sent and received room invitations, invitation status, and responses
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Invitations sent by current user
  sent: [],
  
  // Invitations received by current user
  received: [],
  
  // Filters
  filter: {
    type: 'all', // 'all' | 'sent' | 'received'
    status: 'all', // 'all' | 'pending' | 'accepted' | 'rejected'
    search: ''
  },
  
  // Loading & Error
  loading: false,
  error: null
};

const invitationsSlice = createSlice({
  name: 'invitations',
  initialState,
  reducers: {
    /**
     * Send invitation to another user
     */
    sendInvitation: (state, action) => {
      const invitation = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        invitationId: action.payload.invitationId || `inv-${Date.now()}`,
        status: 'pending',
        respondedAt: null,
        response: null,
        sentAt: Date.now(),
        expiresAt: action.payload.expiresAt || Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        ...action.payload
      };
      
      state.sent.push(invitation);
      console.log('[Invitations] Invitation sent:', invitation);
    },
    
    /**
     * Add received invitation
     */
    addReceivedInvitation: (state, action) => {
      const exists = state.received.find(i => i.id === action.payload.id);
      if (!exists) {
        state.received.push(action.payload);
        console.log('[Invitations] Invitation received:', action.payload);
      }
    },
    
    /**
     * Accept invitation
     */
    acceptInvitation: (state, action) => {
      const invitation = state.received.find(i => i.id === action.payload);
      if (invitation) {
        invitation.status = 'accepted';
        invitation.respondedAt = Date.now();
        console.log('[Invitations] Invitation accepted:', invitation.id);
      }
    },
    
    /**
     * Reject invitation
     */
    rejectInvitation: (state, action) => {
      const { invitationId, reason } = action.payload;
      const invitation = state.received.find(i => i.id === invitationId);
      if (invitation) {
        invitation.status = 'rejected';
        invitation.respondedAt = Date.now();
        invitation.response = reason || 'Declined';
        console.log('[Invitations] Invitation rejected:', invitation.id);
      }
    },
    
    /**
     * Cancel sent invitation
     */
    cancelInvitation: (state, action) => {
      const invitation = state.sent.find(i => i.id === action.payload);
      if (invitation) {
        invitation.status = 'cancelled';
        console.log('[Invitations] Invitation cancelled:', invitation.id);
      }
    },
    
    /**
     * Update invitation status
     */
    updateInvitationStatus: (state, action) => {
      const { invitationId, status, respondedAt } = action.payload;
      
      // Check sent invitations
      let invitation = state.sent.find(i => i.id === invitationId || i.invitationId === invitationId);
      if (invitation) {
        invitation.status = status;
        if (respondedAt) invitation.respondedAt = respondedAt;
        console.log('[Invitations] Sent invitation status updated:', invitationId, status);
        return;
      }
      
      // Check received invitations
      invitation = state.received.find(i => i.id === invitationId || i.invitationId === invitationId);
      if (invitation) {
        invitation.status = status;
        if (respondedAt) invitation.respondedAt = respondedAt;
        console.log('[Invitations] Received invitation status updated:', invitationId, status);
      }
    },
    
    /**
     * Set invitation filter
     */
    setInvitationFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    
    /**
     * Remove invitation
     */
    removeInvitation: (state, action) => {
      const { invitationId, type } = action.payload;
      
      if (type === 'sent') {
        state.sent = state.sent.filter(i => i.id !== invitationId);
        console.log('[Invitations] Sent invitation removed:', invitationId);
      } else if (type === 'received') {
        state.received = state.received.filter(i => i.id !== invitationId);
        console.log('[Invitations] Received invitation removed:', invitationId);
      }
    },
    
    /**
     * Clear all invitations
     */
    clearInvitations: (state) => {
      state.sent = [];
      state.received = [];
      console.log('[Invitations] All invitations cleared');
    },
    
    /**
     * Mark expired invitations
     */
    markExpiredInvitations: (state) => {
      const now = Date.now();
      
      state.sent.forEach(invitation => {
        if (invitation.status === 'pending' && invitation.expiresAt < now) {
          invitation.status = 'expired';
        }
      });
      
      state.received.forEach(invitation => {
        if (invitation.status === 'pending' && invitation.expiresAt < now) {
          invitation.status = 'expired';
        }
      });
    },
    
    /**
     * Set loading state
     */
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    /**
     * Set error
     */
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

// Export actions
export const {
  sendInvitation,
  addReceivedInvitation,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  updateInvitationStatus,
  setInvitationFilter,
  removeInvitation,
  clearInvitations,
  markExpiredInvitations,
  setLoading,
  setError
} = invitationsSlice.actions;

// Selectors
export const selectSentInvitations = (state) => state.invitations.sent;
export const selectReceivedInvitations = (state) => state.invitations.received;
export const selectInvitationFilter = (state) => state.invitations.filter;
export const selectInvitationsLoading = (state) => state.invitations.loading;
export const selectInvitationsError = (state) => state.invitations.error;

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

export const selectExpiredInvitations = (state) => {
  const now = Date.now();
  return state.invitations.received.filter(
    i => i.status === 'pending' && i.expiresAt < now
  );
};

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
    invitations = invitations.filter(i =>
      i.senderName?.toLowerCase().includes(search) ||
      i.recipientName?.toLowerCase().includes(search) ||
      i.roomName?.toLowerCase().includes(search) ||
      i.message?.toLowerCase().includes(search)
    );
  }
  
  return invitations;
};

// Export reducer
export default invitationsSlice.reducer;
