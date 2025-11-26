/**
 * RTC Connection Slice - WebRTC Peer Connections & Status
 * 
 * Manages WebRTC peer connections, connection status, media streams, and connection statistics
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Peer connections map: { peerId: connectionData }
  peers: {},
  
  // Local media stream
  localStream: null,
  
  // Local media settings
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  
  // Connection status
  connectionStatus: 'idle', // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
  
  // ICE connection states
  iceConnectionState: 'new', // 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed'
  
  // Signaling state
  signalingState: 'stable', // 'stable' | 'have-local-offer' | 'have-remote-offer' | 'have-local-pranswer' | 'have-remote-pranswer' | 'closed'
  
  // Connection quality
  connectionQuality: 'good', // 'excellent' | 'good' | 'fair' | 'poor'
  
  // Statistics
  stats: {
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    packetsLost: 0,
    jitter: 0,
    roundTripTime: 0
  },
  
  // Error
  error: null
};

const rtcConnectionSlice = createSlice({
  name: 'rtcConnection',
  initialState,
  reducers: {
    /**
     * Add peer connection
     */
    addPeerConnection: (state, action) => {
      const { peerId, ...connectionData } = action.payload;
      
      state.peers[peerId] = {
        peerId,
        connectionState: 'new',
        iceConnectionState: 'new',
        signalingState: 'stable',
        remoteStream: null,
        dataChannel: null,
        connectedAt: null,
        lastActivity: Date.now(),
        stats: {
          bytesSent: 0,
          bytesReceived: 0,
          packetsSent: 0,
          packetsReceived: 0,
          packetsLost: 0,
          jitter: 0,
          roundTripTime: 0
        },
        ...connectionData
      };
      
      console.log('[RTC] Peer connection added:', peerId);
    },
    
    /**
     * Remove peer connection
     */
    removePeerConnection: (state, action) => {
      const peerId = action.payload;
      delete state.peers[peerId];
      console.log('[RTC] Peer connection removed:', peerId);
    },
    
    /**
     * Update peer connection
     */
    updatePeerConnection: (state, action) => {
      const { peerId, ...updates } = action.payload;
      
      if (state.peers[peerId]) {
        Object.assign(state.peers[peerId], updates);
        state.peers[peerId].lastActivity = Date.now();
      }
    },
    
    /**
     * Set peer connection state
     */
    setPeerConnectionState: (state, action) => {
      const { peerId, connectionState } = action.payload;
      
      if (state.peers[peerId]) {
        state.peers[peerId].connectionState = connectionState;
        
        if (connectionState === 'connected' && !state.peers[peerId].connectedAt) {
          state.peers[peerId].connectedAt = Date.now();
        }
        
        console.log('[RTC] Peer connection state:', peerId, connectionState);
      }
    },
    
    /**
     * Set peer ICE connection state
     */
    setPeerIceConnectionState: (state, action) => {
      const { peerId, iceConnectionState } = action.payload;
      
      if (state.peers[peerId]) {
        state.peers[peerId].iceConnectionState = iceConnectionState;
        console.log('[RTC] Peer ICE connection state:', peerId, iceConnectionState);
      }
    },
    
    /**
     * Set peer signaling state
     */
    setPeerSignalingState: (state, action) => {
      const { peerId, signalingState } = action.payload;
      
      if (state.peers[peerId]) {
        state.peers[peerId].signalingState = signalingState;
      }
    },
    
    /**
     * Set peer remote stream
     */
    setPeerRemoteStream: (state, action) => {
      const { peerId, streamId } = action.payload;
      
      if (state.peers[peerId]) {
        state.peers[peerId].remoteStream = streamId;
        console.log('[RTC] Peer remote stream set:', peerId, streamId);
      }
    },
    
    /**
     * Set peer data channel
     */
    setPeerDataChannel: (state, action) => {
      const { peerId, channelId } = action.payload;
      
      if (state.peers[peerId]) {
        state.peers[peerId].dataChannel = channelId;
        console.log('[RTC] Peer data channel set:', peerId, channelId);
      }
    },
    
    /**
     * Update peer statistics
     */
    updatePeerStats: (state, action) => {
      const { peerId, stats } = action.payload;
      
      if (state.peers[peerId]) {
        state.peers[peerId].stats = { ...state.peers[peerId].stats, ...stats };
      }
    },
    
    /**
     * Set local stream
     */
    setLocalStream: (state, action) => {
      state.localStream = action.payload;
      console.log('[RTC] Local stream set:', action.payload);
    },
    
    /**
     * Toggle local audio
     */
    toggleLocalAudio: (state) => {
      state.audioEnabled = !state.audioEnabled;
      console.log('[RTC] Local audio toggled:', state.audioEnabled);
    },
    
    /**
     * Toggle local video
     */
    toggleLocalVideo: (state) => {
      state.videoEnabled = !state.videoEnabled;
      console.log('[RTC] Local video toggled:', state.videoEnabled);
    },
    
    /**
     * Set local audio enabled
     */
    setLocalAudio: (state, action) => {
      state.audioEnabled = action.payload;
      console.log('[RTC] Local audio set:', action.payload);
    },
    
    /**
     * Set local video enabled
     */
    setLocalVideo: (state, action) => {
      state.videoEnabled = action.payload;
      console.log('[RTC] Local video set:', action.payload);
    },
    
    /**
     * Set screen sharing
     */
    setScreenSharing: (state, action) => {
      state.screenSharing = action.payload;
      console.log('[RTC] Screen sharing:', action.payload);
    },
    
    /**
     * Set connection status
     */
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
      console.log('[RTC] Connection status:', action.payload);
    },
    
    /**
     * Set ICE connection state
     */
    setIceConnectionState: (state, action) => {
      state.iceConnectionState = action.payload;
      console.log('[RTC] ICE connection state:', action.payload);
    },
    
    /**
     * Set signaling state
     */
    setSignalingState: (state, action) => {
      state.signalingState = action.payload;
    },
    
    /**
     * Set connection quality
     */
    setConnectionQuality: (state, action) => {
      state.connectionQuality = action.payload;
    },
    
    /**
     * Update global statistics
     */
    updateStats: (state, action) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    
    /**
     * Clear all peer connections
     */
    clearPeerConnections: (state) => {
      state.peers = {};
      console.log('[RTC] All peer connections cleared');
    },
    
    /**
     * Reset RTC state
     */
    resetRtcState: (state) => {
      state.peers = {};
      state.localStream = null;
      state.audioEnabled = true;
      state.videoEnabled = true;
      state.screenSharing = false;
      state.connectionStatus = 'idle';
      state.iceConnectionState = 'new';
      state.signalingState = 'stable';
      state.connectionQuality = 'good';
      state.stats = {
        bytesSent: 0,
        bytesReceived: 0,
        packetsSent: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitter: 0,
        roundTripTime: 0
      };
      state.error = null;
      console.log('[RTC] State reset');
    },
    
    /**
     * Set error
     */
    setError: (state, action) => {
      state.error = action.payload;
      console.error('[RTC] Error:', action.payload);
    }
  }
});

