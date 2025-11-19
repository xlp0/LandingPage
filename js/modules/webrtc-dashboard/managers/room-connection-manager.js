// Room Connection Manager
// Manages WebRTC connections PER ROOM - each room has isolated peer connections

import { WebRTCSignaling } from './webrtc-signaling.js';

export class RoomConnectionManager {
    constructor(roomId) {
        this.roomId = roomId;
        this.peers = new Map(); // peerId -> RTCPeerConnection
        this.dataChannels = new Map(); // peerId -> RTCDataChannel
        this.localStream = null;
        this.userId = null;
        this.signaling = null;
        
        // ICE servers for NAT traversal
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        console.log(`[RoomConnectionManager] Created for room: ${roomId}`);
        
        // Debug: Log all connection attempts
        this._debugLog = true;
    }
    
    _log(...args) {
        if (this._debugLog) {
            console.log(`[RoomConnection:${this.roomId.substring(0, 8)}]`, ...args);
        }
    }
    
    async setUserId(userId) {
        this.userId = userId;
        
        // Initialize signaling
        this.signaling = new WebRTCSignaling(this.roomId, userId);
        await this.signaling.init();
        
        // Setup signaling callbacks
        this.signaling.onOffer = async (fromUserId, offer) => {
            await this.handleOffer(fromUserId, offer);
        };
        
        this.signaling.onAnswer = async (fromUserId, answer) => {
            await this.handleAnswer(fromUserId, answer);
        };
        
        this.signaling.onIceCandidate = async (fromUserId, candidate) => {
            await this.handleIceCandidate(fromUserId, candidate);
        };
        
        console.log('[RoomConnectionManager] Signaling initialized for user:', userId);
    }
    
    async createPeerConnection(peerId, isInitiator = false) {
        this._log(`🔗 Creating peer connection to: ${peerId} (initiator: ${isInitiator})`);
        
        // Don't create duplicate connections
        if (this.peers.has(peerId)) {
            this._log(`⚠️ Connection already exists for peer: ${peerId}`);
            return this.peers.get(peerId);
        }
        
        const pc = new RTCPeerConnection(this.iceServers);
        this.peers.set(peerId, pc);
        
        // Add local stream if available (for video/audio)
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }
        
        // Create data channel for chat messages
        if (isInitiator) {
            const dataChannel = pc.createDataChannel('chat', { ordered: true });
            this.setupDataChannel(peerId, dataChannel);
        }
        
        // Handle incoming data channel
        pc.ondatachannel = (event) => {
            console.log(`[RoomConnectionManager] Data channel received from: ${peerId}`);
            this.setupDataChannel(peerId, event.channel);
        };
        
