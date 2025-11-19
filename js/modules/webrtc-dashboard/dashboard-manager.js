// WebRTC Dashboard Manager
// Main controller for the dashboard system

import { RoomService } from './room-service.js';
import { AccessControlManager } from './access-control-manager.js';
import { ChatManager } from './chat-manager.js';
import { UIComponents } from './ui-components.js';

export class DashboardManager {
    constructor() {
        this.roomService = null;
        this.accessControl = null;
        this.chatManager = null;
        this.ui = null;
        
        this.currentRoom = null;
        this.currentUser = null;
        this.isHost = false;
        
        // UI element references
        this.elements = {};
        
        // Event handlers
        this.eventHandlers = new Map();
    }
    
    async init() {
        console.log('[Dashboard] Initializing...');
        
        try {
            // Initialize UI references
            this._initializeElements();
            
            // Initialize services
            this.roomService = new RoomService();
            this.accessControl = new AccessControlManager();
            this.chatManager = new ChatManager();
            this.ui = new UIComponents();
            
            // Initialize all services
            await this.roomService.init();
            await this.accessControl.init();
            await this.chatManager.init();
            await this.ui.init();
            
            // Setup event handlers
            this._setupEventHandlers();
            
            // Setup UI handlers
            this._setupUIHandlers();
            
            // Load user preferences
            this._loadUserPreferences();
            
            // Check for pending room join from URL
            if (window.pendingRoomJoin) {
                await this._handlePendingRoomJoin();
            }
            
            // Start room discovery
            await this.roomService.startDiscovery();
            
            this._updateConnectionStatus('online', 'Connected');
            console.log('[Dashboard] Initialized successfully');
            
        } catch (error) {
            console.error('[Dashboard] Initialization failed:', error);
            this._updateConnectionStatus('offline', 'Failed to initialize');
            throw error;
        }
    }
    
    async createRoom(options) {
        if (!this.currentUser?.name) {
            throw new Error('Please set your name first');
        }
        
        const roomData = {
            name: options.name || 'Untitled Room',
            description: options.description || '',
            maxParticipants: options.maxParticipants || 10,
            requireApproval: options.requireApproval !== false,
            allowDirectLinks: true,
            host: this.currentUser.name,
            hostId: this.currentUser.id,
            createdAt: new Date(),
            participants: []
        };
        
        console.log('[Dashboard] Creating room:', roomData.name);
        
        try {
            // Create room via room service
            const room = await this.roomService.createRoom(roomData);
            
            // Set as current room and host
            this.currentRoom = room;
            this.isHost = true;
            
            // Initialize chat for this room
            await this.chatManager.joinRoom(room.id, this.currentUser);
            
            // Switch to chat view
            this._showChatView();
            
            // Update UI
            this._updateRoomStatus('hosting', `Hosting: ${room.name}`);
            this._updateHostControls();
            
            return room;
            
        } catch (error) {
            console.error('[Dashboard] Failed to create room:', error);
            throw error;
        }
    }
    
    async requestToJoin(roomId, options = {}) {
        if (!this.currentUser?.name) {
            throw new Error('Please set your name first');
        }
        
        const request = {
            roomId,
            userId: this.currentUser.id,
            userName: options.displayName || this.currentUser.name,
            message: options.message || '',
            timestamp: new Date(),
            viaLink: options.viaLink || false
        };
        
        console.log('[Dashboard] Requesting to join room:', roomId);
        
        try {
            await this.accessControl.sendJoinRequest(request);
            
            // Show waiting state
            this._showJoinWaitingState(roomId);
            
            return request;
            
        } catch (error) {
            console.error('[Dashboard] Failed to send join request:', error);
            throw error;
        }
    }
    
    async joinViaLink(roomId, token, options = {}) {
        return this.requestToJoin(roomId, {
            ...options,
            viaLink: true,
            token
        });
    }
    
