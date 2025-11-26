// Use Redux Toolkit from global window.RTK (loaded via CDN)
if (!window.RTK) {
    throw new Error('Redux Toolkit (window.RTK) not loaded! Make sure the CDN script loads before this module.');
}
const { createSlice, createAsyncThunk } = window.RTK;

// Initial State
const initialState = {
    rooms: {}, // { roomId: { id, name, description, host, participants: [], createdAt, ... } }
    currentRoomId: null,
    localRooms: [], // Room IDs created by this user
    loading: false,
    error: null,
};

// Rooms Slice
const roomsSlice = createSlice({
    name: 'rooms',
    initialState,
    reducers: {
        // Add or update a room
        addRoom: (state, action) => {
            const room = action.payload;
            state.rooms[room.id] = {
                ...state.rooms[room.id],
                ...room,
                participants: room.participants || [],
            };
        },

        // Remove a room
        removeRoom: (state, action) => {
            const roomId = action.payload;
            delete state.rooms[roomId];
            state.localRooms = state.localRooms.filter(id => id !== roomId);
            if (state.currentRoomId === roomId) {
                state.currentRoomId = null;
            }
        },

        // Mark room as local (created by this user)
        markRoomAsLocal: (state, action) => {
            const roomId = action.payload;
            if (!state.localRooms.includes(roomId)) {
                state.localRooms.push(roomId);
            }
        },

        // Set current room
        setCurrentRoom: (state, action) => {
            state.currentRoomId = action.payload;
        },

        // Add participant to room
        addParticipant: (state, action) => {
            const { roomId, participant } = action.payload;
            const room = state.rooms[roomId];
            if (room) {
                const existingIndex = room.participants.findIndex(p => p.id === participant.id);
                if (existingIndex >= 0) {
                    room.participants[existingIndex] = { ...room.participants[existingIndex], ...participant };
                } else {
                    room.participants.push(participant);
                }
            }
        },

        // Remove participant from room
        removeParticipant: (state, action) => {
            const { roomId, participantId } = action.payload;
            const room = state.rooms[roomId];
            if (room) {
                room.participants = room.participants.filter(p => p.id !== participantId);
            }
        },

        // Update participant status
        updateParticipantStatus: (state, action) => {
            const { roomId, participantId, status } = action.payload;
            const room = state.rooms[roomId];
            if (room) {
                const participant = room.participants.find(p => p.id === participantId);
                if (participant) {
                    participant.status = status;
                }
            }
        },

        // Clear all rooms
        clearRooms: (state) => {
            state.rooms = {};
            state.currentRoomId = null;
            state.localRooms = [];
        },

        // Set loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
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
    addRoom,
    removeRoom,
    markRoomAsLocal,
    setCurrentRoom,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
    clearRooms,
    setLoading,
    setError,
    clearError,
} = roomsSlice.actions;

// Selectors
export const selectAllRooms = (state) => Object.values(state.rooms.rooms);
export const selectRoom = (roomId) => (state) => state.rooms.rooms[roomId];
export const selectCurrentRoom = (state) => {
    const roomId = state.rooms.currentRoomId;
    return roomId ? state.rooms.rooms[roomId] : null;
};
export const selectCurrentRoomId = (state) => state.rooms.currentRoomId;
export const selectLocalRooms = (state) => state.rooms.localRooms.map(id => state.rooms.rooms[id]).filter(Boolean);
export const selectRoomParticipants = (roomId) => (state) => state.rooms.rooms[roomId]?.participants || [];
export const selectIsInRoom = (state) => state.rooms.currentRoomId !== null;
export const selectRoomsLoading = (state) => state.rooms.loading;
export const selectRoomsError = (state) => state.rooms.error;

// Export reducer
export default roomsSlice.reducer;
