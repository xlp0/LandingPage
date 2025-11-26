// WebRTC Dashboard Room Service v3.0
// Refactored modular architecture - Main orchestrator

import { RoomState } from './services/room-state.js';
import { RoomCreator } from './services/room-creator.js';
import { RoomJoiner } from './services/room-joiner.js';
import { RoomBroadcaster } from './services/room-broadcaster.js';
import { RoomDiscovery } from './services/room-discovery.js';
import { RoomEventEmitter } from './services/room-event-emitter.js';
import { WebRTCCoordinator } from './services/webrtc-coordinator.js';
import { RoomMessageHandler } from './services/room-message-handler.js';

export class RoomService {
    constructor(reduxStore = null) {
        this.instanceId = 'room-service-v3-' + Math.random().toString(36).substr(2, 9);
        console.log('🔥🔥🔥 [RoomService] V3.0 MODULAR VERSION LOADED! 🔥🔥🔥');
        console.log('[RoomService] Instance:', this.instanceId);
        
        // Redux Store
        this.store = reduxStore;
        if (this.store) {
            console.log('[RoomService] ✅ Redux store connected');
        } else {
            console.warn('[RoomService] ⚠️ No Redux store - running without Redux');
        }
        
        // Initialize all modules
        this.state = new RoomState();
        this.broadcaster = new RoomBroadcaster('webrtc-dashboard-rooms');
        this.creator = new RoomCreator(this.state, this.broadcaster, this.store);
        this.joiner = new RoomJoiner(this.state, this.broadcaster, this.store);
        this.discovery = new RoomDiscovery(this.broadcaster);
        this.eventEmitter = new RoomEventEmitter();
        this.webrtcCoordinator = new WebRTCCoordinator(this.state, this.store);
        this.messageHandler = new RoomMessageHandler(
            this.state,
            this.broadcaster,
            this.eventEmitter,
            this.webrtcCoordinator
        );
        
        this.isInitialized = false;
        this.currentUserId = null;
    }
    
    /**
     * Initialize the service
     */
    async init() {
        if (this.isInitialized) {
            console.log('[RoomService] Already initialized');
            return;
        }
        
        console.log('[RoomService] Initializing...');
        
        try {
            // Initialize broadcaster
            this.broadcaster.init();
            
            // Initialize message handler
            this.messageHandler.init();
            
            // Setup cleanup
            this._setupCleanup();
            
            // Start room discovery to sync with server
            this.discovery.startDiscovery();
            
            this.isInitialized = true;
            console.log('[RoomService] ✅ Initialized successfully');
            
        } catch (error) {
            console.error('[RoomService] ❌ Initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Set current user ID
     * @param {string} userId - User ID
     */
    setUserId(userId) {
        this.currentUserId = userId;
        this.webrtcCoordinator.setUserId(userId);
        console.log('[RoomService] Set user ID:', userId);
    }
    
    // ==================== Room Operations ====================
    
    /**
     * Create a new room
     * @param {Object} roomData - Room configuration
     * @returns {Promise<Object>} Created room
     */
    async createRoom(roomData) {
        if (!this.isInitialized) {
            throw new Error('RoomService not initialized');
        }
        
        const room = await this.creator.createRoom(roomData);
        this.eventEmitter.emit('roomListUpdated', this.getRooms());
        return room;
    }
    
    /**
     * Join an existing room
     * @param {string} roomId - Room ID
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Room object
     */
    async joinRoom(roomId, userData) {
        if (!this.isInitialized) {
            throw new Error('RoomService not initialized');
        }
        
        const room = await this.joiner.joinRoom(roomId, userData);
        this.eventEmitter.emit('roomListUpdated', this.getRooms());
        return room;
    }
    
    /**
     * Leave a room
     * @param {string} roomId - Room ID
     */
    async leaveRoom(roomId) {
        if (!this.currentUserId) {
            console.error('[RoomService] Cannot leave: No user ID set');
            return;
        }
        
        await this.joiner.leaveRoom(roomId, this.currentUserId);
        await this.webrtcCoordinator.disconnectFromRoom(roomId);
        this.eventEmitter.emit('roomListUpdated', this.getRooms());
    }
    
    // ==================== Discovery Operations ====================
    
    /**
     * Start room discovery
     */
    async startDiscovery() {
        this.discovery.startDiscovery();
    }
    
    /**
     * Refresh room list manually
     */
    refreshRooms() {
        this.discovery.refreshRooms();
    }
    
    // ==================== Query Operations ====================
    
    /**
     * Get all active rooms
     * @returns {Array} Active rooms
     */
    getRooms() {
        return this.state.getActiveRooms();
    }
    
    /**
     * Get specific room
     * @param {string} roomId - Room ID
     * @returns {Object} Room object
     */
    getRoom(roomId) {
        return this.state.getRoom(roomId);
    }
    
    // ==================== Event Subscriptions ====================
    
    /**
     * Subscribe to room list updates
     * @param {Function} handler - Handler function
     */
    onRoomListUpdated(handler) {
        this.eventEmitter.on('roomListUpdated', handler);
    }
    
    /**
     * Subscribe to join requests
     * @param {Function} handler - Handler function
     */
    onRoomJoinRequest(handler) {
        this.eventEmitter.on('roomJoinRequest', handler);
    }
    
    /**
     * Subscribe to user joined event
     * @param {Function} handler - Handler function
     */
    on(eventName, handler) {
        this.eventEmitter.on(eventName, handler);
    }
    
    // ==================== WebRTC Connection Management ====================
    
    /**
     * Register connection manager for a room
     * @param {string} roomId - Room ID
     * @param {Object} connectionManager - RoomConnectionManager instance
     */
    registerConnectionManager(roomId, connectionManager) {
        this.state.setConnectionManager(roomId, connectionManager);
        console.log('[RoomService] ✅ Registered connection manager for room:', roomId);
        console.log('[RoomService] 📋 All registered rooms:', Array.from(this.state.roomConnectionManagers?.keys() || []));
    }
    
    // ==================== Cleanup ====================
    
    /**
     * Setup cleanup handlers
     * @private
     */
    _setupCleanup() {
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
        
        // Cleanup on visibility change (tab close)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('[RoomService] Tab hidden, preparing for cleanup');
            }
        });
    }
    
    /**
     * Destroy the service and cleanup all resources
     */
    destroy() {
        console.log('[RoomService] Destroying...');
        
        try {
            // Stop discovery
            this.discovery.destroy();
            
            // Cleanup all connection managers
            const rooms = this.state.getAllRooms();
            rooms.forEach(room => {
                const manager = this.state.getConnectionManager(room.id);
                if (manager && manager.destroy) {
                    manager.destroy();
                }
            });
            
            // Cleanup modules
            this.broadcaster.destroy();
            this.webrtcCoordinator.destroy();
            this.eventEmitter.destroy();
            this.state.clear();
            
            this.isInitialized = false;
            console.log('[RoomService] ✅ Destroyed');
            
        } catch (error) {
            console.error('[RoomService] Error during destroy:', error);
        }
    }
}
