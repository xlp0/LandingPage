// WebRTC Coordinator Module
// Coordinates WebRTC connection establishment using Perfect Negotiation Pattern

export class WebRTCCoordinator {
    constructor(roomState) {
        this.roomState = roomState;
        this.currentUserId = null;
    }
    
    /**
     * Set current user ID
     * @param {string} userId - Current user's ID
     */
    setUserId(userId) {
        this.currentUserId = userId;
        console.log('[WebRTCCoordinator] Set user ID:', userId);
    }
    
    /**
     * Handle user joined room event
     * Determines who should initiate WebRTC connection
     * @param {Object} data - Join event data
     */
    async handleUserJoined(data) {
        const { roomId, userId, userName } = data;
        
        console.log('[WebRTCCoordinator] 🎯 User joined:', userName);
        console.log('[WebRTCCoordinator] 🔍 Data:', { roomId, userId, userName, currentUserId: this.currentUserId });
        
        // Don't connect to ourselves
        if (userId === this.currentUserId) {
            console.log('[WebRTCCoordinator] Ignoring own join signal');
            return;
        }
        
        console.log('[WebRTCCoordinator] 🔎 Looking for connection manager for room:', roomId);
        
        // Get connection manager for this room
        const connectionManager = this.roomState.getConnectionManager(roomId);
        if (!connectionManager) {
            console.log('[WebRTCCoordinator] ❌ No connection manager for room:', roomId);
            console.log('[WebRTCCoordinator] 📋 Available rooms:', Array.from(this.roomState.roomConnectionManagers?.keys() || []));
            return;
        }
        
        console.log('[WebRTCCoordinator] ✅ Found connection manager for room:', roomId);
        
        // Check if already connected
        if (connectionManager.peers && connectionManager.peers.has(userId)) {
            console.log('[WebRTCCoordinator] Already connected to:', userId);
            return;
        }
        
        // IMPORTANT: When we receive user-joined-room, WE are the existing user
        // and THEY are the new joiner. Existing users ALWAYS initiate to new joiners.
        // This ensures mesh network connectivity regardless of join order.
        console.log('[WebRTCCoordinator] 🔑 SENDING WebRTC KEY to new joiner:', userName);
        console.log('[WebRTCCoordinator] 📤 We are existing user, initiating connection');
        
        try {
            await connectionManager.createOffer(userId);
        } catch (error) {
            console.error('[WebRTCCoordinator] Failed to create offer:', error);
        }
    }
    
    /**
     * Handle existing participants when joining a room
     * @param {string} roomId - Room ID
     * @param {Array} existingParticipants - List of existing participants
     */
    async handleExistingParticipants(roomId, existingParticipants) {
        if (!existingParticipants || existingParticipants.length === 0) {
            console.log('[WebRTCCoordinator] 👤 No existing participants - we are first');
            return;
        }
        
        console.log('[WebRTCCoordinator] 👥 Found', existingParticipants.length, 'existing participants');
        
        const connectionManager = this.roomState.getConnectionManager(roomId);
        if (!connectionManager) {
            console.log('[WebRTCCoordinator] ❌ No connection manager for room');
            return;
        }
        
        // Initiate connections to all existing participants
        for (const participant of existingParticipants) {
            console.log('[WebRTCCoordinator]   📍 Existing participant:', participant.name);
            
            const shouldInitiate = this.currentUserId < participant.id;
            
            if (shouldInitiate) {
                console.log('[WebRTCCoordinator] 🔑 SENDING WebRTC KEY to existing:', participant.name);
                try {
                    await connectionManager.createOffer(participant.id);
                } catch (error) {
                    console.error('[WebRTCCoordinator] Failed to create offer:', error);
                }
            } else {
                console.log('[WebRTCCoordinator] 📥 WAITING for WebRTC KEY from existing:', participant.name);
            }
        }
    }
    
    /**
     * Handle user left room event
     * Cleans up peer connection for the user who left
     * @param {Object} data - Leave event data
     */
    async handleUserLeft(data) {
        const { roomId, userId } = data;
        
        console.log('[WebRTCCoordinator] 👋 User left:', userId);
        console.log('[WebRTCCoordinator] 🔍 Room:', roomId);
        
        // Don't process our own leave
        if (userId === this.currentUserId) {
            console.log('[WebRTCCoordinator] Ignoring own leave signal');
            return;
        }
        
        // Get connection manager for this room
        const connectionManager = this.roomState.getConnectionManager(roomId);
        if (!connectionManager) {
            console.log('[WebRTCCoordinator] No connection manager for room:', roomId);
            return;
        }
        
        // Remove peer connection for the user who left
        if (connectionManager.peers && connectionManager.peers.has(userId)) {
            console.log('[WebRTCCoordinator] 🧹 Removing peer connection for:', userId);
            
            // Close the peer connection
            const peer = connectionManager.peers.get(userId);
            if (peer && peer.connection) {
                peer.connection.close();
            }
            
            // Remove from peers map
            connectionManager.peers.delete(userId);
            console.log('[WebRTCCoordinator] ✅ Peer connection removed');
        } else {
            console.log('[WebRTCCoordinator] No peer connection found for:', userId);
        }
    }
    
    /**
     * Disconnect from a room
     * @param {string} roomId - Room to disconnect from
     */
    async disconnectFromRoom(roomId) {
        console.log('[WebRTCCoordinator] Disconnecting from room:', roomId);
        
        const connectionManager = this.roomState.getConnectionManager(roomId);
        if (connectionManager) {
            try {
                connectionManager.destroy();
                this.roomState.removeConnectionManager(roomId);
                console.log('[WebRTCCoordinator] ✅ Disconnected from room');
            } catch (error) {
                console.error('[WebRTCCoordinator] Error disconnecting:', error);
            }
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        console.log('[WebRTCCoordinator] Destroying');
        this.currentUserId = null;
    }
}
