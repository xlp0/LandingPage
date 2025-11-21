// Room State Management
// Handles room data storage and state transitions

export class RoomState {
    constructor() {
        this.rooms = new Map();        // roomId -> room data
        this.localRooms = new Set();   // rooms created by this client
        this.roomConnectionManagers = new Map(); // roomId -> RoomConnectionManager
    }
    
    // Room CRUD operations
    addRoom(room) {
        this.rooms.set(room.id, room);
        console.log('[RoomState] Added room:', room.id);
    }
    
    addLocalRoom(roomId) {
        this.localRooms.add(roomId);
        console.log('[RoomState] Marked room as local:', roomId);
    }
    
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    
    getActiveRooms() {
        return Array.from(this.rooms.values()).filter(room => room.status === 'active');
    }
    
    removeRoom(roomId) {
        const room = this.rooms.get(roomId);
        this.rooms.delete(roomId);
        this.localRooms.delete(roomId);
        console.log('[RoomState] Removed room:', roomId);
        return room;
    }
    
    isLocalRoom(roomId) {
        return this.localRooms.has(roomId);
    }
    
    // Participant management
    addParticipantToRoom(roomId, participant) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        
        room.participants.push(participant);
        console.log('[RoomState] Added participant to room:', participant.name);
    }
    
    getExistingParticipants(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return [];
        }
        
        return room.participants.slice(); // Return copy
    }
    
    removeParticipantFromRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        
        room.participants = room.participants.filter(p => p.id !== userId);
        console.log('[RoomState] Removed participant from room:', userId);
    }
    
    // Connection manager registry
    setConnectionManager(roomId, manager) {
        console.log('[RoomState] 🔧 Setting connection manager for room:', roomId);
        console.log('[RoomState] 📦 Manager object:', manager ? 'exists' : 'null');
        this.roomConnectionManagers.set(roomId, manager);
        console.log('[RoomState] ✅ Connection manager set. Total rooms:', this.roomConnectionManagers.size);
        console.log('[RoomState] 📋 All rooms with managers:', Array.from(this.roomConnectionManagers.keys()));
    }
    
    getConnectionManager(roomId) {
        const manager = this.roomConnectionManagers.get(roomId);
        console.log('[RoomState] 🔍 Getting connection manager for room:', roomId, '→', manager ? 'FOUND' : 'NOT FOUND');
        console.log('[RoomState] 📋 Available rooms:', Array.from(this.roomConnectionManagers.keys()));
        return manager;
    }
    
    removeConnectionManager(roomId) {
        const manager = this.roomConnectionManagers.get(roomId);
        this.roomConnectionManagers.delete(roomId);
        return manager;
    }
    
    // Statistics
    getRoomCount() {
        return this.rooms.size;
    }
    
    getLocalRoomCount() {
        return this.localRooms.size;
    }
    
    clear() {
        this.rooms.clear();
        this.localRooms.clear();
        this.roomConnectionManagers.clear();
        console.log('[RoomState] Cleared all state');
    }
}
