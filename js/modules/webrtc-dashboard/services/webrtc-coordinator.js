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
        
        // Don't connect to ourselves
        if (userId === this.currentUserId) {
            console.log('[WebRTCCoordinator] Ignoring own join signal');
            return;
        }
        
        // Get connection manager for this room
        const connectionManager = this.roomState.getConnectionManager(roomId);
        if (!connectionManager) {
            console.log('[WebRTCCoordinator] ❌ No connection manager for room:', roomId);
            return;
        }
        
        // Check if already connected
        if (connectionManager.peers && connectionManager.peers.has(userId)) {
            console.log('[WebRTCCoordinator] Already connected to:', userId);
            return;
        }
        
        // Perfect Negotiation: Only lower ID initiates
        // This prevents offer collisions
        const shouldInitiate = this.currentUserId < userId;
        
        if (shouldInitiate) {
            console.log('[WebRTCCoordinator] 🔑 SENDING WebRTC KEY to:', userName);
            console.log('[WebRTCCoordinator] 📤 We initiate (lower ID):', this.currentUserId, '<', userId);
            
            try {
                await connectionManager.createOffer(userId);
            } catch (error) {
                console.error('[WebRTCCoordinator] Failed to create offer:', error);
            }
        } else {
            console.log('[WebRTCCoordinator] 📥 WAITING for WebRTC KEY from:', userName);
            console.log('[WebRTCCoordinator] We wait (higher ID):', this.currentUserId, '>', userId);
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
