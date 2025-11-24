/**
 * RoomRegistry - Server-side room management
 * Tracks all active rooms and their participants
 */
class RoomRegistry {
    constructor() {
        this.rooms = new Map(); // roomId -> room object
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
            createdAt: new Date(),
            participants: new Map(), // userId -> participant
            maxParticipants: roomData.maxParticipants || 10,
            requireApproval: roomData.requireApproval || false
        };

        this.rooms.set(room.id, room);
        console.log(`[RoomRegistry] ✅ Room created: ${room.name} (${room.id})`);
        return room;
    }

    /**
     * Get a room by ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * Get all rooms
     */
    getAllRooms() {
        return Array.from(this.rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            description: room.description,
            host: room.host,
            hostId: room.hostId,
            createdAt: room.createdAt,
            participantCount: room.participants.size,
            participants: Array.from(room.participants.values()),
            maxParticipants: room.maxParticipants,
            requireApproval: room.requireApproval
        }));
    }

    /**
     * Add user to room
     */
    addUserToRoom(roomId, userId, userData) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Room ${roomId} not found`);
        }

        // Check for duplicate username
        const duplicateUser = Array.from(room.participants.values()).find(p =>
            p.name.toLowerCase() === userData.name.toLowerCase()
        );

        if (duplicateUser) {
            throw new Error(`Username "${userData.name}" already exists in this room`);
        }

        room.participants.set(userId, {
            id: userId,
            name: userData.name,
            joinedAt: new Date(),
            isHost: false
        });

        console.log(`[RoomRegistry] ✅ User ${userData.name} added to room ${roomId}`);
        return room;
    }

    /**
     * Remove user from room
     */
    removeUserFromRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }

        const user = room.participants.get(userId);
        if (user) {
            room.participants.delete(userId);
            console.log(`[RoomRegistry] ✅ User ${user.name} removed from room ${roomId}`);
        }

        // Remove empty rooms
        if (room.participants.size === 0) {
            this.rooms.delete(roomId);
            console.log(`[RoomRegistry] 🗑️ Empty room deleted: ${roomId}`);
        }

        return room;
    }

    /**
     * Get room count
     */
    getRoomCount() {
        return this.rooms.size;
    }

    /**
     * Check if room exists
     */
    roomExists(roomId) {
        return this.rooms.has(roomId);
    }

    /**
     * Get participants in a room
     */
    getRoomParticipants(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return [];
        }
        return Array.from(room.participants.values());
    }
}

module.exports = RoomRegistry;