        // Handle ICE candidates - send via signaling
        pc.onicecandidate = (event) => {
            if (event.candidate && this.signaling) {
                console.log(`[RoomConnectionManager] Sending ICE candidate to: ${peerId}`);
                this.signaling.sendIceCandidate(peerId, event.candidate);
            }
        };
        
        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            this._log(`📊 Connection state with ${peerId}: ${pc.connectionState}`);
            if (pc.connectionState === 'connected') {
                this._log(`✅ PEER CONNECTED: ${peerId}`);
                this.onPeerConnected(peerId);
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                this._log(`❌ PEER DISCONNECTED/FAILED: ${peerId}`);
                this.removePeer(peerId);
            }
        };
        
        // Also log ICE connection state
        pc.oniceconnectionstatechange = () => {
            this._log(`🧊 ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
        };
        
        // Log signaling state
        pc.onsignalingstatechange = () => {
            this._log(`📡 Signaling state with ${peerId}: ${pc.signalingState}`);
        };
        
        return pc;
    }
    
    setupDataChannel(peerId, channel) {
        this._log(`📺 Setting up data channel with: ${peerId}`);
        
        channel.onopen = () => {
            this._log(`✅ DATA CHANNEL OPENED with: ${peerId}`);
            this.dataChannels.set(peerId, channel);
            
            // Notify that data channel is ready
            this.onDataChannelOpen(peerId);
        };
        
        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`[RoomConnectionManager] Message from ${peerId}:`, data.type);
                this.onDataReceived(peerId, data);
            } catch (error) {
                console.error('[RoomConnectionManager] Failed to parse message:', error);
            }
        };
        
        channel.onclose = () => {
            console.log(`[RoomConnectionManager] Data channel closed with: ${peerId}`);
            this.dataChannels.delete(peerId);
        };
    }
    
    async createOffer(peerId) {
        this._log(`📤 Creating offer for: ${peerId}`);
        const pc = await this.createPeerConnection(peerId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this._log(`✅ Offer created and set as local description for: ${peerId}`);
        
        // Send offer via signaling
        if (this.signaling) {
            this._log(`📡 Sending offer to: ${peerId} via signaling`);
            this.signaling.sendOffer(peerId, offer);
        } else {
            this._log(`❌ No signaling service available!`);
        }
        
        return offer;
    }
    
    async handleOffer(peerId, offer) {
        this._log(`📥 Received offer from: ${peerId}`);
        const pc = await this.createPeerConnection(peerId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        this._log(`✅ Set remote description from: ${peerId}`);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this._log(`✅ Created answer for: ${peerId}`);
        
        // Send answer via signaling
        if (this.signaling) {
            this._log(`📡 Sending answer to: ${peerId} via signaling`);
            this.signaling.sendAnswer(peerId, answer);
        } else {
            this._log(`❌ No signaling service available!`);
        }
        
        return answer;
    }
    
    async handleAnswer(peerId, answer) {
        this._log(`📥 Received answer from: ${peerId}`);
        const pc = this.peers.get(peerId);
        if (!pc) {
            this._log(`❌ No connection found for: ${peerId}`);
            return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        this._log(`✅ Set remote description (answer) from: ${peerId}`);
    }
    
    async handleIceCandidate(peerId, candidate) {
        const pc = this.peers.get(peerId);
        if (!pc) {
            console.error(`[RoomConnectionManager] No connection found for: ${peerId}`);
            return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`[RoomConnectionManager] Added ICE candidate for: ${peerId}`);
    }
    
    sendToAll(data) {
        const message = JSON.stringify(data);
        let sentCount = 0;
        
        this.dataChannels.forEach((channel, peerId) => {
            if (channel.readyState === 'open') {
                try {
                    channel.send(message);
                    sentCount++;
                } catch (error) {
                    console.error(`[RoomConnectionManager] Failed to send to ${peerId}:`, error);
                }
            }
        });
        
        console.log(`[RoomConnectionManager] Sent message to ${sentCount} peers`);
        return sentCount;
    }
    
    sendToPeer(peerId, data) {
        const channel = this.dataChannels.get(peerId);
        if (!channel || channel.readyState !== 'open') {
            console.error(`[RoomConnectionManager] Cannot send to ${peerId} - channel not ready`);
            return false;
        }
        
        try {
            channel.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`[RoomConnectionManager] Failed to send to ${peerId}:`, error);
            return false;
        }
    }
    
    removePeer(peerId) {
        console.log(`[RoomConnectionManager] Removing peer: ${peerId}`);
        
        const pc = this.peers.get(peerId);
        if (pc) {
            pc.close();
            this.peers.delete(peerId);
        }
        
        const channel = this.dataChannels.get(peerId);
        if (channel) {
            channel.close();
            this.dataChannels.delete(peerId);
        }
        
        this.onPeerDisconnected(peerId);
    }
    
    getConnectedPeers() {
        return Array.from(this.dataChannels.keys()).filter(peerId => {
            const channel = this.dataChannels.get(peerId);
            return channel && channel.readyState === 'open';
        });
    }
    
    destroy() {
        console.log(`[RoomConnectionManager] Destroying all connections for room: ${this.roomId}`);
        
        this.dataChannels.forEach(channel => channel.close());
        this.dataChannels.clear();
        
        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }
    
    // Event callbacks (to be overridden)
    onIceCandidate(peerId, candidate) {}
    onDataReceived(peerId, data) {}
    onPeerConnected(peerId) {}
    onDataChannelOpen(peerId) {}
    onPeerDisconnected(peerId) {}
}
