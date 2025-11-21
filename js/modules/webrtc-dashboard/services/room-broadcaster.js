// Room Broadcaster Module
// Handles all broadcast operations via WebSocket

import { getSharedBroadcastService } from '../shared-broadcast.js';

export class RoomBroadcaster {
    constructor(channelName = 'webrtc-dashboard-rooms') {
        this.channelName = channelName;
        this.broadcastService = null;
    }
    
    /**
     * Initialize broadcast service
     */
    init() {
        this.broadcastService = getSharedBroadcastService(this.channelName);
        console.log('[RoomBroadcaster] Initialized on channel:', this.channelName);
    }
    
    /**
     * Register message handler
     * @param {Function} handler - Message handler function
     */
    onMessage(handler) {
        if (!this.broadcastService) {
            throw new Error('Broadcaster not initialized');
        }
        
        // Listen to all message types on this channel
        const messageTypes = [
            'server-room-list',  // CRITICAL: Listen for server's authoritative room list
            'room-created',
            'room-removed',
            'room-list-request',
            'user-joined-room',
            'user-left-room'
        ];
        
        messageTypes.forEach(type => {
            this.broadcastService.on(type, (data, fullMessage) => {
                handler(type, data, fullMessage);
            });
        });
    }
    
    /**
     * Broadcast room created
     */
    async broadcastRoomCreated(roomData) {
        return this._send('room-created', roomData);
    }
    
    /**
     * Broadcast room removed
     */
    async broadcastRoomRemoved(data) {
        return this._send('room-removed', data);
    }
    
    /**
     * Broadcast room list request
     */
    async broadcastRoomListRequest() {
        return this._send('room-list-request', {});
    }
    
    /**
     * Broadcast user joined room
     */
    async broadcastUserJoined(data) {
        return this._send('user-joined-room', data);
    }
    
    /**
     * Broadcast user left room
     */
    async broadcastUserLeft(data) {
        return this._send('user-left-room', data);
    }
    
    /**
     * Send message via broadcast service
     * @private
     */
    _send(type, data) {
        if (!this.broadcastService) {
            throw new Error('Broadcaster not initialized');
        }
        
        console.log('[RoomBroadcaster] 📤 Sending:', type);
        this.broadcastService.send(type, data);
    }
    
    /**
     * Cleanup
     */
    destroy() {
        console.log('[RoomBroadcaster] Destroying');
        this.broadcastService = null;
    }
}
