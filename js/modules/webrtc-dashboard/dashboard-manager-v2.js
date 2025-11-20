// WebRTC Dashboard Manager V2
// Simplified modular architecture

import { RoomService } from './room-service.js';
import { AccessControlManager } from './access-control-manager.js';
import { ChatManager } from './chat-manager.js';
import { UIComponents } from './ui-components.js';
import { RoomManager } from './managers/room-manager.js';
import { ParticipantManager } from './managers/participant-manager.js';

export class DashboardManager {
    constructor() {
        // Core services
        this.roomService = null;
        this.accessControl = null;
        this.chatManager = null;
        this.ui = null;
        
        // Managers
        this.roomManager = null;
        this.participantManager = null;
        
        // State
        this.currentUser = null;
        this.elements = {};
        this.eventHandlers = new Map();
    }
    
    async init() {
        console.log('[Dashboard] Initializing V2...');
        
        try {
            // Initialize UI references
            this._initializeElements();
            
            // Initialize core services
            this.roomService = new RoomService();
            this.accessControl = new AccessControlManager();
            this.chatManager = new ChatManager(); // Room-specific connections now
            this.ui = new UIComponents();
            
            await this.roomService.init();
            await this.accessControl.init();
            await this.chatManager.init();
            await this.ui.init();
            
            // Initialize managers
            this.roomManager = new RoomManager(this.roomService, this.chatManager, this.accessControl);
            this.participantManager = new ParticipantManager(this.chatManager, this.accessControl);
            this.participantManager.init();
            
            // Setup event handlers
            this._setupEventHandlers();
            this._setupUIHandlers();
            
            // Load user preferences
            this._loadUserPreferences();
            
            // Start room discovery
            await this.roomService.startDiscovery();
            
            console.log('[Dashboard] ✅ V2 Initialized successfully');
            
        } catch (error) {
            console.error('[Dashboard] Initialization failed:', error);
            throw error;
        }
    }
    
    _setupEventHandlers() {
        // Room service events
        this.roomService.onRoomListUpdated((rooms) => {
            this._updateRoomsList(rooms);
        });
        
        // Access control events - JOIN REQUESTS GO TO SIDEBAR (HOST ONLY!)
        this.accessControl.onJoinRequest((request) => {
            console.log('[Dashboard] 🔔 Join request received');
            console.log('[Dashboard] Request for room:', request.roomId);
            console.log('[Dashboard] Current room:', this.roomManager?.currentRoom?.id);
            console.log('[Dashboard] Is host:', this.roomManager?.isCurrentHost());
            
            // CRITICAL: Only show requests for OUR current room
            const currentRoomId = this.roomManager?.currentRoom?.id;
            if (!currentRoomId) {
                console.log('[Dashboard] Not in a room, ignoring request');
                return;
            }
            
            if (request.roomId !== currentRoomId) {
                console.log('[Dashboard] ⚠️ Request for different room, ignoring');
                return;
            }
            
            // Only show to host
            if (this.roomManager && this.roomManager.isCurrentHost()) {
                console.log('[Dashboard] User is host of this room, showing request in sidebar');
                this.participantManager.addJoinRequest(request);
                this._showNotification(`${request.userName || 'Someone'} wants to join!`, 'info', 5000);
            } else {
                console.log('[Dashboard] User is not host, ignoring request');
            }
        });
        
        this.accessControl.onJoinApproved(async (data) => {
            console.log('[Dashboard] 🎉 Join approved!', data);
            
            // If we're the host, remove the request from sidebar
            if (this.roomManager && this.roomManager.isCurrentHost() && data.requestId) {
                console.log('[Dashboard] Removing approved request from sidebar');
                this.participantManager.removeJoinRequest(data.requestId);
            }
            
            // If this was our request, join the room
            if (data.request && data.request.userId === this.currentUser?.id) {
                console.log('[Dashboard] Our join request was approved! Joining room...');
                try {
                    const roomId = data.request.roomId;
                    
                    // Join the room via RoomService (establishes WebRTC)
                    await this.roomService.joinRoom(roomId, this.currentUser);
                    
                    // Update room manager state
                    const room = this.roomService.getRoom(roomId);
                    if (room) {
                        this.roomManager.currentRoom = room;
                        this.roomManager.isHost = false; // Joiner is not host
                    }
                    
                    // Join chat
                    await this.chatManager.joinRoom(roomId, this.currentUser);
                    
                    // Update UI
                    this._showChatView();
                    this._updateParticipantsList();
                    this._showNotification('✅ Joined room successfully!', 'success');
                    
                    console.log('[Dashboard] ✅ Successfully joined room via WebRTC');
                } catch (error) {
                    console.error('[Dashboard] Failed to join room:', error);
                    this._showNotification('Failed to join room', 'error');
                }
            }
            
            // Update participant list for everyone (new person joined)
            this._updateParticipantsList();
        });
        
        this.accessControl.onJoinRejected((data) => {
            console.log('[Dashboard] ❌ Join rejected:', data);
            
            // If this was our request, show rejection
            if (data.request && data.request.userId === this.currentUser?.id) {
                this._showNotification('Join request was rejected', 'error');
            }
        });
        
        // Chat manager events
        this.chatManager.onMessage((message) => {
            this._handleChatMessage(message);
        });
        
        this.chatManager.onParticipantJoined((participant) => {
            console.log('[Dashboard] Participant joined:', participant);
            this._updateParticipantsList();
        });
        
        this.chatManager.onParticipantLeft((participant) => {
            console.log('[Dashboard] Participant left:', participant);
            this._updateParticipantsList();
        });
        
        // Listen for participant list updates (when WebRTC connects)
        this.chatManager.on('participantListUpdated', (participants) => {
            console.log('[Dashboard] Participant list updated via WebRTC connection');
            this._updateParticipantsList();
        });
        
        // Listen for notification events from participant manager
        document.addEventListener('notification', (e) => {
            this._showNotification(e.detail.message, e.detail.type);
        });
    }
    
