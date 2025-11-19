// WebRTC Dashboard UI Components
// Reusable UI components and utilities

export class UIComponents {
    constructor() {
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        console.log('[UIComponents] Initializing...');
        
        this.isInitialized = true;
        console.log('[UIComponents] Initialized successfully');
    }
    
    // Modal utilities
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // Notification system
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Styling
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: this._getNotificationColor(type),
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            zIndex: '3000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        return notification;
    }
    
    // Room card creation
    createRoomCard(room) {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.dataset.roomId = room.id;
        
        card.innerHTML = `
            <h3>${this.escapeHtml(room.name)}</h3>
            <p>${this.escapeHtml(room.description || 'No description')}</p>
            <div class="room-meta">
                <div class="room-participants">
                    <span>👥 ${room.participants?.length || 0}/${room.maxParticipants}</span>
                </div>
                <div class="room-host">
                    Host: ${this.escapeHtml(room.host)}
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Participant item creation
    createParticipantItem(participant) {
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.dataset.participantId = participant.id;
        
        const statusClass = participant.isHost ? 'host' : 'online';
        const hostBadge = participant.isHost ? '<span class="host-badge">HOST</span>' : '';
        
        item.innerHTML = `
            <div class="participant-status ${statusClass}"></div>
            <div class="participant-name">${this.escapeHtml(participant.name)}</div>
            ${hostBadge}
        `;
        
        return item;
    }
    
    // Join request item creation
    createRequestItem(request) {
        const item = document.createElement('div');
        item.className = 'request-item';
        item.dataset.requestId = request.id;
        
        const source = request.viaLink ? 'Direct Link' : 'Dashboard';
        const message = request.message ? `<div class="request-message">"${this.escapeHtml(request.message)}"</div>` : '';
        
        item.innerHTML = `
            <div class="request-info">
                <div class="request-name">${this.escapeHtml(request.userName)}</div>
                <div class="request-source">via ${source}</div>
                ${message}
            </div>
            <div class="request-actions">
                <button class="approve-btn" onclick="window.dashboard.approveJoinRequest('${request.id}')">
                    ✓ Approve
                </button>
                <button class="reject-btn" onclick="window.dashboard.rejectJoinRequest('${request.id}')">
                    ✗ Reject
                </button>
            </div>
        `;
        
        return item;
    }
    
    // Chat message creation
    createMessageItem(message) {
        const item = document.createElement('div');
        item.className = `message-item ${message.type}`;
        if (message.authorId === window.dashboard?.currentUser?.id) {
            item.classList.add('own');
        }
        
        const time = new Date(message.timestamp).toLocaleTimeString();
        
        if (message.type === 'system') {
            item.innerHTML = `
                <div class="message-content">${this.escapeHtml(message.content)}</div>
            `;
        } else {
            item.innerHTML = `
                <div class="message-header">
                    <span class="message-author">${this.escapeHtml(message.authorName)}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.content)}</div>
            `;
        }
        
        return item;
    }
    
    // Transfer option creation
    createTransferOption(participant) {
        const option = document.createElement('div');
        option.className = 'transfer-option';
        option.dataset.participantId = participant.id;
        
        option.innerHTML = `
            <input type="radio" name="transfer-target" value="${participant.id}" id="transfer-${participant.id}">
            <label for="transfer-${participant.id}">${this.escapeHtml(participant.name)}</label>
        `;
        
        // Add click handler
        option.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.transfer-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to this option
            option.classList.add('selected');
            
            // Check the radio button
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
            
            // Enable confirm button
            const confirmBtn = document.getElementById('confirm-transfer-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
            }
        });
        
        return option;
    }
    
    // Update participants list
    updateParticipantsList(participants, containerId = 'participants-list') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        participants.forEach(participant => {
            const item = this.createParticipantItem(participant);
            container.appendChild(item);
        });
        
        // Update count
        const countElement = document.getElementById('participant-count');
        if (countElement) {
            countElement.textContent = participants.length;
        }
    }
    
    // Update requests list
    updateRequestsList(requests, containerId = 'requests-list') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (requests.length === 0) {
            container.innerHTML = '<p class="no-requests">No pending requests</p>';
            return;
        }
        
        container.innerHTML = '';
        
        requests.forEach(request => {
            const item = this.createRequestItem(request);
            container.appendChild(item);
        });
    }
    
    // Update chat messages
    updateChatMessages(messages, containerId = 'chat-messages') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        messages.forEach(message => {
            const item = this.createMessageItem(message);
            container.appendChild(item);
        });
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    // Add single chat message
    addChatMessage(message, containerId = 'chat-messages') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const item = this.createMessageItem(message);
        container.appendChild(item);
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        // Limit message history (keep last 100 messages)
        while (container.children.length > 100) {
            container.removeChild(container.firstChild);
        }
    }
    
    // Update room info
    updateRoomInfo(room) {
        const nameElement = document.getElementById('current-room-name');
        const statusElement = document.getElementById('current-room-status');
        
        if (nameElement) {
            nameElement.textContent = room.name;
        }
        
        if (statusElement) {
            statusElement.textContent = 'Connected';
        }
    }
    
    // Copy to clipboard utility
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success', 1500);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                this.showNotification('Copied to clipboard!', 'success', 1500);
                return true;
            } catch (fallbackError) {
                this.showNotification('Failed to copy to clipboard', 'error');
                return false;
            }
        }
    }
    
    // HTML escaping utility
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Format timestamp utility
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Format date utility
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} min ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Private methods
    _getNotificationColor(type) {
        switch (type) {
            case 'error':
                return '#dc3545';
            case 'success':
                return '#28a745';
            case 'warning':
                return '#ffc107';
            default:
                return '#667eea';
        }
    }
}
