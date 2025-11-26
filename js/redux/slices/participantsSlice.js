/**
 * Participants Slice - Connected Users & Status
 * 
 * Manages participants in current room, their status, media streams, and interactions
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // List of participants in current room
  list: [],
  
  // Current user's participant ID
  currentUserId: null,
  
  // Active speaker
  activeSpeaker: null,
  
  // Screen sharing participant
  screenSharer: null,
  
  // Filters & View
  filter: {
    status: 'all', // 'all' | 'online' | 'away' | 'busy'
    search: ''
  },
  
  view: 'grid', // 'grid' | 'speaker' | 'gallery'
  
  // Loading & Error
  loading: false,
  error: null
};

const participantsSlice = createSlice({
  name: 'participants',
  initialState,
  reducers: {
    /**
     * Add participant
     */
    addParticipant: (state, action) => {
      const exists = state.list.find(p => p.id === action.payload.id);
      if (!exists) {
        const participant = {
          joinedAt: Date.now(),
          audioEnabled: true,
          videoEnabled: true,
          screenSharing: false,
          handRaised: false,
          speaking: false,
          audioLevel: 0,
          status: 'online',
          role: 'participant',
          ...action.payload
        };
        
        state.list.push(participant);
        console.log('[Participants] Participant added:', participant.id, participant.name);
      }
    },
    
    /**
     * Remove participant
     */
    removeParticipant: (state, action) => {
      const participantId = action.payload;
      state.list = state.list.filter(p => p.id !== participantId);
      
      // Clear active speaker if removed
      if (state.activeSpeaker === participantId) {
        state.activeSpeaker = null;
      }
      
      // Clear screen sharer if removed
      if (state.screenSharer === participantId) {
        state.screenSharer = null;
      }
      
      console.log('[Participants] Participant removed:', participantId);
    },
    
    /**
     * Update participant
     */
    updateParticipant: (state, action) => {
      const { id, ...updates } = action.payload;
      const participant = state.list.find(p => p.id === id);
      
      if (participant) {
        Object.assign(participant, updates);
        console.log('[Participants] Participant updated:', id, updates);
      }
    },
    
    /**
     * Set current user ID
     */
    setCurrentUserId: (state, action) => {
      state.currentUserId = action.payload;
      console.log('[Participants] Current user ID set:', action.payload);
    },
    
    /**
     * Toggle participant audio
     */
    toggleParticipantAudio: (state, action) => {
      const participant = state.list.find(p => p.id === action.payload);
      if (participant) {
        participant.audioEnabled = !participant.audioEnabled;
        console.log('[Participants] Audio toggled:', participant.id, participant.audioEnabled);
      }
    },
    
    /**
     * Toggle participant video
     */
    toggleParticipantVideo: (state, action) => {
      const participant = state.list.find(p => p.id === action.payload);
      if (participant) {
        participant.videoEnabled = !participant.videoEnabled;
        console.log('[Participants] Video toggled:', participant.id, participant.videoEnabled);
      }
    },
    
    /**
     * Set participant audio enabled
     */
    setParticipantAudio: (state, action) => {
      const { id, enabled } = action.payload;
      const participant = state.list.find(p => p.id === id);
      if (participant) {
        participant.audioEnabled = enabled;
      }
    },
    
    /**
     * Set participant video enabled
     */
    setParticipantVideo: (state, action) => {
      const { id, enabled } = action.payload;
      const participant = state.list.find(p => p.id === id);
      if (participant) {
        participant.videoEnabled = enabled;
      }
    },
    
    /**
     * Set participant screen sharing
     */
    setParticipantScreenSharing: (state, action) => {
      const { id, sharing } = action.payload;
      const participant = state.list.find(p => p.id === id);
      
      if (participant) {
        participant.screenSharing = sharing;
        
        if (sharing) {
          state.screenSharer = id;
          console.log('[Participants] Screen sharing started:', id);
        } else if (state.screenSharer === id) {
          state.screenSharer = null;
          console.log('[Participants] Screen sharing stopped:', id);
        }
      }
    },
    
    /**
     * Raise/lower hand
     */
    toggleHandRaised: (state, action) => {
      const participant = state.list.find(p => p.id === action.payload);
      if (participant) {
        participant.handRaised = !participant.handRaised;
        console.log('[Participants] Hand raised toggled:', participant.id, participant.handRaised);
      }
    },
    
    /**
     * Set participant speaking
     */
    setParticipantSpeaking: (state, action) => {
      const { id, speaking, audioLevel } = action.payload;
      const participant = state.list.find(p => p.id === id);
      
      if (participant) {
        participant.speaking = speaking;
        if (audioLevel !== undefined) {
          participant.audioLevel = audioLevel;
        }
        
        // Update active speaker
        if (speaking && audioLevel > 0.3) {
          state.activeSpeaker = id;
        } else if (state.activeSpeaker === id && !speaking) {
          state.activeSpeaker = null;
        }
      }
    },
    
    /**
     * Set active speaker
     */
    setActiveSpeaker: (state, action) => {
      state.activeSpeaker = action.payload;
    },
    
    /**
     * Update participant status
     */
    updateParticipantStatus: (state, action) => {
      const { id, status } = action.payload;
      const participant = state.list.find(p => p.id === id);
      
      if (participant) {
        participant.status = status;
        console.log('[Participants] Status updated:', id, status);
      }
    },
    
    /**
     * Update participant role
     */
    updateParticipantRole: (state, action) => {
      const { id, role } = action.payload;
      const participant = state.list.find(p => p.id === id);
      
      if (participant) {
        participant.role = role;
        console.log('[Participants] Role updated:', id, role);
      }
    },
    
    /**
     * Set participant filter
     */
    setParticipantFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    
    /**
     * Set view mode
     */
    setViewMode: (state, action) => {
      state.view = action.payload;
      console.log('[Participants] View mode changed:', action.payload);
    },
    
    /**
     * Clear all participants
     */
    clearParticipants: (state) => {
      state.list = [];
      state.activeSpeaker = null;
      state.screenSharer = null;
      console.log('[Participants] All participants cleared');
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
  addParticipant,
  removeParticipant,
  updateParticipant,
  setCurrentUserId,
  toggleParticipantAudio,
  toggleParticipantVideo,
  setParticipantAudio,
  setParticipantVideo,
  setParticipantScreenSharing,
  toggleHandRaised,
  setParticipantSpeaking,
  setActiveSpeaker,
  updateParticipantStatus,
  updateParticipantRole,
  setParticipantFilter,
  setViewMode,
  clearParticipants,
  setLoading,
  setError
} = participantsSlice.actions;