    generateRoomLink(roomId, options = {}) {
        if (!this.currentRoom || this.currentRoom.id !== roomId) {
            throw new Error('Can only generate links for current room');
        }
        
        const baseUrl = window.location.origin + window.location.pathname;
        const token = this._generateAccessToken();
        
        let url = `${baseUrl}?room=${roomId}&token=${token}`;
        
        if (options.instantJoin) {
            url += '&instant=true';
        }
        
        // Store token for validation
        this._storeAccessToken(roomId, token, options);
        
        return url;
    }
    
    async approveJoinRequest(requestId) {
        if (!this.isHost) {
            throw new Error('Only host can approve requests');
        }
        
        try {
            await this.accessControl.approveRequest(requestId);
            console.log('[Dashboard] Approved join request:', requestId);
        } catch (error) {
            console.error('[Dashboard] Failed to approve request:', error);
            throw error;
        }
    }
    
    async rejectJoinRequest(requestId) {
        if (!this.isHost) {
            throw new Error('Only host can reject requests');
        }
        
        try {
            await this.accessControl.rejectRequest(requestId);
            console.log('[Dashboard] Rejected join request:', requestId);
        } catch (error) {
            console.error('[Dashboard] Failed to reject request:', error);
            throw error;
        }
    }
    
    async transferHost(participantId, options = {}) {
        if (!this.isHost) {
            throw new Error('Only host can transfer privileges');
        }
        
        try {
            await this.accessControl.transferHost(participantId, {
                reason: options.reason || '',
                fromHost: this.currentUser.name
            });
            
            // Update local state
            this.isHost = false;
            this._updateHostControls();
            
            console.log('[Dashboard] Transferred host to:', participantId);
            
        } catch (error) {
            console.error('[Dashboard] Failed to transfer host:', error);
            throw error;
        }
    }
    
    async leaveRoom() {
        if (!this.currentRoom) {
            return;
        }
        
        try {
            // Leave chat
            await this.chatManager.leaveRoom();
            
            // Leave room
            await this.roomService.leaveRoom(this.currentRoom.id);
            
            // Reset state
            this.currentRoom = null;
            this.isHost = false;
            
            // Return to dashboard
            this._showDashboardView();
            this._updateRoomStatus('', 'No room');
            
            console.log('[Dashboard] Left room');
            
        } catch (error) {
            console.error('[Dashboard] Failed to leave room:', error);
            throw error;
        }
    }
    
    getParticipants() {
        return this.chatManager.getParticipants();
    }
    
    // Event handlers
    onJoinRequest(handler) {
        this._addEventListener('joinRequest', handler);
    }
    
    onHostChange(handler) {
        this._addEventListener('hostChange', handler);
    }
    
    onRoomListUpdated(handler) {
        this._addEventListener('roomListUpdated', handler);
    }
    
