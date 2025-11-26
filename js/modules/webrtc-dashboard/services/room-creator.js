// Room Creator Module
// Handles room creation logic

import { Utils } from '../utils.js';

export class RoomCreator {
    constructor(roomState, broadcaster, reduxStore = null) {
        this.roomState = roomState;
        this.broadcaster = broadcaster;
        this.store = reduxStore;
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
            createdAt: new Date().toISOString(), // Convert to ISO string for Redux serialization
            participants: [],
            status: 'active'
        };
        
        console.log('[RoomCreator] Creating room:', room.name);
        
        try {
            // Store room in state
            this.roomState.addRoom(room);
            this.roomState.addLocalRoom(room.id);
            
            // Dispatch to Redux
            if (this.store && window.reduxStore) {
                const state = window.reduxStore.getState();
                // Import actions dynamically (from shared store at root level)
                import('../../../store/roomsSlice.js').then(module => {
                    this.store.dispatch(module.addRoom(room));
                    this.store.dispatch(module.markRoomAsLocal(room.id));
                    console.log('[RoomCreator] ✅ Redux: Room added to store');
                });
            }
            
            // CRITICAL: Add host to participants list immediately
            // This ensures duplicate username validation works for the host
            if (roomData.hostId && roomData.host) {
                const hostParticipant = {
                    id: roomData.hostId,
                    name: roomData.host,
                    joinedAt: new Date().toISOString(), // Convert to ISO string for Redux serialization
                    isHost: true
                };
                this.roomState.addParticipantToRoom(room.id, hostParticipant);
                console.log('[RoomCreator] ✅ Added host to participants:', roomData.host);
                
                // Dispatch to Redux
                if (this.store && window.reduxStore) {
                    import('../../../store/roomsSlice.js').then(module => {
                        this.store.dispatch(module.addParticipant({ 
                            roomId: room.id, 
                            participant: hostParticipant 
                        }));
                        console.log('[RoomCreator] ✅ Redux: Host participant added');
                    });
                }
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
