/**
 * Room Message Handler (Server-side)
 * Processes room management messages from clients
 */

class RoomMessageHandler {
    constructor(roomRegistry, broadcastRoomList, clientConnections) {
        this.roomRegistry = roomRegistry;
        this.broadcastRoomList = broadcastRoomList;
        this.clientConnections = clientConnections;
    }

    /**
     * Handle incoming message
     */
    handle(data, ws) {
        const { type, channel } = data;

        // Only handle webrtc-dashboard-rooms channel
        if (channel !== 'webrtc-dashboard-rooms') {
            return false; // Let other handlers process
        }

        switch (type) {
            case 'room-created':
                return this._handleRoomCreated(data, ws);
            
            case 'user-joined-room':
                return this._handleUserJoined(data, ws);
            
            case 'user-left-room':
                return this._handleUserLeft(data, ws);
            
            case 'room-list-request':
                return this._handleRoomListRequest(data);
            
            default:
                return false;
        }
    }

    /**
     * Handle room creation
     * @private
     */
    _handleRoomCreated(data) {
        const roomData = data.data || data;
        
        try {
            console.log('[RoomMessageHandler] 🏠 Creating room:', roomData.name);
            this.roomRegistry.createRoom(roomData);
            console.log('[RoomMessageHandler] 📡 Broadcasting room list after creation');
            this.broadcastRoomList();
            console.log('[RoomMessageHandler] ✅ Room creation handled');
            return true; // Handled - don't relay
        } catch (error) {
            console.error('[RoomMessageHandler] Error creating room:', error);
            return true; // Still handled, just with error
        }
    }

    /**
     * Handle user joining room
     * @private
     */
    _handleUserJoined(data, ws) {
        const messageData = data.data || data;
        const { roomId, userId, userName } = messageData;

        console.log(`[RoomMessageHandler] 📨 User join request:`, { roomId, userId, userName });

        try {
            const room = this.roomRegistry.addUserToRoom(roomId, userId, userName);
            if (room) {
                // Track this connection
                const clientId = ws.clientId;
                if (clientId && this.clientConnections.has(clientId)) {
                    const connection = this.clientConnections.get(clientId);
                    connection.userId = userId;
                    connection.rooms.add(roomId);
                    console.log(`[RoomMessageHandler] 🔗 Tracked connection: user ${userId} in room ${roomId}`);
                }
                
                this.broadcastRoomList();
                
                // IMPORTANT: Let this message be relayed to clients for WebRTC coordination!
                // Clients need to receive user-joined-room to initiate peer connections
                return false; // Don't handle - allow relay for WebRTC signaling
            }
            return true; // Still handled, just room not found
        } catch (error) {
            console.error('[RoomMessageHandler] Error adding user to room:', error);
            return true;
        }
    }

    /**
     * Handle user leaving room
     * @private
     */
    _handleUserLeft(data) {
        const messageData = data.data || data;
        const { roomId, userId } = messageData;

        console.log(`[RoomMessageHandler] 👋 User leave request:`, { roomId, userId });

        try {
            this.roomRegistry.removeUserFromRoom(roomId, userId);
            this.broadcastRoomList();
            
            // IMPORTANT: Let this message be relayed to clients for WebRTC cleanup!
            // Clients need to receive user-left-room to close peer connections
            return false; // Don't handle - allow relay for WebRTC cleanup
        } catch (error) {
            console.error('[RoomMessageHandler] Error removing user from room:', error);
            return true;
        }
    }

    /**
     * Handle room list request
     * @private
     */
    _handleRoomListRequest(data) {
        console.log(`[RoomMessageHandler] 📋 Room list requested`);
        this.broadcastRoomList();
        return true; // Handled - don't relay
    }
}

module.exports = RoomMessageHandler;
