// WebRTC Dashboard Chat Manager
// Handles P2P messaging and participant management

import { getSharedBroadcastService } from './shared-broadcast.js';
import { RoomConnectionManager } from './managers/room-connection-manager.js';

export class ChatManager {
    constructor() {
        this.currentRoom = null;
        this.currentUser = null;
        this.participants = new Map(); // userId -> participant data
        this.messageHistory = [];
        
        this.broadcastService = null;
        this.roomConnection = null; // Per-room WebRTC connection manager
        this.eventHandlers = new Map();
        
        this.channelName = 'webrtc-dashboard-chat';
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        console.log('[ChatManager] Initializing...');
        
        try {
            // Initialize shared broadcast service
            this.broadcastService = getSharedBroadcastService(this.channelName);
            
            // Setup message handlers
            this._setupMessageHandlers();
            
            this.isInitialized = true;
            console.log('[ChatManager] Initialized successfully');
            
        } catch (error) {
            console.error('[ChatManager] Initialization failed:', error);
            throw error;
        }
    }
    
    _setupMessageHandlers() {
        console.log('[ChatManager] Setting up message handlers...');
        
        // REMOVED: chat-message from WebSocket - now ONLY via WebRTC!
        // WebSocket is ONLY for signaling: participant join/leave announcements
        
        this.broadcastService.on('participant-joined', (data) => {
            console.log('[ChatManager] ✅ Participant joined received:', data);
            console.log('[ChatManager] Participant data:', data.participant);
            console.log('[ChatManager] Current room:', this.currentRoom);
            
            // Only handle if it's for our current room
            if (data.roomId === this.currentRoom) {
                this._handleParticipantJoined(data.participant);
            } else {
                console.log('[ChatManager] Ignoring participant join for different room');
            }
        });
        
        this.broadcastService.on('participant-left', (data) => {
            console.log('[ChatManager] ✅ Participant left received:', data);
            this._handleParticipantLeft(data);
        });
        
        console.log('[ChatManager] Message handlers set up');
    }
    
    async joinRoom(roomId, userData) {
        console.log('[ChatManager] Joining room:', roomId);
        
        // Clean up previous room connection if any
        if (this.roomConnection) {
            this.roomConnection.destroy();
        }
        
        this.currentRoom = roomId;
        this.currentUser = userData;
        
        // Create new room-specific connection manager
        this.roomConnection = new RoomConnectionManager(roomId);
        await this.roomConnection.setUserId(userData.id); // Wait for signaling to initialize
        
        // Setup WebRTC event handlers
        this._setupRoomConnectionHandlers();
        
        // Clear participants and add self
        this.participants.clear();
        this.participants.set(userData.id, {
            ...userData,
            isHost: false,
            joinedAt: new Date(),
            isConnected: true,
            isSelf: true
        });
        
        // Announce joining (for signaling only)
        this._broadcastMessage('participant-joined', {
            roomId: roomId,
            participant: {
                id: userData.id,
                name: userData.name,
                joinedAt: new Date(),
                isHost: false
            }
        });
        
        // Send system message
        this._addSystemMessage(`${userData.name} joined the room`);
        
        this._emitEvent('participantJoined', userData);
    }
    
    _setupRoomConnectionHandlers() {
        if (!this.roomConnection) return;
        
        // Handle incoming P2P messages
        this.roomConnection.onDataReceived = (peerId, data) => {
            console.log('[ChatManager] P2P message from peer:', peerId, 'type:', data.type);
            
            if (data.type === 'chat-message') {
                // Only process messages for our room
                if (data.roomId === this.currentRoom) {
                    this._handleChatMessage(data.data);
                } else {
                    console.warn('[ChatManager] Ignoring message for different room:', data.roomId);
                }
            }
        };
        
        // Handle peer connected
        this.roomConnection.onPeerConnected = (peerId) => {
            console.log('[ChatManager] ✅ Peer connected:', peerId);
            console.log('[ChatManager] Total connected peers:', this.roomConnection.getConnectedPeers().length);
            
            // Send any pending messages
            if (this._pendingMessages && this._pendingMessages.length > 0) {
                console.log('[ChatManager] Sending', this._pendingMessages.length, 'pending messages');
                this._pendingMessages.forEach(msg => {
                    this._sendViaWebRTC(msg);
                });
                this._pendingMessages = [];
            }
        };
        
        // Handle peer disconnected
        this.roomConnection.onPeerDisconnected = (peerId) => {
            console.log('[ChatManager] Peer disconnected:', peerId);
        };
    }
    