// Selectors
export const selectParticipants = (state) => state.participants.list;
export const selectCurrentUserId = (state) => state.participants.currentUserId;
export const selectActiveSpeaker = (state) => state.participants.activeSpeaker;
export const selectScreenSharer = (state) => state.participants.screenSharer;
export const selectParticipantFilter = (state) => state.participants.filter;
export const selectViewMode = (state) => state.participants.view;
export const selectParticipantsLoading = (state) => state.participants.loading;
export const selectParticipantsError = (state) => state.participants.error;

// Count selectors
export const selectParticipantCount = (state) => state.participants.list.length;

export const selectOnlineParticipantCount = (state) =>
  state.participants.list.filter(p => p.status === 'online').length;

// Status selectors
export const selectOnlineParticipants = (state) =>
  state.participants.list.filter(p => p.status === 'online');

export const selectAwayParticipants = (state) =>
  state.participants.list.filter(p => p.status === 'away');

export const selectBusyParticipants = (state) =>
  state.participants.list.filter(p => p.status === 'busy');

// Media selectors
export const selectParticipantsWithAudio = (state) =>
  state.participants.list.filter(p => p.audioEnabled);

export const selectParticipantsWithVideo = (state) =>
  state.participants.list.filter(p => p.videoEnabled);

export const selectSpeakingParticipants = (state) =>
  state.participants.list.filter(p => p.speaking);

export const selectHandRaisedParticipants = (state) =>
  state.participants.list.filter(p => p.handRaised);

// Role selectors
export const selectHosts = (state) =>
  state.participants.list.filter(p => p.role === 'host');

export const selectModerators = (state) =>
  state.participants.list.filter(p => p.role === 'moderator');

// Individual selectors
export const selectParticipantById = (state, participantId) =>
  state.participants.list.find(p => p.id === participantId);

export const selectCurrentUser = (state) =>
  state.participants.list.find(p => p.id === state.participants.currentUserId);

export const selectActiveSpeakerParticipant = (state) =>
  state.participants.list.find(p => p.id === state.participants.activeSpeaker);

export const selectScreenSharerParticipant = (state) =>
  state.participants.list.find(p => p.id === state.participants.screenSharer);

// Filtered selectors
export const selectFilteredParticipants = (state) => {
  const { list, filter } = state.participants;
  let participants = [...list];
  
  // Filter by status
  if (filter.status !== 'all') {
    participants = participants.filter(p => p.status === filter.status);
  }
  
  // Filter by search
  if (filter.search) {
    const search = filter.search.toLowerCase();
    participants = participants.filter(p =>
      p.name?.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search)
    );
  }
  
  return participants;
};

// Export reducer
export default participantsSlice.reducer;
