// WebRTC Dashboard Access Control Manager
// Handles join requests, approvals, and host transfers

import { getSharedBroadcastService } from './shared-broadcast.js';

export class AccessControlManager {
    constructor() {
        this.broadcastService = null;
        this.pendingRequests = new Map(); // requestId -> request data
        this.eventHandlers = new Map();
        
        this.channelName = 'webrtc-dashboard-access';
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        console.log('[AccessControl] Initializing...');
        
        try {
            // Initialize shared broadcast service
            this.broadcastService = getSharedBroadcastService(this.channelName);
            
            this.isInitialized = true;
            console.log('[AccessControl] Initialized successfully');
            
        } catch (error) {
            console.error('[AccessControl] Initialization failed:', error);
            throw error;
        }
    }
    
    async sendJoinRequest(request) {
        if (!this.isInitialized) {
            throw new Error('AccessControlManager not initialized');
        }
        
        const requestData = {
            id: this._generateRequestId(),
            ...request,
            timestamp: new Date(),
            status: 'pending'
        };
        
        console.log('[AccessControl] Sending join request:', requestData.id);
        
        try {
            // Store request locally
            this.pendingRequests.set(requestData.id, requestData);
            
            // Broadcast join request
            this._broadcastMessage('join-request', requestData);
            
            return requestData;
            
        } catch (error) {
            console.error('[AccessControl] Failed to send join request:', error);
            this.pendingRequests.delete(requestData.id);
            throw error;
        }
    }
    
    async approveRequest(requestId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            throw new Error('Request not found');
        }
        
        console.log('[AccessControl] Approving request:', requestId);
        
        try {
            // Update request status
            request.status = 'approved';
            request.approvedAt = new Date();
            
            // Broadcast approval
            this._broadcastMessage('join-approved', {
                requestId: requestId,
                request: request
            });
            
            // Remove from pending requests
            this.pendingRequests.delete(requestId);
            
            return request;
            
        } catch (error) {
            console.error('[AccessControl] Failed to approve request:', error);
            throw error;
        }
    }
    
    async rejectRequest(requestId, reason = '') {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            throw new Error('Request not found');
        }
        
        console.log('[AccessControl] Rejecting request:', requestId);
        
        try {
            // Update request status
            request.status = 'rejected';
            request.rejectedAt = new Date();
            request.rejectionReason = reason;
            
            // Broadcast rejection
            this._broadcastMessage('join-rejected', {
                requestId: requestId,
                request: request,
                reason: reason
            });
            
            // Remove from pending requests
            this.pendingRequests.delete(requestId);
            
            return request;
            
        } catch (error) {
            console.error('[AccessControl] Failed to reject request:', error);
            throw error;
        }
    }
    
    async transferHost(newHostId, options = {}) {
        console.log('[AccessControl] Transferring host to:', newHostId);
        
        try {
            const transferData = {
                id: this._generateTransferId(),
                newHostId: newHostId,
                previousHostId: options.fromHostId || 'unknown',
                reason: options.reason || '',
                timestamp: new Date(),
                type: 'manual'
            };
            
            // Broadcast host transfer
            this._broadcastMessage('host-transfer', transferData);
            
            return transferData;
            
        } catch (error) {
            console.error('[AccessControl] Failed to transfer host:', error);
            throw error;
        }
    }
    
    async handleHostDisconnect(hostId, participants) {
        console.log('[AccessControl] Handling host disconnect, finding successor...');
        
        try {
            // Find most recent participant (last to join)
            const sortedParticipants = participants
                .filter(p => p.id !== hostId && p.isConnected)
                .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
            
            if (sortedParticipants.length === 0) {
                console.log('[AccessControl] No participants available for host transfer');
                return null;
            }
            
            const newHost = sortedParticipants[0];
            
            const transferData = {
                id: this._generateTransferId(),
                newHostId: newHost.id,
                previousHostId: hostId,
                reason: 'Host disconnected',
                timestamp: new Date(),
                type: 'automatic'
            };
            
            // Broadcast automatic host transfer
            this._broadcastMessage('host-transfer', transferData);
            
            console.log('[AccessControl] Automatic host transfer to:', newHost.name);
            
            return transferData;
            
        } catch (error) {
            console.error('[AccessControl] Failed to handle host disconnect:', error);
            throw error;
        }
    }
    
    getPendingRequests() {
        return Array.from(this.pendingRequests.values());
    }
    
    getRequest(requestId) {
        return this.pendingRequests.get(requestId);
    }
    
    // Event handlers
    onJoinRequest(handler) {
        this._addEventListener('joinRequest', handler);
    }
    
    onJoinApproved(handler) {
        this._addEventListener('joinApproved', handler);
    }
    
    onJoinRejected(handler) {
        this._addEventListener('joinRejected', handler);
    }
    
    onHostTransfer(handler) {
        this._addEventListener('hostTransfer', handler);
    }
    
    // Private methods - OLD METHOD REMOVED
    // Now using shared BroadcastService instead
    
    _handleBroadcastMessage(message) {
        console.log('[AccessControl] Received message:', message.type);
        
        switch (message.type) {
            case 'join-request':
                this._handleJoinRequest(message.request);
                break;
                
            case 'join-approved':
                this._handleJoinApproved(message);
                break;
                
            case 'join-rejected':
                this._handleJoinRejected(message);
                break;
                
            case 'host-transfer':
                this._handleHostTransfer(message.transfer);
                break;
        }
    }
    
    _handleJoinRequest(request) {
        console.log('[AccessControl] Join request received:', request.userName);
        
        // Store the request for potential approval/rejection
        this.pendingRequests.set(request.id, request);
        
        // Emit event for UI handling
        this._emitEvent('joinRequest', request);
    }
    
    _handleJoinApproved(message) {
        console.log('[AccessControl] Join approved:', message.requestId);
        
        // Remove from pending if we sent this request
        this.pendingRequests.delete(message.requestId);
        
        // Emit event
        this._emitEvent('joinApproved', {
            requestId: message.requestId,
            request: message.request
        });
    }
    
    _handleJoinRejected(message) {
        console.log('[AccessControl] Join rejected:', message.requestId, message.reason);
        
        // Remove from pending if we sent this request
        this.pendingRequests.delete(message.requestId);
        
        // Emit event
        this._emitEvent('joinRejected', {
            requestId: message.requestId,
            request: message.request,
            reason: message.reason
        });
    }
    
    _handleHostTransfer(transfer) {
        console.log('[AccessControl] Host transfer:', transfer.type, 'to', transfer.newHostId);
        
        // Emit event
        this._emitEvent('hostTransfer', {
            newHost: { id: transfer.newHostId },
            previousHost: { id: transfer.previousHostId },
            transferType: transfer.type,
            reason: transfer.reason,
            timestamp: transfer.timestamp
        });
    }
    
    _broadcastMessage(type, data = {}) {
        if (this.broadcastService) {
            this.broadcastService.send(type, data);
        } else {
            console.warn('[AccessControl] BroadcastService not available');
        }
    }
    
    _generateRequestId() {
        return 'req_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    _generateTransferId() {
        return 'transfer_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
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
                console.error(`[AccessControl] Error in ${event} handler:`, error);
            }
        });
    }
    
    destroy() {
        console.log('[AccessControl] Destroying...');
        
        // Clear pending requests
        this.pendingRequests.clear();
        
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