    async leaveRoom() {
        if (!this.currentRoom || !this.currentUser) {
            return;
        }
        
        console.log('[ChatManager] Leaving room:', this.currentRoom);
        
        // Announce leaving
        this._broadcastMessage('participant-left', {
            roomId: this.currentRoom,
            participant: {
                id: this.currentUser.id,
                name: this.currentUser.name,
                leftAt: new Date()
            }
        });
        
        // Send system message
        this._addSystemMessage(`${this.currentUser.name} left the room`);
        
        // Destroy room-specific WebRTC connections
        if (this.roomConnection) {
            this.roomConnection.destroy();
            this.roomConnection = null;
        }
        
        // Clear state
        this.currentRoom = null;
        this.currentUser = null;
        this.participants.clear();
        this.messageHistory = [];
    }
    
    sendMessage(content, type = 'text') {
        if (!this.currentRoom || !this.currentUser) {
            throw new Error('Not in a room');
        }
        
        const message = {
            id: this._generateMessageId(),
            roomId: this.currentRoom,
            authorId: this.currentUser.id,
            authorName: this.currentUser.name,
            content: content,
            type: type,
            timestamp: new Date()
        };
        
        console.log('[ChatManager] Sending message via WebRTC:', content.substring(0, 50));
        
        // Add to local history
        this.messageHistory.push(message);
        
        // Send via WebRTC DataChannel to all peers in this room
        if (this.roomConnection && this.roomConnection.getConnectedPeers().length > 0) {
            console.log('[ChatManager] Sending via WebRTC DataChannel to', this.roomConnection.getConnectedPeers().length, 'peers');
            this._sendViaWebRTC(message);
        } else {
            // NO FALLBACK TO WEBSOCKET! Messages MUST go via WebRTC
            console.warn('[ChatManager] ⚠️ No WebRTC peers connected yet - message NOT sent');
            console.warn('[ChatManager] Message will be sent once WebRTC connections establish');
            // Store message to send once connected
            if (!this._pendingMessages) this._pendingMessages = [];
            this._pendingMessages.push(message);
        }
        
        // Emit event for UI (show own message)
        this._emitEvent('message', message);
        
        return message;
    }
    
    _sendViaWebRTC(message) {
        if (!this.roomConnection) {
            console.error('[ChatManager] No room connection available');
            return;
        }
        
        // Send to all peers in THIS room only
        const sentCount = this.roomConnection.sendToAll({
            type: 'chat-message',
            roomId: this.currentRoom, // Include room ID for verification
            data: message
        });
        
        console.log(`[ChatManager] Sent message to ${sentCount} peers in room ${this.currentRoom}`);
    }
    
    updateParticipantStatus(participantId, status) {
        const participant = this.participants.get(participantId);
        if (participant) {
            participant.status = status;
            participant.lastSeen = new Date();
            
            this._emitEvent('participantUpdated', participant);
        }
    }
    
    setHost(participantId) {
        // Remove host status from all participants
        this.participants.forEach(participant => {
            participant.isHost = false;
        });
        
        // Set new host
        const newHost = this.participants.get(participantId);
        if (newHost) {
            newHost.isHost = true;
            
            // Send system message
            this._addSystemMessage(`${newHost.name} is now the host`);
            
            this._emitEvent('hostChanged', newHost);
        }
    }
    
    getParticipants() {
        return Array.from(this.participants.values());
    }
    
    getParticipant(participantId) {
        return this.participants.get(participantId);
    }
    
