/**
 * RoomMessageHandler - Server-side room message handling
 * Processes room-related messages and coordinates with RoomRegistry
 */
class RoomMessageHandler {
    constructor(roomRegistry, broadcastRoomListCallback, clientConnections) {
        this.roomRegistry = roomRegistry;
        this.broadcastRoomList = broadcastRoomListCallback;
        this.clientConnections = clientConnections;
    }

    /**
     * Handle incoming room messages
     * Returns true if message was handled, false otherwise
     */
    handle(data, ws) {
        try {
            // Handle room creation
            if (data.type === 'create-room') {
                return this._handleCreateRoom(data, ws);
            }

            // Handle user joining room
            if (data.type === 'user-joined-room') {
                return this._handleUserJoinedRoom(data, ws);
            }

            // Handle user leaving room
            if (data.type === 'user-left-room') {
                return this._handleUserLeftRoom(data, ws);
            }

            // Handle room removal
            if (data.type === 'room-removed') {
                return this._handleRoomRemoved(data, ws);
            }

            return false; // Not a room message
        } catch (error) {
            console.error('[RoomMessageHandler] Error handling message:', error);
            return false;
        }
    }

    /**
     * Handle room creation
     */
    _handleCreateRoom(data, ws) {
        try {
            const { roomId, roomName, description, hostId, hostName, maxParticipants, requireApproval } = data;

            if (!roomId || !roomName || !hostId) {
                console.error('[RoomMessageHandler] Invalid room creation data');
                return false;
            }

            // Create room in registry
            this.roomRegistry.createRoom({
                id: roomId,
                name: roomName,
                description: description,
                host: hostName,
                hostId: hostId,
                maxParticipants: maxParticipants || 10,
                requireApproval: requireApproval || false
            });

            // Add host as first participant
            this.roomRegistry.addUserToRoom(roomId, hostId, {
                name: hostName,
                id: hostId
            });

            // Broadcast updated room list
            this.broadcastRoomList();

            console.log(`[RoomMessageHandler] ✅ Room created: ${roomName}`);
            return true;
        } catch (error) {
            console.error('[RoomMessageHandler] Error creating room:', error);
            return false;
        }
    }

    /**
     * Handle user joining room
     */
    _handleUserJoinedRoom(data, ws) {
        try {
            const { roomId, userId, userName } = data;

            if (!roomId || !userId || !userName) {
                console.error('[RoomMessageHandler] Invalid user join data');
                return false;
            }

            const room = this.roomRegistry.getRoom(roomId);
            if (!room) {
                console.error(`[RoomMessageHandler] Room ${roomId} not found`);
                return false;
            }

            // Check for duplicate username
            const duplicateUser = Array.from(room.participants.values()).find(p =>
                p.name.toLowerCase() === userName.toLowerCase()
            );

            if (duplicateUser) {
                console.warn(`[RoomMessageHandler] ⚠️ Duplicate username: ${userName} in room ${roomId}`);
                // Send error back to client - REJECT the join
                ws.send(JSON.stringify({
                    type: 'join-rejected',
                    channel: 'webrtc-dashboard-rooms',
                    message: `Username "${userName}" already exists in this room. Please choose a different name.`,
                    roomId: roomId,
                    userId: userId,
                    reason: 'DUPLICATE_USERNAME'
                }));
                console.error(`[RoomMessageHandler] ❌ REJECTED join: ${userName} - duplicate username in room ${roomId}`);
                return true;
            }

            // Add user to room
            this.roomRegistry.addUserToRoom(roomId, userId, {
                name: userName,
                id: userId
            });

            // Track user in connection
            if (this.clientConnections.has(ws.clientId)) {
                const connection = this.clientConnections.get(ws.clientId);
                connection.userId = userId;
                connection.rooms.add(roomId);
            }

            // Broadcast updated room list
            this.broadcastRoomList();

            console.log(`[RoomMessageHandler] ✅ User ${userName} joined room ${roomId}`);
            return true;
        } catch (error) {
            console.error('[RoomMessageHandler] Error handling user join:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
            return true;
        }
    }

    /**
     * Handle user leaving room
     */
    _handleUserLeftRoom(data, ws) {
        try {
            const { roomId, userId } = data;

            if (!roomId || !userId) {
                console.error('[RoomMessageHandler] Invalid user leave data');
                return false;
            }

            this.roomRegistry.removeUserFromRoom(roomId, userId);

            // Update connection tracking
            if (this.clientConnections.has(ws.clientId)) {
                const connection = this.clientConnections.get(ws.clientId);
                connection.rooms.delete(roomId);
            }

            // Broadcast updated room list
            this.broadcastRoomList();

            console.log(`[RoomMessageHandler] ✅ User left room ${roomId}`);
            return true;
        } catch (error) {
            console.error('[RoomMessageHandler] Error handling user leave:', error);
            return false;
        }
    }

    /**
     * Handle room removal
     */
    _handleRoomRemoved(data, ws) {
        try {
            const { roomId } = data;

            if (!roomId) {
                console.error('[RoomMessageHandler] Invalid room removal data');
                return false;
            }

            const room = this.roomRegistry.getRoom(roomId);
            if (room) {
                // Remove all users from room
                room.participants.clear();
                // This will trigger room deletion in removeUserFromRoom
                this.roomRegistry.removeUserFromRoom(roomId, null);
            }

            // Broadcast updated room list
            this.broadcastRoomList();

            console.log(`[RoomMessageHandler] ✅ Room removed: ${roomId}`);
            return true;
        } catch (error) {
            console.error('[RoomMessageHandler] Error removing room:', error);
            return false;
        }
    }
}

module.exports = RoomMessageHandler;
