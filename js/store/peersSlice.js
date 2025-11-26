// Use Redux Toolkit from global window.RTK (loaded via CDN)
if (!window.RTK) {
    throw new Error('Redux Toolkit (window.RTK) not loaded! Make sure the CDN script loads before this module.');
}
const { createSlice } = window.RTK;

// Initial State
const initialState = {
    peers: {}, // { peerId: { id, userId, userName, roomId, status, connectionState, iceConnectionState, ... } }
    localStream: null,
    audioEnabled: true,
    videoEnabled: true,
    screenSharing: false,
    error: null,
};

// Peers Slice
const peersSlice = createSlice({
    name: 'peers',
    initialState,
    reducers: {
        // Add or update a peer
        addPeer: (state, action) => {
            const peer = action.payload;
            state.peers[peer.id] = {
                ...state.peers[peer.id],
                ...peer,
                status: peer.status || 'connecting',
                connectionState: peer.connectionState || 'new',
                iceConnectionState: peer.iceConnectionState || 'new',
                addedAt: peer.addedAt || Date.now(),
            };
        },

        // Remove a peer
        removePeer: (state, action) => {
            const peerId = action.payload;
            delete state.peers[peerId];
        },

        // Update peer connection state
        updatePeerConnectionState: (state, action) => {
            const { peerId, connectionState, iceConnectionState } = action.payload;
            const peer = state.peers[peerId];
            if (peer) {
                if (connectionState !== undefined) peer.connectionState = connectionState;
                if (iceConnectionState !== undefined) peer.iceConnectionState = iceConnectionState;
                
                // Update status based on connection state
                if (connectionState === 'connected') {
                    peer.status = 'connected';
                } else if (connectionState === 'failed' || connectionState === 'closed') {
                    peer.status = 'disconnected';
                } else if (connectionState === 'connecting') {
                    peer.status = 'connecting';
                }
            }
        },

        // Update peer status
        updatePeerStatus: (state, action) => {
            const { peerId, status } = action.payload;
            const peer = state.peers[peerId];
            if (peer) {
                peer.status = status;
            }
        },

        // Set local stream
        setLocalStream: (state, action) => {
            state.localStream = action.payload;
        },

        // Toggle audio
        toggleAudio: (state) => {
            state.audioEnabled = !state.audioEnabled;
        },

        // Set audio enabled
        setAudioEnabled: (state, action) => {
            state.audioEnabled = action.payload;
        },

        // Toggle video
        toggleVideo: (state) => {
            state.videoEnabled = !state.videoEnabled;
        },

        // Set video enabled
        setVideoEnabled: (state, action) => {
            state.videoEnabled = action.payload;
        },

        // Toggle screen sharing
        toggleScreenSharing: (state) => {
            state.screenSharing = !state.screenSharing;
        },

        // Set screen sharing
        setScreenSharing: (state, action) => {
            state.screenSharing = action.payload;
        },

        // Clear all peers
        clearPeers: (state) => {
            state.peers = {};
        },

        // Clear all (reset to initial state)
        clearAll: (state) => {
            state.peers = {};
            state.localStream = null;
            state.audioEnabled = true;
            state.videoEnabled = true;
            state.screenSharing = false;
            state.error = null;
        },

        // Set error
        setError: (state, action) => {
            state.error = action.payload;
        },

        // Clear error
        clearError: (state) => {
            state.error = null;
        },
    },
});

// Actions
export const {
    addPeer,
    removePeer,
    updatePeerConnectionState,
    updatePeerStatus,
    setLocalStream,
    toggleAudio,
    setAudioEnabled,
    toggleVideo,
    setVideoEnabled,
    toggleScreenSharing,
    setScreenSharing,
    clearPeers,
    clearAll,
    setError,
    clearError,
} = peersSlice.actions;

// Selectors
export const selectAllPeers = (state) => Object.values(state.peers.peers);
export const selectPeer = (peerId) => (state) => state.peers.peers[peerId];
export const selectConnectedPeers = (state) => Object.values(state.peers.peers).filter(p => p.status === 'connected');
export const selectPeersByRoom = (roomId) => (state) => Object.values(state.peers.peers).filter(p => p.roomId === roomId);
export const selectLocalStream = (state) => state.peers.localStream;
export const selectAudioEnabled = (state) => state.peers.audioEnabled;
export const selectVideoEnabled = (state) => state.peers.videoEnabled;
export const selectScreenSharing = (state) => state.peers.screenSharing;
export const selectPeersError = (state) => state.peers.error;
export const selectPeerCount = (state) => Object.keys(state.peers.peers).length;
export const selectConnectedPeerCount = (state) => Object.values(state.peers.peers).filter(p => p.status === 'connected').length;

// Export reducer
export default peersSlice.reducer;