    _updateParticipantsList() {
        const participants = Array.from(this.chatManager.getParticipants().values());
        console.log('[Dashboard] Updating participants list. Count:', participants.length);
        console.log('[Dashboard] Participants:', participants.map(p => p.name));
        
        this.participantManager.updateParticipantsList(participants);
        
        // Update count
        const countElement = document.getElementById('participant-count');
        if (countElement) {
            countElement.textContent = participants.length;
            console.log('[Dashboard] Updated participant count display to:', participants.length);
        }
    }
    
    // Delegate to RoomManager
    async createRoom(options) {
        const room = await this.roomManager.createRoom(options, this.currentUser);
        this._showChatView();
        this._updateParticipantsList();
        return room;
    }
    
    async requestToJoin(roomId, options = {}) {
        return await this.roomManager.requestToJoin(roomId, this.currentUser, options);
    }
    
    async leaveRoom() {
        await this.roomManager.leaveRoom();
        this._showDashboardView();
    }
    
    async _reconnectToRoom() {
        if (!this.roomManager.currentRoom) {
            this._showNotification('Not in a room', 'error');
            return;
        }
        
        try {
            console.log('[Dashboard] 🔄 Reconnecting to room...');
            this._showNotification('🔄 Reconnecting...', 'info');
            
            const roomId = this.roomManager.currentRoom.id;
            
            // Re-broadcast that we're in the room
            await this.roomService.joinRoom(roomId, this.currentUser);
            
            // Rejoin chat (will trigger WebRTC reconnection)
            await this.chatManager.joinRoom(roomId, this.currentUser);
            
            this._showNotification('✅ Reconnected!', 'success');
            console.log('[Dashboard] ✅ Reconnection complete');
            
        } catch (error) {
            console.error('[Dashboard] Reconnection failed:', error);
            this._showNotification('❌ Reconnection failed', 'error');
        }
    }
    