    // Private methods
    _initializeElements() {
        const elementIds = [
            'user-name', 'save-name-btn', 'room-name', 'room-description',
            'require-approval', 'max-participants', 'create-room-btn',
            'refresh-rooms-btn', 'search-rooms', 'rooms-list',
            'chat-room-view', 'current-room-name', 'current-room-status',
            'share-room-btn', 'transfer-host-btn', 'leave-room-btn',
            'participant-count', 'participants-list', 'host-controls',
            'requests-list', 'chat-messages', 'chat-input', 'send-message-btn',
            'connection-indicator', 'connection-text', 'room-indicator', 'room-text'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }
    
    _setupEventHandlers() {
        // Room service events
        this.roomService.onRoomListUpdated((rooms) => {
            this._updateRoomsList(rooms);
            this._emitEvent('roomListUpdated', { rooms });
        });
        
        // Access control events
        this.accessControl.onJoinRequest((request) => {
            this._handleJoinRequest(request);
            this._emitEvent('joinRequest', request);
        });
        
        this.accessControl.onJoinApproved((data) => {
            this._handleJoinApproved(data);
        });
        
        this.accessControl.onJoinRejected((data) => {
            this._handleJoinRejected(data);
        });
        
        this.accessControl.onHostTransfer((data) => {
            this._handleHostTransfer(data);
            this._emitEvent('hostChange', data);
        });
        
        // Chat manager events
        this.chatManager.onMessage((message) => {
            this._handleChatMessage(message);
        });
        
        this.chatManager.onParticipantJoined((participant) => {
            this._handleParticipantJoined(participant);
        });
        
        this.chatManager.onParticipantLeft((participant) => {
            this._handleParticipantLeft(participant);
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
            const name = this.elements['room-name'].value.trim();
            const description = this.elements['room-description'].value.trim();
            const requireApproval = this.elements['require-approval'].checked;
            const maxParticipants = parseInt(this.elements['max-participants'].value);
            
            if (!name) {
                this._showNotification('Please enter a room name', 'error');
                return;
            }
            
            try {
                await this.createRoom({
                    name,
                    description,
                    requireApproval,
                    maxParticipants
                });
            } catch (error) {
                this._showNotification('Failed to create room: ' + error.message, 'error');
            }
        });
        
        // Refresh rooms button
        this.elements['refresh-rooms-btn']?.addEventListener('click', () => {
            this.roomService.refreshRooms();
        });
        
        // Test broadcast button
        const testBroadcastBtn = document.getElementById('test-broadcast-btn');
        testBroadcastBtn?.addEventListener('click', () => {
            console.log('[Dashboard] Testing broadcast...');
            this.roomService._broadcastMessage('test-message', {
                message: 'Test from ' + (this.currentUser?.name || 'Anonymous'),
                timestamp: Date.now()
            });
            this._showNotification('Test broadcast sent! Check console in other tabs.', 'info');
        });
        
        // Search rooms
        this.elements['search-rooms']?.addEventListener('input', (e) => {
            this._filterRooms(e.target.value);
        });
        
        // Chat input
        this.elements['chat-input']?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this._sendChatMessage();
            }
        });
        
        this.elements['send-message-btn']?.addEventListener('click', () => {
            this._sendChatMessage();
        });
        
        // Room action buttons
        this.elements['share-room-btn']?.addEventListener('click', () => {
            this._showShareRoomModal();
        });
        
        this.elements['transfer-host-btn']?.addEventListener('click', () => {
            this._showTransferHostModal();
        });
        
        this.elements['leave-room-btn']?.addEventListener('click', () => {
            this.leaveRoom();
        });
        
        // Modal handlers
        this._setupModalHandlers();
        
        // Additional UI handlers
        this._setupAdditionalHandlers();
    }
    
    _setupModalHandlers() {
        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }
    
    _setupAdditionalHandlers() {
        // Join request modal handlers
        const sendJoinBtn = document.getElementById('send-join-request-btn');
        const cancelJoinBtn = document.getElementById('cancel-join-btn');
        
        if (sendJoinBtn) {
            sendJoinBtn.addEventListener('click', async () => {
                const nameInput = document.getElementById('join-name-input');
                const messageInput = document.getElementById('join-message-input');
                
                const name = nameInput?.value.trim();
                const message = messageInput?.value.trim();
                
                if (!name) {
                    this._showNotification('Please enter your name', 'error');
                    return;
                }
                
                if (this._pendingJoinRoom) {
                    try {
                        await this.requestToJoin(this._pendingJoinRoom.roomId, {
                            displayName: name,
                            message: message,
                            viaLink: !!this._pendingJoinRoom.token
                        });
                        
                        this.ui.hideModal('join-request-modal');
                        this._pendingJoinRoom = null;
                        
                    } catch (error) {
                        this._showNotification('Failed to send join request: ' + error.message, 'error');
                    }
                }
            });
        }
        
        if (cancelJoinBtn) {
            cancelJoinBtn.addEventListener('click', () => {
                this.ui.hideModal('join-request-modal');
                this._pendingJoinRoom = null;
            });
        }
        
        // Copy link button
        const copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', async () => {
                const linkInput = document.getElementById('shareable-link');
                if (linkInput?.value) {
                    await this.ui.copyToClipboard(linkInput.value);
                }
            });
        }
        
        // Transfer host confirmation
        const confirmTransferBtn = document.getElementById('confirm-transfer-btn');
        if (confirmTransferBtn) {
            confirmTransferBtn.addEventListener('click', async () => {
                const selectedRadio = document.querySelector('input[name="transfer-target"]:checked');
                const reasonInput = document.getElementById('transfer-reason');
                
                if (!selectedRadio) {
                    this._showNotification('Please select a participant', 'error');
                    return;
                }
                
                try {
                    await this.transferHost(selectedRadio.value, {
                        reason: reasonInput?.value.trim() || ''
                    });
                    
                    this.ui.hideModal('host-transfer-modal');
                    
                } catch (error) {
                    this._showNotification('Failed to transfer host: ' + error.message, 'error');
                }
            });
        }
    }
    
    async _handlePendingRoomJoin() {
        const { roomId, token, instant } = window.pendingRoomJoin;
        
        try {
            if (instant) {
                // TODO: Handle instant join
                console.log('[Dashboard] Instant join not yet implemented');
            } else {
                // Show join modal
                this._showJoinModal(roomId, token);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to handle pending room join:', error);
        }
        
        // Clear pending join
        delete window.pendingRoomJoin;
    }
    
    _updateConnectionStatus(status, text) {
        const indicator = this.elements['connection-indicator'];
        const textEl = this.elements['connection-text'];
        
        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }
        
        if (textEl) {
            textEl.textContent = text;
        }
    }
    
    _updateRoomStatus(status, text) {
        const indicator = this.elements['room-indicator'];
        const textEl = this.elements['room-text'];
        
        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }
        
        if (textEl) {
            textEl.textContent = text;
        }
    }
    
    _updateRoomsList(rooms) {
        const container = this.elements['rooms-list'];
        if (!container) {
            console.warn('[Dashboard] Rooms list container not found');
            return;
        }
        
        console.log('[Dashboard] Updating rooms list with', rooms.length, 'rooms:', rooms);
        
        if (rooms.length === 0) {
            container.innerHTML = `
                <div class="no-rooms-message">
                    <p>No rooms available. Create one to get started!</p>
                    <p><small>Rooms will appear here when created by other users.</small></p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = rooms.map(room => `
            <div class="room-card" data-room-id="${room.id}">
                <h3>${this._escapeHtml(room.name)}</h3>
                <p>${this._escapeHtml(room.description || 'No description')}</p>
                <div class="room-meta">
                    <div class="room-participants">
                        <span>👥 ${room.participants?.length || 0}/${room.maxParticipants}</span>
                    </div>
                    <div class="room-host">
                        Host: ${this._escapeHtml(room.host)}
                    </div>
                    <div class="room-created">
                        Created: ${this._formatTime(room.createdAt)}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', () => {
                const roomId = card.dataset.roomId;
                console.log('[Dashboard] Room card clicked:', roomId);
                this._showJoinModal(roomId);
            });
        });
        
        console.log('[Dashboard] Rooms list updated successfully');
    }
    
    _showChatView() {
        this.elements['chat-room-view']?.classList.remove('hidden');
        document.querySelector('.dashboard-main')?.classList.add('hidden');
    }
    
    _showDashboardView() {
        this.elements['chat-room-view']?.classList.add('hidden');
        document.querySelector('.dashboard-main')?.classList.remove('hidden');
    }
    
    _updateHostControls() {
        const hostElements = document.querySelectorAll('.host-only');
        hostElements.forEach(el => {
            if (this.isHost) {
                el.classList.add('show');
            } else {
                el.classList.remove('show');
            }
        });
    }
    
    _sendChatMessage() {
        const input = this.elements['chat-input'];
        const message = input?.value.trim();
        
        if (message && this.chatManager) {
            this.chatManager.sendMessage(message);
            input.value = '';
        }
    }
    
    _showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#667eea'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 3000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    _loadUserPreferences() {
        try {
            const saved = localStorage.getItem('webrtc-dashboard-user');
            if (saved) {
                const userData = JSON.parse(saved);
                this.currentUser = userData;
                if (this.elements['user-name']) {
                    this.elements['user-name'].value = userData.name || '';
                }
            }
        } catch (error) {
            console.warn('[Dashboard] Failed to load user preferences:', error);
        }
    }
    
    _saveUserPreferences() {
        try {
            localStorage.setItem('webrtc-dashboard-user', JSON.stringify(this.currentUser));
        } catch (error) {
            console.warn('[Dashboard] Failed to save user preferences:', error);
        }
    }
    
    _generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    _generateAccessToken() {
        return 'token_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    }
    
    _storeAccessToken(roomId, token, options) {
        // Store token for validation (in real app, this would be more secure)
        const tokens = JSON.parse(localStorage.getItem('room-tokens') || '{}');
        tokens[token] = {
            roomId,
            createdAt: Date.now(),
            options,
            expiresAt: Date.now() + (options.expiresIn || 24 * 60 * 60 * 1000)
        };
        localStorage.setItem('room-tokens', JSON.stringify(tokens));
    }
    
    _escapeHtml(text) {
        if (typeof text !== 'string') {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    _formatTime(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    _filterRooms(query) {
        const cards = document.querySelectorAll('.room-card');
        const lowerQuery = query.toLowerCase();
        
        cards.forEach(card => {
            const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const description = card.querySelector('p')?.textContent.toLowerCase() || '';
            
            if (name.includes(lowerQuery) || description.includes(lowerQuery)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
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
                console.error(`[Dashboard] Error in ${event} handler:`, error);
            }
        });
    }
    
    // Modal functionality
    _showJoinModal(roomId, token = null) {
        console.log('[Dashboard] Show join modal for room:', roomId);
        
        const room = this.roomService.getRoom(roomId);
        if (!room) {
            this._showNotification('Room not found', 'error');
            return;
        }
        
        // Pre-fill name if available
        const nameInput = document.getElementById('join-name-input');
        if (nameInput && this.currentUser?.name) {
            nameInput.value = this.currentUser.name;
        }
        
        // Store room info for join request
        this._pendingJoinRoom = { roomId, token };
        
        this.ui.showModal('join-request-modal');
    }
    
    _showShareRoomModal() {
        console.log('[Dashboard] Show share room modal');
        
        if (!this.currentRoom) {
            this._showNotification('No active room to share', 'error');
            return;
        }
        
        // Generate shareable link
        const link = this.generateRoomLink(this.currentRoom.id);
        
        const linkInput = document.getElementById('shareable-link');
        if (linkInput) {
            linkInput.value = link;
        }
        
        this.ui.showModal('room-link-modal');
    }
    
    _showTransferHostModal() {
        console.log('[Dashboard] Show transfer host modal');
        
        if (!this.isHost) {
            this._showNotification('Only host can transfer privileges', 'error');
            return;
        }
        
        const participants = this.getParticipants().filter(p => !p.isSelf);
        if (participants.length === 0) {
            this._showNotification('No other participants to transfer to', 'error');
            return;
        }
        
        // Populate transfer list
        const container = document.getElementById('transfer-participants-list');
        if (container) {
            container.innerHTML = '';
            participants.forEach(participant => {
                const option = this.ui.createTransferOption(participant);
                container.appendChild(option);
            });
        }
        
        this.ui.showModal('host-transfer-modal');
    }
    
    _showJoinWaitingState(roomId) {
        console.log('[Dashboard] Show join waiting state for room:', roomId);
        this._showNotification('Join request sent. Waiting for host approval...', 'info', 5000);
    }
    
    // Placeholder event handlers
    _handleJoinRequest(request) {
        console.log('[Dashboard] 📩 Handle join request:', request);
        console.log('[Dashboard] Request userName:', request.userName);
        console.log('[Dashboard] Request displayName:', request.displayName);
        
        const displayName = request.displayName || request.userName || 'Anonymous';
        
        // Show notification
        console.log('[Dashboard] Showing notification for:', displayName);
        this._showNotification(`${displayName} wants to join the room`, 'info', 10000);
        
        // Add to requests list
        console.log('[Dashboard] Calling _addJoinRequestToUI...');
        this._addJoinRequestToUI(request);
        console.log('[Dashboard] _addJoinRequestToUI completed');
    }
    
    _addJoinRequestToUI(request) {
        const requestsList = this.elements['requests-list'];
        if (!requestsList) {
            console.warn('[Dashboard] Requests list element not found');
            return;
        }
        
        console.log('[Dashboard] Adding join request to UI for:', request.userName || request.displayName);
        console.log('[Dashboard] Requests list element:', requestsList);
        console.log('[Dashboard] Requests list visible:', requestsList.offsetParent !== null);
        console.log('[Dashboard] Requests list innerHTML before:', requestsList.innerHTML);
        
        // Remove "No pending requests" message if it exists
        const noRequestsMsg = requestsList.querySelector('.no-requests');
        if (noRequestsMsg) {
            noRequestsMsg.remove();
            console.log('[Dashboard] Removed "no requests" message');
        } else {
            console.log('[Dashboard] No "no-requests" message found');
        }
        
        // Use userName if displayName is not available
        const displayName = request.displayName || request.userName || 'Anonymous';
        
        // Create request card
        const requestCard = document.createElement('div');
        requestCard.className = 'join-request-card';
        requestCard.dataset.requestId = request.id;
        requestCard.innerHTML = `
            <div class="request-info">
                <strong>${this._escapeHtml(displayName)}</strong>
                ${request.message ? `<p>${this._escapeHtml(request.message)}</p>` : ''}
                <small>${new Date(request.timestamp).toLocaleTimeString()}</small>
            </div>
            <div class="request-actions">
                <button class="approve-btn" data-request-id="${request.id}">✅ Approve</button>
                <button class="reject-btn" data-request-id="${request.id}">❌ Reject</button>
            </div>
        `;
        
        // Add event listeners
        const approveBtn = requestCard.querySelector('.approve-btn');
        const rejectBtn = requestCard.querySelector('.reject-btn');
        
        approveBtn.addEventListener('click', async () => {
            try {
                await this.accessControl.approveJoinRequest(request.id);
                requestCard.remove();
                this._showNotification(`${request.displayName} approved!`, 'success');
            } catch (error) {
                this._showNotification('Failed to approve request', 'error');
            }
        });
        
        rejectBtn.addEventListener('click', async () => {
            try {
                await this.accessControl.rejectJoinRequest(request.id, 'Rejected by host');
                requestCard.remove();
                this._showNotification(`${request.displayName} rejected`, 'info');
            } catch (error) {
                this._showNotification('Failed to reject request', 'error');
            }
        });
        
        requestsList.appendChild(requestCard);
        console.log('[Dashboard] ✅ Join request card appended');
        console.log('[Dashboard] Requests list innerHTML after:', requestsList.innerHTML);
        console.log('[Dashboard] Request card element:', requestCard);
        console.log('[Dashboard] Request card visible:', requestCard.offsetParent !== null);
    }
    
    _handleJoinApproved(data) {
        console.log('[Dashboard] Join approved:', data);
        // TODO: Handle approved join
    }
    
    _handleJoinRejected(data) {
        console.log('[Dashboard] Join rejected:', data);
        // TODO: Handle rejected join
    }
    
    _handleHostTransfer(data) {
        console.log('[Dashboard] Host transfer:', data);
        // TODO: Handle host transfer
    }
    
    _handleChatMessage(message) {
        console.log('[Dashboard] Chat message:', message);
        // TODO: Display chat message
    }
    
    _handleParticipantJoined(participant) {
        console.log('[Dashboard] Participant joined:', participant);
        // TODO: Update participants list
    }
    
    _handleParticipantLeft(participant) {
        console.log('[Dashboard] Participant left:', participant);
        // TODO: Update participants list
    }
}
