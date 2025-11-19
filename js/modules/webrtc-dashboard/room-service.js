// WebRTC Dashboard Room Service
// Manages room creation, discovery, and broadcasting using existing P2P infrastructure

import { ConnectionManager } from '../p2p-serverless/connection.js';
import { DiscoveryManager } from '../p2p-serverless/discovery.js';
import { resolveP2PConfig } from '../p2p-serverless/config.js';
import { getSharedBroadcastService } from './shared-broadcast.js';

export class RoomService {
    constructor() {
        this.instanceId = 'room-service-' + Math.random().toString(36).substr(2, 9);
        console.log('🔥🔥🔥 [RoomService] NEW VERSION 2.0 LOADED! 🔥🔥🔥');
        console.log('[RoomService] Constructor called, instance:', this.instanceId);
        
        this.connectionManager = null;
        this.discoveryManager = null;
        this.broadcastService = null;
        
        this.rooms = new Map(); // roomId -> room data
        this.localRooms = new Set(); // rooms created by this client
        this.eventHandlers = new Map();
        
        this.channelName = 'webrtc-dashboard-rooms';
        this.isInitialized = false;
        this.isDestroyed = false; // Prevent premature cleanup
    }
    
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        console.log('[RoomService] Initializing...');
        
        try {
            // Initialize P2P infrastructure
            await this._initializeP2P();
            
            // Initialize broadcast service for room discovery
            this._initializeBroadcastService();
            
            // Setup cleanup on page unload
            this._setupCleanup();
            
            this.isInitialized = true;
            console.log('[RoomService] Initialized successfully');
            
        } catch (error) {
            console.error('[RoomService] Initialization failed:', error);
            throw error;
        }
    }
    
    async createRoom(roomData) {
        if (!this.isInitialized) {
            throw new Error('RoomService not initialized');
        }
        
        const room = {
            id: this._generateRoomId(),
            ...roomData,
            createdAt: new Date(),
            participants: [],
            status: 'active'
        };
        
        console.log('[RoomService] Creating room:', room.name);
        
        try {
            // Store room locally
            this.rooms.set(room.id, room);
            this.localRooms.add(room.id);
            
            // Create WebRTC offer for the room
            const offerData = await this.connectionManager.createOffer();
            room.webrtcOffer = offerData;
            
            // Broadcast room creation
            this._broadcastMessage('room-created', this._sanitizeRoomForBroadcast(room));
            
            // Emit room list update
            this._emitRoomListUpdate();
            
            return room;
            
        } catch (error) {
            console.error('[RoomService] Failed to create room:', error);
            // Cleanup on failure
            this.rooms.delete(room.id);
            this.localRooms.delete(room.id);
            throw error;
        }
    }
    
    async joinRoom(roomId, userData) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        
        console.log('[RoomService] Joining room:', roomId);
        
        try {
            // Add user to room participants
            room.participants.push({
                id: userData.id,
                name: userData.name,
                joinedAt: new Date(),
                isHost: false
            });
            
            // If this is a local room, update it
            if (this.localRooms.has(roomId)) {
                this._broadcastMessage('room-updated', this._sanitizeRoomForBroadcast(room));
            }
            
            // Establish WebRTC connection if room has offer
            if (room.webrtcOffer && !this.localRooms.has(roomId)) {
                await this._connectToRoom(room, userData);
            }
            
            this._emitRoomListUpdate();
            
            return room;
            
        } catch (error) {
            console.error('[RoomService] Failed to join room:', error);
            throw error;
        }
    }
    
    async leaveRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        
        console.log('[RoomService] Leaving room:', roomId);
        
        try {
            // If this is a local room, remove it
            if (this.localRooms.has(roomId)) {
                this.localRooms.delete(roomId);
                this._broadcastMessage('room-removed', { roomId: roomId });
            }
            
            // Remove from rooms
            this.rooms.delete(roomId);
            
            // Disconnect WebRTC connections for this room
            this._disconnectFromRoom(roomId);
            
            this._emitRoomListUpdate();
            
        } catch (error) {
            console.error('[RoomService] Failed to leave room:', error);
            throw error;
        }
    }
    
    async startDiscovery() {
        console.log('[RoomService] Starting room discovery...');
        
        // Initial room list request
        setTimeout(() => {
            this._broadcastMessage('room-list-request');
        }, 500); // Small delay to ensure other tabs are ready
        
        // Set up periodic discovery
        this.discoveryInterval = setInterval(() => {
            this._broadcastMessage('room-list-request');
        }, 10000); // Every 10 seconds (more frequent)
        
        // Also request immediately when visibility changes (tab becomes active)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.broadcastService) {
                setTimeout(() => {
                    this._broadcastMessage('room-list-request');
                }, 100);
            }
        });
    }
    
    refreshRooms() {
        console.log('[RoomService] Refreshing rooms...');
        this._broadcastMessage('room-list-request');
    }
    
    getRooms() {
        return Array.from(this.rooms.values()).filter(room => room.status === 'active');
    }
    
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    // Event handlers
    onRoomListUpdated(handler) {
        this._addEventListener('roomListUpdated', handler);
    }
    
    onRoomJoinRequest(handler) {
        this._addEventListener('roomJoinRequest', handler);
    }
    
    // Private methods
    async _initializeP2P() {
        // Resolve P2P configuration
        const p2pConfig = await resolveP2PConfig({});
        
        // Initialize connection manager
        this.connectionManager = new ConnectionManager({
            iceServers: p2pConfig.iceServers
        });
        
        // Initialize discovery manager
        this.discoveryManager = new DiscoveryManager({
            channelName: this.channelName + '-discovery'
        });
        
        await this.discoveryManager.init();
        
        // Setup P2P event handlers
        this._setupP2PEventHandlers();
        
        console.log('[RoomService] P2P infrastructure initialized');
    }
    
    _initializeBroadcastService() {
        this.broadcastService = getSharedBroadcastService(this.channelName);
        
        // Setup message handlers
        this.broadcastService.on('channel-test', (data) => {
            console.log('[RoomService] ✅ Channel test received:', data.message);
        });
        
        this.broadcastService.on('test-message', (data) => {
            console.log('[RoomService] ✅ Test message received:', data.message);
        });
        
        this.broadcastService.on('room-created', (data) => {
            this._handleRoomCreated(data);
        });
        
        this.broadcastService.on('room-updated', (data) => {
            this._handleRoomUpdated(data);
        });
        
        this.broadcastService.on('room-removed', (data) => {
            this._handleRoomRemoved(data.roomId);
        });
        
        this.broadcastService.on('room-list-request', () => {
            this._handleRoomListRequest();
        });
        
        this.broadcastService.on('join-request', (data) => {
            this._handleJoinRequest(data);
        });
        
        // Test the service
        setTimeout(() => {
            console.log('[RoomService] 🧪 Testing BroadcastService...');
            this.broadcastService.send('channel-test', {
                message: 'BroadcastService test from RoomService ' + this.instanceId
            });
        }, 1500);
        
        console.log('[RoomService] BroadcastService initialized');
    }
    
    _setupP2PEventHandlers() {
        // Connection events
        this.connectionManager.on('peer:connect', ({ peerId }) => {
            console.log('[RoomService] Peer connected:', peerId);
        });
        
        this.connectionManager.on('peer:disconnect', ({ peerId }) => {
            console.log('[RoomService] Peer disconnected:', peerId);
            this._handlePeerDisconnect(peerId);
        });
        
        this.connectionManager.on('message', ({ peerId, data }) => {
            this._handleP2PMessage(peerId, data);
        });
        
        this.connectionManager.on('error', ({ peerId, error }) => {
            console.error('[RoomService] P2P error with', peerId, ':', error);
        });
    }
    
    _handleBroadcastMessage(message) {
        console.log('[RoomService] Received broadcast message:', message.type);
        
        switch (message.type) {
            case 'channel-test':
                console.log('[RoomService] ✅ Channel test received:', message.message);
                break;
                
            case 'test-message':
                console.log('[RoomService] ✅ Test message received:', message.message);
                break;
                
            case 'room-created':
                this._handleRoomCreated(message.room);
                break;
                
            case 'room-updated':
                this._handleRoomUpdated(message.room);
                break;
                
            case 'room-removed':
                this._handleRoomRemoved(message.roomId);
                break;
                
            case 'room-list-request':
                this._handleRoomListRequest();
                break;
                
            case 'join-request':
                this._handleJoinRequest(message.request);
                break;
        }
    }
    
    _handleRoomCreated(room) {
        if (!this.localRooms.has(room.id)) {
            console.log('[RoomService] Remote room created:', room.name, 'Total rooms now:', this.rooms.size + 1);
            this.rooms.set(room.id, room);
            this._emitRoomListUpdate();
        } else {
            console.log('[RoomService] Ignoring own room creation:', room.name);
        }
    }
    
    _handleRoomUpdated(room) {
        if (!this.localRooms.has(room.id)) {
            console.log('[RoomService] Remote room updated:', room.name);
            this.rooms.set(room.id, room);
            this._emitRoomListUpdate();
        }
    }
    
    _handleRoomRemoved(roomId) {
        if (!this.localRooms.has(roomId)) {
            console.log('[RoomService] Remote room removed:', roomId);
            this.rooms.delete(roomId);
            this._emitRoomListUpdate();
        }
    }
    
    _handleRoomListRequest() {
        // Send our local rooms to requester
        console.log('[RoomService] Room list requested. Local rooms:', this.localRooms.size, 'Total rooms:', this.rooms.size);
        
        if (this.localRooms.size === 0) {
            console.log('[RoomService] No local rooms to share');
            return;
        }
        
        this.localRooms.forEach(roomId => {
            const room = this.rooms.get(roomId);
            if (room) {
                console.log('[RoomService] Sharing local room:', room.name);
                this._broadcastMessage('room-created', this._sanitizeRoomForBroadcast(room));
            } else {
                console.warn('[RoomService] Local room not found in rooms map:', roomId);
            }
        });
    }
    
    _handleJoinRequest(request) {
        console.log('[RoomService] Join request received:', request);
        this._emitEvent('roomJoinRequest', request);
    }
    
    _handleP2PMessage(peerId, data) {
        console.log('[RoomService] P2P message from', peerId, ':', data);
        
        // Handle different message types
        switch (data.type) {
            case 'chat':
                this._emitEvent('chatMessage', { peerId, message: data });
                break;
                
            case 'join-request':
                this._emitEvent('roomJoinRequest', { peerId, request: data });
                break;
                
            case 'host-transfer':
                this._emitEvent('hostTransfer', { peerId, data });
                break;
        }
    }
    
    _handlePeerDisconnect(peerId) {
        // Handle peer disconnection - update room participants
        this.rooms.forEach(room => {
            room.participants = room.participants.filter(p => p.peerId !== peerId);
        });
        
        this._emitRoomListUpdate();
    }
    
    async _connectToRoom(room, userData) {
        if (!room.webrtcOffer) {
            throw new Error('Room has no WebRTC offer');
        }
        
        try {
            console.log('[RoomService] Connecting to room via WebRTC...');
            
            // Accept the room's WebRTC offer
            const answerData = await this.connectionManager.acceptOffer(
                room.id,
                room.webrtcOffer.offer,
                room.webrtcOffer.ice
            );
            
            // Send answer back via broadcast (in real implementation, this would be more direct)
            this._broadcastMessage('webrtc-answer', {
                roomId: room.id,
                answer: answerData,
                userData
            });
            
            console.log('[RoomService] WebRTC connection initiated');
            
        } catch (error) {
            console.error('[RoomService] Failed to connect to room:', error);
            throw error;
        }
    }
    
    _disconnectFromRoom(roomId) {
        // Disconnect all peers associated with this room
        const peers = this.connectionManager.getPeers();
        peers.forEach(peer => {
            if (peer.roomId === roomId) {
                this.connectionManager.disconnect(peer.id);
            }
        });
    }
    
    _broadcastMessage(type, data = {}) {
        console.log('[RoomService] 🚀 NEW BROADCAST METHOD - Sending:', type);
        
        if (this.isDestroyed) {
            console.log('[RoomService] Service destroyed, cannot broadcast:', type);
            return;
        }
        
        if (!this.broadcastService) {
            console.error('[RoomService] ❌ BroadcastService not available for:', type);
            return;
        }
        
        try {
            this.broadcastService.send(type, data);
            console.log('[RoomService] ✅ Successfully sent via BroadcastService:', type);
        } catch (error) {
            console.error('[RoomService] ❌ Failed to send via BroadcastService:', error);
        }
    }
    
    _sanitizeRoomForBroadcast(room) {
        // Remove sensitive data before broadcasting
        const sanitized = { ...room };
        
        // Remove WebRTC offer data (too large for broadcast)
        if (sanitized.webrtcOffer) {
            sanitized.hasWebRTCOffer = true;
            delete sanitized.webrtcOffer;
        }
        
        return sanitized;
    }
    
    _setupCleanup() {
        // Only clean up on actual page unload, not visibility change
        window.addEventListener('beforeunload', () => {
            console.log('[RoomService] Page unloading, cleaning up...');
            this._cleanup();
        });
        
        // Don't clean up on visibility change - this was causing premature cleanup
        // document.addEventListener('visibilitychange', () => {
        //     if (document.hidden) {
        //         this._cleanup();
        //     }
        // });
        
        console.log('[RoomService] Cleanup handlers registered (beforeunload only)');
    }
    
    _cleanup() {
        // Add stack trace to see what's calling cleanup
        console.log('[RoomService] Cleanup called!');
        console.trace('[RoomService] Cleanup stack trace:');
        
        if (this.isDestroyed) {
            console.log('[RoomService] Already cleaned up, ignoring...');
            return;
        }
        
        if (!this.isInitialized) {
            console.log('[RoomService] Not initialized yet, ignoring cleanup...');
            return;
        }
        
        console.log('[RoomService] Performing cleanup...');
        this.isDestroyed = true;
        
        // Remove all local rooms (before closing broadcast service)
        if (this.broadcastService && this.localRooms.size > 0) {
            this.localRooms.forEach(roomId => {
                try {
                    this._broadcastMessage('room-removed', { roomId: roomId });
                } catch (error) {
                    console.warn('[RoomService] Failed to broadcast room removal:', error);
                }
            });
        }
        
        // Clear discovery interval
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = null;
        }
        
        // Destroy broadcast service
        if (this.broadcastService) {
            this.broadcastService.destroy();
            this.broadcastService = null;
        }
        
        // Destroy connections
        if (this.connectionManager) {
            this.connectionManager.destroy();
            this.connectionManager = null;
        }
        
        if (this.discoveryManager) {
            this.discoveryManager.destroy();
            this.discoveryManager = null;
        }
        
        // Clear local state
        this.localRooms.clear();
        this.rooms.clear();
    }
    
    _generateRoomId() {
        return 'room_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    _emitRoomListUpdate() {
        const rooms = this.getRooms();
        this._emitEvent('roomListUpdated', rooms);
    }
    
    _addEventListener(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    _emitEvent(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`[RoomService] Error in ${event} handler:`, error);
            }
        });
    }
}
