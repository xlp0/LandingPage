// Room Joiner Module
// Handles room joining logic with existing participants discovery

export class RoomJoiner {
    constructor(roomState, broadcaster) {
        this.roomState = roomState;
        this.broadcaster = broadcaster;
    }
    
    /**
     * Join an existing room
     * @param {string} roomId - Room to join
     * @param {Object} userData - User information
     * @returns {Object} Room object
     */
    async joinRoom(roomId, userData) {
        console.log('[RoomJoiner] 🔥 JOIN ROOM CALLED:', roomId);
        
        const room = this.roomState.getRoom(roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        
        console.log('[RoomJoiner] Joining room:', roomId);
        
        try {
            // CRITICAL: Get existing participants BEFORE adding new user
            const existingParticipants = this.roomState.getExistingParticipants(roomId);
            
            console.log('[RoomJoiner] 👥 Existing participants (BEFORE adding):', existingParticipants.length);
            existingParticipants.forEach(p => {
                console.log('[RoomJoiner]   📍', p.name, '(', p.id, ')');
            });
            
            // NOW add new user to room
            const participant = {
                id: userData.id,
                name: userData.name,
                joinedAt: new Date(),
                isHost: false
            };
            
            this.roomState.addParticipantToRoom(roomId, participant);
            
            // Broadcast join event with existing participants list
            console.log('[RoomJoiner] 📢 Broadcasting user-joined-room:', {
                roomId,
                userId: userData.id,
                userName: userData.name,
                existingCount: existingParticipants.length
            });
            
            await this.broadcaster.broadcastUserJoined({
                roomId,
                userId: userData.id,
                userName: userData.name,
                existingParticipants  // Tell joiner who's already there
            });
            
            console.log('[RoomJoiner] ✅ User joined. Total participants:', room.participants.length);
            
            return room;
            
        } catch (error) {
            console.error('[RoomJoiner] Failed to join room:', error);
            throw error;
        }
    }
    
    /**
     * Leave a room
     * @param {string} roomId - Room to leave
     * @param {string} userId - User leaving
     */
    async leaveRoom(roomId, userId) {
        console.log('[RoomJoiner] Leaving room:', roomId);
        
        try {
            const room = this.roomState.getRoom(roomId);
            if (!room) {
                return;
            }
            
            // Remove user from participants
            this.roomState.removeParticipantFromRoom(roomId, userId);
            
            // If this was a local room and now empty, remove it
            if (this.roomState.isLocalRoom(roomId) && room.participants.length === 0) {
                this.roomState.removeRoom(roomId);
                await this.broadcaster.broadcastRoomRemoved({ roomId });
            } else {
                // Just broadcast that user left
                await this.broadcaster.broadcastUserLeft({ roomId, userId });
            }
            
            console.log('[RoomJoiner] ✅ Left room successfully');
            
        } catch (error) {
            console.error('[RoomJoiner] Failed to leave room:', error);
            throw error;
        }
    }
}