// Export actions
export const {
  addPeerConnection,
  removePeerConnection,
  updatePeerConnection,
  setPeerConnectionState,
  setPeerIceConnectionState,
  setPeerSignalingState,
  setPeerRemoteStream,
  setPeerDataChannel,
  updatePeerStats,
  setLocalStream,
  toggleLocalAudio,
  toggleLocalVideo,
  setLocalAudio,
  setLocalVideo,
  setScreenSharing,
  setConnectionStatus,
  setIceConnectionState,
  setSignalingState,
  setConnectionQuality,
  updateStats,
  clearPeerConnections,
  resetRtcState,
  setError
} = rtcConnectionSlice.actions;

// Selectors
export const selectPeers = (state) => state.rtcConnection.peers;
export const selectLocalStream = (state) => state.rtcConnection.localStream;
export const selectAudioEnabled = (state) => state.rtcConnection.audioEnabled;
export const selectVideoEnabled = (state) => state.rtcConnection.videoEnabled;
export const selectScreenSharing = (state) => state.rtcConnection.screenSharing;
export const selectConnectionStatus = (state) => state.rtcConnection.connectionStatus;
export const selectIceConnectionState = (state) => state.rtcConnection.iceConnectionState;
export const selectSignalingState = (state) => state.rtcConnection.signalingState;
export const selectConnectionQuality = (state) => state.rtcConnection.connectionQuality;
export const selectRtcStats = (state) => state.rtcConnection.stats;
export const selectRtcError = (state) => state.rtcConnection.error;

// Peer selectors
export const selectPeerCount = (state) => Object.keys(state.rtcConnection.peers).length;

export const selectPeerById = (state, peerId) => state.rtcConnection.peers[peerId];

export const selectConnectedPeers = (state) =>
  Object.values(state.rtcConnection.peers).filter(
    peer => peer.connectionState === 'connected'
  );

export const selectConnectedPeerCount = (state) =>
  Object.values(state.rtcConnection.peers).filter(
    peer => peer.connectionState === 'connected'
  ).length;

export const selectDisconnectedPeers = (state) =>
  Object.values(state.rtcConnection.peers).filter(
    peer => peer.connectionState === 'disconnected' || peer.connectionState === 'failed'
  );

// Connection quality selectors
export const selectIsConnected = (state) =>
  state.rtcConnection.connectionStatus === 'connected';

export const selectIsConnecting = (state) =>
  state.rtcConnection.connectionStatus === 'connecting';

export const selectHasGoodConnection = (state) =>
  state.rtcConnection.connectionQuality === 'excellent' ||
  state.rtcConnection.connectionQuality === 'good';

// Media selectors
export const selectHasLocalStream = (state) => !!state.rtcConnection.localStream;

export const selectIsAudioMuted = (state) => !state.rtcConnection.audioEnabled;

export const selectIsVideoOff = (state) => !state.rtcConnection.videoEnabled;

export const selectIsScreenSharing = (state) => state.rtcConnection.screenSharing;

// Export reducer
export default rtcConnectionSlice.reducer;