    // UI Methods (keeping existing implementation)
    _initializeElements() {
        const elementIds = [
            'user-name', 'save-name-btn', 'room-name', 'room-description',
            'require-approval', 'max-participants', 'create-room-btn',
            'refresh-rooms-btn', 'search-rooms', 'rooms-list',
            'chat-room-view', 'current-room-name', 'current-room-status',
            'share-room-btn', 'reconnect-btn', 'transfer-host-btn', 'leave-room-btn',
            'participant-count', 'participants-list', 'host-controls',
            'chat-messages', 'chat-input', 'send-message-btn',
            'connection-indicator', 'connection-text', 'room-indicator', 'room-text'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }
    
    _setupUIHandlers() {
        // Save name button
        this.elements['save-name-btn']?.addEventListener('click', () => {
            const name = this.elements['user-name'].value.trim();
            if (name) {
                this.currentUser = {
                    id: this._generateUserId(),
                    name: name
                };
                this._saveUserPreferences();
                this._showNotification('Name saved!', 'success');
            }
        });
        
        // Create room button
        this.elements['create-room-btn']?.addEventListener('click', async () => {
            const roomName = this.elements['room-name'].value.trim();
            if (!roomName) {
                this._showNotification('Please enter a room name', 'error');
                return;
            }
            
            try {
                await this.createRoom({
                    name: roomName,
                    description: this.elements['room-description'].value.trim(),
                    requireApproval: this.elements['require-approval'].checked,
                    maxParticipants: parseInt(this.elements['max-participants'].value) || 10
                });
                this._showNotification('Room created!', 'success');
            } catch (error) {
                this._showNotification('Failed to create room', 'error');
            }
        });
        
        // Refresh rooms button
        this.elements['refresh-rooms-btn']?.addEventListener('click', () => {
            this.roomService.refreshRooms();
        });
        
        // Reconnect button
        this.elements['reconnect-btn']?.addEventListener('click', async () => {
            await this._reconnectToRoom();
        });
        
        // Leave room button
        this.elements['leave-room-btn']?.addEventListener('click', async () => {
            await this.leaveRoom();
        });
        
        // Send message button
        this.elements['send-message-btn']?.addEventListener('click', () => {
            this._sendChatMessage();
        });
        
        this.elements['chat-input']?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._sendChatMessage();
            }
        });
    }
    
    _sendChatMessage() {
        const input = this.elements['chat-input'];
        const message = input.value.trim();
        
        if (message) {
            this.chatManager.sendMessage(message);
            input.value = '';
        }
    }
    
    _handleChatMessage(message) {
        const messagesContainer = this.elements['chat-messages'];
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.type}`;
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${this._escapeHtml(message.authorName)}</strong>
                <small>${this._formatTime(message.timestamp)}</small>
            </div>
            <div class="message-content">${this._escapeHtml(message.content)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    _updateRoomsList(rooms) {
        const roomsList = this.elements['rooms-list'];
        if (!roomsList) return;
        
        roomsList.innerHTML = '';
        
        if (rooms.length === 0) {
            roomsList.innerHTML = '<p class="no-rooms">No rooms available</p>';
            return;
        }
        
        rooms.forEach(room => {
            const roomCard = this._createRoomCard(room);
            roomsList.appendChild(roomCard);
        });
    }
    
    _createRoomCard(room) {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `
            <h3>${this._escapeHtml(room.name)}</h3>
            <p>${this._escapeHtml(room.description || 'No description')}</p>
            <div class="room-info">
                <span>👤 ${room.participants?.length || 0}/${room.maxParticipants}</span>
                <span>👑 ${this._escapeHtml(room.host)}</span>
            </div>
            <button class="join-btn" data-room-id="${room.id}">Join Room</button>
        `;
        
        card.querySelector('.join-btn').addEventListener('click', async () => {
            try {
                console.log('[Dashboard] Joining room:', room.id);
                
                // Directly join the room (skip approval for now)
                await this.roomService.joinRoom(room.id, this.currentUser);
                
                // Update room manager state
                const joinedRoom = this.roomService.getRoom(room.id);
                if (joinedRoom) {
                    this.roomManager.currentRoom = joinedRoom;
                    this.roomManager.isHost = false;
                }
                
                // Join chat
                await this.chatManager.joinRoom(room.id, this.currentUser);
                
                // Update UI
                this._showChatView();
                this._updateParticipantsList();
                this._showNotification('✅ Joined room successfully!', 'success');
                
                console.log('[Dashboard] ✅ Successfully joined room via WebRTC');
            } catch (error) {
                console.error('[Dashboard] Failed to join room:', error);
                this._showNotification('Failed to join room', 'error');
            }
        });
        
        return card;
    }
    
    _showChatView() {
        document.getElementById('dashboard-view')?.classList.add('hidden');
        document.getElementById('chat-room-view')?.classList.remove('hidden');
    }
    
    _showDashboardView() {
        document.getElementById('dashboard-view')?.classList.remove('hidden');
        document.getElementById('chat-room-view')?.classList.add('hidden');
    }
    
    _showNotification(message, type = 'info', duration = 3000) {
        console.log(`[Dashboard] 📢 ${type.toUpperCase()}: ${message}`);
        // TODO: Implement toast notifications
    }
    
    _loadUserPreferences() {
        const saved = localStorage.getItem('dashboard-user');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            if (this.elements['user-name']) {
                this.elements['user-name'].value = this.currentUser.name;
            }
        }
    }
    
    _saveUserPreferences() {
        if (this.currentUser) {
            localStorage.setItem('dashboard-user', JSON.stringify(this.currentUser));
        }
    }
    
    _generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    _formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
