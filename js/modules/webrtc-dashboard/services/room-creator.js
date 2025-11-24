// Room Creator Module
// Handles room creation logic

import { Utils } from '../utils.js';

export class RoomCreator {
    constructor(roomState, broadcaster) {
        this.roomState = roomState;
        this.broadcaster = broadcaster;
    }
    
    /**
     * Create a new room
     * @param {Object} roomData - Room configuration
     * @returns {Object} Created room object
     */
    async createRoom(roomData) {
        const room = {
            id: this._generateRoomId(),
            ...roomData,
            createdAt: new Date(),
            participants: [],
            status: 'active'
        };
        
        console.log('[RoomCreator] Creating room:', room.name);
        
        try {
            // Store room in state
            this.roomState.addRoom(room);
            this.roomState.addLocalRoom(room.id);
            
            // CRITICAL: Add host to participants list immediately
            // This ensures duplicate username validation works for the host
            if (roomData.hostId && roomData.host) {
                const hostParticipant = {
                    id: roomData.hostId,
                    name: roomData.host,
                    joinedAt: new Date(),
                    isHost: true
                };
                this.roomState.addParticipantToRoom(room.id, hostParticipant);
                console.log('[RoomCreator] ✅ Added host to participants:', roomData.host);
            }
            
            // Broadcast room creation to network
            console.log('[RoomCreator] 📢 Broadcasting room-created for:', room.name);
            await this.broadcaster.broadcastRoomCreated(this._sanitizeRoom(room));
            
            console.log('[RoomCreator] ✅ Room creation complete');
            return room;
            
        } catch (error) {
            console.error('[RoomCreator] Failed to create room:', error);
            // Cleanup on failure
            this.roomState.removeRoom(room.id);
            throw error;
        }
    }
    
    /**
     * Generate unique room ID
     * @private
     */
    _generateRoomId() {
        return Utils.generateId('room');
    }
    
    /**
     * Remove sensitive data before broadcasting
     * @private
     */
    _sanitizeRoom(room) {
        return {
            id: room.id,
            name: room.name,
            description: room.description,
            host: room.host,
            createdAt: room.createdAt,
            status: room.status,
            participantCount: room.participants.length
        };
    }
}
