// Participant Manager
// Handles participant list and join requests in the sidebar

export class ParticipantManager {
    constructor(chatManager, accessControl) {
        this.chatManager = chatManager;
        this.accessControl = accessControl;
        
        this.participantsElement = null;
        this.requestsElement = null;
        this.pendingRequests = new Map();
    }
    
    init() {
        this.participantsElement = document.getElementById('participants-list');
        this.requestsElement = document.getElementById('participants-list'); // We'll add requests here
        
        console.log('[ParticipantManager] Initialized');
    }
    
    updateParticipantsList(participants) {
        if (!this.participantsElement) return;
        
        console.log('[ParticipantManager] Updating participants:', participants.length);
        
        // Clear current list
        this.participantsElement.innerHTML = '';
        
        // Add pending requests section if there are any
        if (this.pendingRequests.size > 0) {
            this._renderPendingRequests();
        }
        
        // Add participants
        if (participants.length === 0) {
            this.participantsElement.innerHTML += '<p class="no-participants">No participants yet</p>';
            return;
        }
        
        participants.forEach(participant => {
            const participantCard = this._createParticipantCard(participant);
            this.participantsElement.appendChild(participantCard);
        });
    }
    
    addJoinRequest(request) {
        console.log('[ParticipantManager] 🔔 Adding join request to sidebar:', request.userName);
        
        this.pendingRequests.set(request.id, request);
        this._renderPendingRequests();
    }
    
    removeJoinRequest(requestId) {
        this.pendingRequests.delete(requestId);
        this._renderPendingRequests();
    }
    
    _renderPendingRequests() {
        if (!this.participantsElement) return;
        
        // Remove existing requests section
        const existingSection = this.participantsElement.querySelector('.pending-requests-section');
        if (existingSection) {
            existingSection.remove();
        }
        
        if (this.pendingRequests.size === 0) return;
        
        // Create requests section
        const requestsSection = document.createElement('div');
        requestsSection.className = 'pending-requests-section';
        requestsSection.innerHTML = `
            <div class="section-header">
                <h4>🔔 Join Requests (${this.pendingRequests.size})</h4>
            </div>
        `;
        
        // Add each request
        this.pendingRequests.forEach(request => {
            const requestCard = this._createRequestCard(request);
            requestsSection.appendChild(requestCard);
        });
        
        // Insert at the top of participants list
        this.participantsElement.insertBefore(requestsSection, this.participantsElement.firstChild);
        
        console.log('[ParticipantManager] ✅ Rendered', this.pendingRequests.size, 'pending requests');
    }
    
    _createRequestCard(request) {
        const card = document.createElement('div');
        card.className = 'join-request-card';
        card.dataset.requestId = request.id;
        
        const displayName = request.displayName || request.userName || 'Anonymous';
        
        card.innerHTML = `
            <div class="request-info">
                <div class="request-header">
                    <strong>👤 ${this._escapeHtml(displayName)}</strong>
                    <span class="request-badge">NEW</span>
                </div>
                ${request.message ? `<p class="request-message">${this._escapeHtml(request.message)}</p>` : ''}
                <small class="request-time">${this._formatTime(request.timestamp)}</small>
            </div>
            <div class="request-actions">
                <button class="approve-btn" data-request-id="${request.id}">
                    ✅ Approve
                </button>
                <button class="reject-btn" data-request-id="${request.id}">
                    ❌ Reject
                </button>
            </div>
        `;
        
        // Add event listeners
        const approveBtn = card.querySelector('.approve-btn');
        const rejectBtn = card.querySelector('.reject-btn');
        
        approveBtn.addEventListener('click', async () => {
            try {
                await this.accessControl.approveJoinRequest(request.id);
                this.removeJoinRequest(request.id);
                this._showNotification(`${displayName} approved!`, 'success');
            } catch (error) {
                console.error('[ParticipantManager] Failed to approve:', error);
                this._showNotification('Failed to approve request', 'error');
            }
        });
        
        rejectBtn.addEventListener('click', async () => {
            try {
                await this.accessControl.rejectJoinRequest(request.id, 'Rejected by host');
                this.removeJoinRequest(request.id);
                this._showNotification(`${displayName} rejected`, 'info');
            } catch (error) {
                console.error('[ParticipantManager] Failed to reject:', error);
                this._showNotification('Failed to reject request', 'error');
            }
        });
        
        return card;
    }
    
    _createParticipantCard(participant) {
        const card = document.createElement('div');
        card.className = 'participant-card';
        card.dataset.participantId = participant.id;
        
        const isHost = participant.isHost || false;
        const isSelf = participant.isSelf || false;
        
        card.innerHTML = `
            <div class="participant-avatar">
                ${isHost ? '👑' : '👤'}
            </div>
            <div class="participant-info">
                <strong>${this._escapeHtml(participant.name)}</strong>
                ${isSelf ? '<span class="badge">You</span>' : ''}
                ${isHost ? '<span class="badge host">Host</span>' : ''}
            </div>
        `;
        
        return card;
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
    
    _showNotification(message, type = 'info') {
        // Emit event for dashboard to handle
        const event = new CustomEvent('notification', {
            detail: { message, type }
        });
        document.dispatchEvent(event);
    }
}
