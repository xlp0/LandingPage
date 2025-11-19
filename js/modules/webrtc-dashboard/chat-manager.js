// WebRTC Dashboard Chat Manager
// Handles P2P messaging and participant management

import { getSharedBroadcastService } from './shared-broadcast.js';

export class ChatManager {
    constructor() {
        this.currentRoom = null;
        this.currentUser = null;
        this.participants = new Map(); // userId -> participant data
        this.messageHistory = [];
        
        this.broadcastService = null;
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
            
            this.isInitialized = true;
            console.log('[ChatManager] Initialized successfully');
            
        } catch (error) {
            console.error('[ChatManager] Initialization failed:', error);
            throw error;
        }
    }
    
    async joinRoom(roomId, userData) {
        console.log('[ChatManager] Joining room:', roomId);
        
        this.currentRoom = roomId;
        this.currentUser = userData;
        
        // Add self to participants
        this.participants.set(userData.id, {
            ...userData,
            isHost: false,
            joinedAt: new Date(),
            isConnected: true,
            isSelf: true
        });
        
        // Announce joining
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
        
        console.log('[ChatManager] Sending message:', content.substring(0, 50));
        
        // Add to local history
        this.messageHistory.push(message);
        
        // Broadcast message
        this._broadcastMessage('chat-message', message);
        
        // Emit event for UI
        this._emitEvent('message', message);
        
        return message;
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
        // Don't handle our own join
        if (participant.id === this.currentUser?.id) {
            return;
        }
        
        console.log('[ChatManager] Participant joined:', participant.name);
        
        // Add to participants
        this.participants.set(participant.id, {
            ...participant,
            isConnected: true,
            isSelf: false
        });
        
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
