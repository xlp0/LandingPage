// Use Redux Toolkit from global window.RTK (loaded via CDN)
// Wait for RTK to be available if not loaded yet
if (!window.RTK) {
    throw new Error('Redux Toolkit (window.RTK) not loaded! Make sure the CDN script loads before this module.');
}
const { createSlice } = window.RTK;

const initialState = {
  peers: {},
  localStream: null,
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  connectionStatus: 'idle',
  error: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    addPeer: (state, action) => {
      state.peers[action.payload.peerId] = {
        status: 'connecting',
        ...action.payload,
      };
    },
    removePeer: (state, action) => {
      delete state.peers[action.payload];
    },
    updatePeerStatus: (state, action) => {
      const { peerId, status } = action.payload;
      if (state.peers[peerId]) {
        state.peers[peerId].status = status;
      }
    },
    setLocalStream: (state, action) => {
      state.localStream = action.payload;
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
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  addPeer,
  removePeer,
  updatePeerStatus,
  setLocalStream,
  toggleAudio,
  toggleVideo,
  toggleScreenShare,
  setConnectionStatus,
  setError,
} = connectionSlice.actions;

export default connectionSlice.reducer;