    getMessages() {
        return [...this.messageHistory];
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    isInRoom() {
        return !!this.currentRoom;
    }
    
    // Event handlers
    onMessage(handler) {
        this._addEventListener('message', handler);
    }
    
    onParticipantJoined(handler) {
        this._addEventListener('participantJoined', handler);
    }
    
    onParticipantLeft(handler) {
        this._addEventListener('participantLeft', handler);
    }
    
    onParticipantUpdated(handler) {
        this._addEventListener('participantUpdated', handler);
    }
    
    onHostChanged(handler) {
        this._addEventListener('hostChanged', handler);
    }
    
    // Private methods - OLD METHOD REMOVED
    // Now using shared BroadcastService instead
    
    _handleBroadcastMessage(message) {
        // Only handle messages for our current room
        if (message.roomId && message.roomId !== this.currentRoom) {
            return;
        }
        
        console.log('[ChatManager] Received message:', message.type);
        
        switch (message.type) {
            case 'chat-message':
                this._handleChatMessage(message.message);
                break;
                
            case 'participant-joined':
                this._handleParticipantJoined(message.participant);
                break;
                
            case 'participant-left':
                this._handleParticipantLeft(message.participant);
                break;
                
            case 'participant-status':
                this._handleParticipantStatus(message.participant);
                break;
                
            case 'host-changed':
                this._handleHostChanged(message.participant);
                break;
        }
    }
    
    _handleChatMessage(message) {
        // Don't handle our own messages
        if (message.authorId === this.currentUser?.id) {
            return;
        }
        
        console.log('[ChatManager] Received chat message from:', message.authorName);
        
        // Add to history
        this.messageHistory.push(message);
        
        // Emit event
        this._emitEvent('message', message);
    }
    
    _handleParticipantJoined(participant) {
        console.log('[ChatManager] _handleParticipantJoined called with:', participant);
        console.log('[ChatManager] Current user ID:', this.currentUser?.id);
        console.log('[ChatManager] Participant ID:', participant?.id);
        console.log('[ChatManager] Participant name:', participant?.name);
        
        // Don't handle our own join
        if (participant.id === this.currentUser?.id) {
            console.log('[ChatManager] Ignoring own join');
            return;
        }
        
        console.log('[ChatManager] Adding participant:', participant.name);
        
        // Add to participants
        this.participants.set(participant.id, {
            ...participant,
            isConnected: true,
            isSelf: false
        });
        
        console.log('[ChatManager] Total participants now:', this.participants.size);
        console.log('[ChatManager] Participant names:', Array.from(this.participants.values()).map(p => p.name));
        
        // Initiate WebRTC connection to new participant
        if (this.roomConnection) {
            console.log('[ChatManager] Initiating WebRTC connection to:', participant.id);
            this.roomConnection.createOffer(participant.id).catch(error => {
                console.error('[ChatManager] Failed to create offer:', error);
            });
        }
        
        // Send system message
        this._addSystemMessage(`${participant.name} joined the room`);
        
        // Emit event
        this._emitEvent('participantJoined', participant);
    }
    
    _handleParticipantLeft(participant) {
        // Don't handle our own leave
        if (participant.id === this.currentUser?.id) {
            return;
        }
        
        console.log('[ChatManager] Participant left:', participant.name);
        
        // Remove from participants
        this.participants.delete(participant.id);
        
        // Send system message
        this._addSystemMessage(`${participant.name} left the room`);
        
        // Emit event
        this._emitEvent('participantLeft', participant);
    }
    
    _handleParticipantStatus(participant) {
        const existing = this.participants.get(participant.id);
        if (existing) {
            Object.assign(existing, participant);
            this._emitEvent('participantUpdated', existing);
        }
    }
    
    _handleHostChanged(participant) {
        console.log('[ChatManager] Host changed to:', participant.name);
        
        // Update host status
        this.setHost(participant.id);
    }
    
    _addSystemMessage(content) {
        const message = {
            id: this._generateMessageId(),
            roomId: this.currentRoom,
            authorId: 'system',
            authorName: 'System',
            content: content,
            type: 'system',
            timestamp: new Date()
        };
        
        this.messageHistory.push(message);
        this._emitEvent('message', message);
        
        return message;
    }
    
    _broadcastMessage(type, data = {}) {
        if (this.broadcastService) {
            this.broadcastService.send(type, data);
        } else {
            console.warn('[ChatManager] BroadcastService not available');
        }
    }
    
    _generateMessageId() {
        return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
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
                console.error(`[ChatManager] Error in ${event} handler:`, error);
            }
        });
    }
    
    destroy() {
        console.log('[ChatManager] Destroying...');
        
        // Leave current room
        if (this.currentRoom) {
            this.leaveRoom();
        }
        
        // Clear state
        this.participants.clear();
        this.messageHistory = [];
        
        // Close broadcast channel
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        
        // Clear event handlers
        this.eventHandlers.clear();
        
        this.isInitialized = false;
    }
}
