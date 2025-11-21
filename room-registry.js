/**
 * Room Registry Module
 * Manages server-side room state and participant tracking
 */

class RoomRegistry {
    constructor() {
        this.rooms = new Map();           // roomId -> room data
        this.userRooms = new Map();       // userId -> Set<roomId>
    }

    /**
     * Create a new room
     */
    createRoom(roomData) {
        const room = {
            id: roomData.id,
            name: roomData.name,
            description: roomData.description || '',
            host: roomData.host,
            hostId: roomData.hostId,
            createdAt: roomData.createdAt || new Date().toISOString(),
            participants: new Set()
        };

        this.rooms.set(room.id, room);
        console.log(`[RoomRegistry] 🏠 Room created: ${room.name} (${room.id})`);
        console.log(`[RoomRegistry] Total rooms: ${this.rooms.size}`);
        
        return room;
    }

    /**
     * Add user to room
     */
    addUserToRoom(roomId, userId, userName) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`[RoomRegistry] ❌ Room not found: ${roomId}`);
            return null;
        }

        // Check if user already in room
        const exists = Array.from(room.participants).some(p => p.id === userId);
        if (!exists) {
            room.participants.add({ id: userId, name: userName });
            console.log(`[RoomRegistry] ✅ Added user to room: ${userName}`);
        } else {
            console.log(`[RoomRegistry] ℹ️ User already in room: ${userName}`);
        }

        // Track user's rooms
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId).add(roomId);

        console.log(`[RoomRegistry] 👤 ${userName} in room ${room.name} (${room.participants.size} total)`);
        
        return room;
    }

    /**
     * Remove user from room
     */
    removeUserFromRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return null;
        }

        // Remove user from room
        room.participants = new Set(
            Array.from(room.participants).filter(p => p.id !== userId)
        );

        // Remove room from user's rooms
        if (this.userRooms.has(userId)) {
            this.userRooms.get(userId).delete(roomId);
        }

        console.log(`[RoomRegistry] 👋 User left room ${room.name} (${room.participants.size} remaining)`);

        // If room is empty, remove it
        if (room.participants.size === 0) {
            this.rooms.delete(roomId);
            console.log(`[RoomRegistry] 🗑️ Removed empty room: ${room.name}`);
        }

        return room;
    }

    /**
     * Get all rooms as array
     */
    getAllRooms() {
        console.log('[RoomRegistry] getAllRooms called, rooms.size:', this.rooms.size);
        const roomArray = Array.from(this.rooms.values()).map(room => {
            console.log('[RoomRegistry] Processing room:', room.id, 'participants:', room.participants.size);
            return {
                id: room.id,
                name: room.name,
                description: room.description,
                host: room.host,
                hostId: room.hostId,
                createdAt: room.createdAt,
                participantCount: room.participants.size,
                participants: Array.from(room.participants)
            };
        });
        console.log('[RoomRegistry] Returning', roomArray.length, 'rooms');
        return roomArray;
    }

    /**
     * Get room by ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * Get room count
     */
    getRoomCount() {
        return this.rooms.size;
    }

    /**
     * Clear all rooms
     */
    clear() {
        this.rooms.clear();
        this.userRooms.clear();
        console.log('[RoomRegistry] Cleared all rooms');
    }
}

module.exports = RoomRegistry;
