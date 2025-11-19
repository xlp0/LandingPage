// WebRTC Signaling Manager
// Handles WebRTC offer/answer/ICE exchange via WebSocket (SIGNALING ONLY)

import { getSharedBroadcastService } from '../shared-broadcast.js';

export class WebRTCSignaling {
    constructor(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;
        this.signalingService = null;
        this.channelName = 'webrtc-signaling';
        
        console.log(`[WebRTCSignaling] Created for room: ${roomId}, user: ${userId}`);
    }
    
    async init() {
        // Use WebSocket ONLY for signaling
        this.signalingService = getSharedBroadcastService(this.channelName);
        
        // Setup signaling message handlers
        this.signalingService.on('webrtc-offer', (data) => {
            if (data.roomId === this.roomId && data.toUserId === this.userId) {
                console.log('[WebRTCSignaling] Received offer from:', data.fromUserId);
                this.onOffer(data.fromUserId, data.offer);
            }
        });
        
        this.signalingService.on('webrtc-answer', (data) => {
            if (data.roomId === this.roomId && data.toUserId === this.userId) {
                console.log('[WebRTCSignaling] Received answer from:', data.fromUserId);
                this.onAnswer(data.fromUserId, data.answer);
            }
        });
        
        this.signalingService.on('webrtc-ice', (data) => {
            if (data.roomId === this.roomId && data.toUserId === this.userId) {
                console.log('[WebRTCSignaling] Received ICE candidate from:', data.fromUserId);
                this.onIceCandidate(data.fromUserId, data.candidate);
            }
        });
        
        console.log('[WebRTCSignaling] Initialized');
    }
    
    sendOffer(toUserId, offer) {
        console.log('[WebRTCSignaling] Sending offer to:', toUserId);
        this.signalingService.send('webrtc-offer', {
            roomId: this.roomId,
            fromUserId: this.userId,
            toUserId: toUserId,
            offer: offer
        });
    }
    
    sendAnswer(toUserId, answer) {
        console.log('[WebRTCSignaling] Sending answer to:', toUserId);
        this.signalingService.send('webrtc-answer', {
            roomId: this.roomId,
            fromUserId: this.userId,
            toUserId: toUserId,
            answer: answer
        });
    }
    
    sendIceCandidate(toUserId, candidate) {
        console.log('[WebRTCSignaling] Sending ICE candidate to:', toUserId);
        this.signalingService.send('webrtc-ice', {
            roomId: this.roomId,
            fromUserId: this.userId,
            toUserId: toUserId,
            candidate: candidate
        });
    }
    
    destroy() {
        console.log('[WebRTCSignaling] Destroying signaling for room:', this.roomId);
        // Don't destroy shared service, just stop using it
        this.signalingService = null;
    }
    
    // Callbacks (to be overridden)
    onOffer(fromUserId, offer) {}
    onAnswer(fromUserId, answer) {}
    onIceCandidate(fromUserId, candidate) {}
}
