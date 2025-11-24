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
        
        // Perfect Negotiation Pattern: Track negotiation state per peer
        this.makingOffer = new Map(); // peerId -> boolean
        this.ignoreOffer = new Map(); // peerId -> boolean
        
        // Robustness: Track connection health and retry attempts
        this.connectionHealthChecks = new Map(); // peerId -> interval ID
        this.reconnectAttempts = new Map(); // peerId -> count
        this.maxReconnectAttempts = 3;
        
        // Duplicate offer prevention: Track processed offers by fingerprint
        this.processedOffers = new Map(); // peerId -> Set of offer fingerprints
        this.offerProcessingLocks = new Map(); // peerId -> boolean
        
        // Duplicate answer prevention: Track answer processing
        this.answerProcessingLocks = new Map(); // peerId -> boolean
        
        // ICE servers for NAT traversal - will be loaded from config
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        // Load ICE servers from config
        this._loadIceServers();
        
        console.log(`[RoomConnectionManager] Created for room: ${roomId}`);
        
        // Debug: Log all connection attempts
        this._debugLog = true;
    }
    
    _log(...args) {
        if (this._debugLog) {
            console.log(`[RoomConnection:${this.roomId.substring(0, 8)}]`, ...args);
        }
    }
    
    async _loadIceServers() {
        // Priority 1: Check for global STUN servers from environment (set by config.js)
        if (window.__STUN_SERVERS__ && window.__STUN_SERVERS__.length > 0) {
            this.iceServers = { iceServers: window.__STUN_SERVERS__ };
            console.log('🌐 [RoomConnectionManager] Loaded ICE servers from environment:');
            window.__STUN_SERVERS__.forEach((server, index) => {
                console.log(`   ${index + 1}. ${server.urls}`);
            });
            return;
        }
        
        // Priority 2: Try to load from app-config.json (fallback for local dev)
        try {
            const response = await fetch('/app-config.json');
            if (response.ok) {
                const config = await response.json();
                if (config.p2p && config.p2p.iceServers) {
                    this.iceServers = { iceServers: config.p2p.iceServers };
                    console.log('🌐 [RoomConnectionManager] Loaded ICE servers from app-config.json:');
                    config.p2p.iceServers.forEach((server, index) => {
                        console.log(`   ${index + 1}. ${server.urls}`);
                    });
                    return;
                }
            }
        } catch (error) {
            console.warn('[RoomConnectionManager] Could not load ICE servers from app-config.json:', error.message);
        }
        
        // Priority 3: Use defaults (Google STUN)
        console.log('🌐 [RoomConnectionManager] Using default ICE servers (Google STUN)');
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
        
        // Determine if we are "polite" peer (lower ID = polite)
        const isPolite = this.userId < peerId;
        this._log(`🎭 Role: ${isPolite ? 'POLITE' : 'IMPOLITE'} (${this.userId} vs ${peerId})`);
        
        // Check if connection already exists
        if (this.peers.has(peerId)) {
            const existingPc = this.peers.get(peerId);
            const existingState = existingPc.connectionState;
            const existingSignalingState = existingPc.signalingState;
            
            this._log(`⚠️ Connection already exists for peer: ${peerId}`);
            this._log(`   Connection state: ${existingState}, Signaling state: ${existingSignalingState}`);
            
            // If connection is fully established and stable, keep it
            if (existingState === 'connected' && existingSignalingState === 'stable') {
                this._log(`✅ Keeping existing stable connection`);
                return existingPc;
            }
            
            // Otherwise, close the old connection and create a new one
            // DON'T call removePeer() as it clears processing locks
            this._log(`🔄 Closing old connection (state: ${existingState}) to create fresh one`);
            
            // Stop health monitoring
            this.stopConnectionHealthCheck(peerId);
            
            // Close and remove the old peer connection
            existingPc.close();
            this.peers.delete(peerId);
            
            // Close and remove the old data channel
            const existingChannel = this.dataChannels.get(peerId);
            if (existingChannel) {
                existingChannel.close();
                this.dataChannels.delete(peerId);
            }
            
            // Clear negotiation state (but keep processing locks!)
            this.makingOffer.delete(peerId);
            this.ignoreOffer.delete(peerId);
        }
        
        // Initialize negotiation state
        this.makingOffer.set(peerId, false);
        this.ignoreOffer.set(peerId, false);
        
        // Log STUN servers being used
        console.log(`🌐 [RoomConnectionManager] Creating peer connection with STUN servers:`);
        this.iceServers.iceServers.forEach((server, index) => {
            console.log(`   ${index + 1}. ${server.urls}`);
        });
        
        const pc = new RTCPeerConnection(this.iceServers);
        this.peers.set(peerId, pc);
        
        // Add local stream if available (for video/audio)
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }
        
        // Create data channel for chat messages
        // Only create if we are the initiator (to avoid duplicates)
        if (isInitiator) {
            const dataChannel = pc.createDataChannel('chat', { ordered: true });
            this.setupDataChannel(peerId, dataChannel);
            this._log(`📺 Created DataChannel as initiator for: ${peerId}`);
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
            } else if (pc.connectionState === 'failed') {
                this._log(`❌ PEER FAILED: ${peerId} - will retry`);
                // Don't immediately remove on 'failed', give it a chance to reconnect
                // Only remove if still failed after 5 seconds AND DataChannel is closed
                setTimeout(() => {
                    // CRITICAL: Check if this is still the current peer connection
                    // A new connection might have been created during the timeout
                    const currentPc = this.peers.get(peerId);
                    if (currentPc !== pc) {
                        this._log(`✅ New peer connection created for ${peerId} - ignoring old timeout`);
                        return;
                    }
                    
                    const channel = this.dataChannels.get(peerId);
                    const channelOpen = channel && channel.readyState === 'open';
                    
                    if (pc.connectionState === 'failed' && !channelOpen) {
                        this._log(`❌ PEER STILL FAILED after timeout: ${peerId} - removing`);
                        this.removePeer(peerId);
                    } else if (channelOpen) {
                        this._log(`✅ PEER connectionState is 'failed' but DataChannel is OPEN - keeping connection`);
                    }
                }, 5000);
            } else if (pc.connectionState === 'disconnected') {
                this._log(`⚠️ PEER DISCONNECTED: ${peerId} - waiting for reconnect`);
                // Don't immediately remove on 'disconnected', it might reconnect
                // Only remove if still disconnected after 10 seconds AND DataChannel is closed
                setTimeout(() => {
                    // CRITICAL: Check if this is still the current peer connection
                    // A new connection might have been created during the timeout
                    const currentPc = this.peers.get(peerId);
                    if (currentPc !== pc) {
                        this._log(`✅ New peer connection created for ${peerId} - ignoring old timeout`);
                        return;
                    }
                    
                    const channel = this.dataChannels.get(peerId);
                    const channelOpen = channel && channel.readyState === 'open';
                    
                    if (pc.connectionState === 'disconnected' && !channelOpen) {
                        this._log(`❌ PEER STILL DISCONNECTED after timeout: ${peerId} - removing`);
                        this.removePeer(peerId);
                    } else if (channelOpen) {
                        this._log(`✅ PEER connectionState is 'disconnected' but DataChannel is OPEN - keeping connection`);
                    }
                }, 10000);
            }
        };
        
        // Also log ICE connection state
        pc.oniceconnectionstatechange = () => {
            this._log(`🧊 ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
            
            // Handle ICE failures with restart capability
            if (pc.iceConnectionState === 'failed') {
                this._log(`🔄 ICE FAILED for ${peerId} - attempting ICE restart`);
                this.attemptIceRestart(peerId, pc);
            } else if (pc.iceConnectionState === 'disconnected') {
                this._log(`⚠️ ICE DISCONNECTED for ${peerId} - monitoring`);
                // Give it time to reconnect naturally
                setTimeout(() => {
                    if (pc.iceConnectionState === 'disconnected') {
                        this._log(`🔄 ICE still disconnected for ${peerId} - attempting restart`);
                        this.attemptIceRestart(peerId, pc);
                    }
                }, 3000);
            } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                this._log(`✅ ICE CONNECTED for ${peerId}`);
                // Reset reconnect attempts on successful connection
                this.reconnectAttempts.set(peerId, 0);
                // Start health monitoring
                this.startConnectionHealthCheck(peerId);
            }
        };
        
        // Log signaling state
        pc.onsignalingstatechange = () => {
            this._log(`📡 Signaling state with ${peerId}: ${pc.signalingState}`);
        };
        
        return pc;
    }
    
    setupDataChannel(peerId, channel) {
        this._log(`📺 Setting up data channel with: ${peerId}`);
        
        channel.onopen = async () => {
            this._log(`✅ DATA CHANNEL OPENED with: ${peerId}`);
            
            // CRITICAL: Wait for readyState to be truly 'open' before adding to map
            // The onopen event can fire before readyState === 'open' for sending
            let retries = 0;
            while (retries < 50 && channel.readyState !== 'open') {
                await new Promise(resolve => setTimeout(resolve, 20));
                retries++;
            }
            
            if (channel.readyState === 'open') {
                this._log(`✅ Channel readyState confirmed 'open' after ${retries * 20}ms`);
                this.dataChannels.set(peerId, channel);
                this._log(`📋 Added channel to map. Total channels: ${this.dataChannels.size}`);
            } else {
                this._log(`⚠️ Channel readyState still '${channel.readyState}' after ${retries * 20}ms`);
                // Add anyway and hope it becomes ready soon
                this.dataChannels.set(peerId, channel);
                this._log(`📋 Added channel to map (not ready). Total channels: ${this.dataChannels.size}`);
            }
            
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
            console.log(`[RoomConnectionManager] 📋 Removed channel from map. Total channels: ${this.dataChannels.size}`);
        };
    }
    
    async createOffer(peerId) {
        this._log(`📤 Creating offer for: ${peerId}`);
        const pc = await this.createPeerConnection(peerId, true);
        
        try {
            // Set makingOffer flag to detect collisions
            this.makingOffer.set(peerId, true);
            
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
        } finally {
            this.makingOffer.set(peerId, false);
        }
    }
    
    async handleOffer(peerId, offer) {
        this._log(`📥 Received offer from: ${peerId}`);
        
        // CRITICAL: Set processing lock FIRST to prevent race condition
        // Check if we're currently processing ANY offer from this peer
        if (this.offerProcessingLocks.get(peerId)) {
            this._log(`⚠️ Already processing an offer from ${peerId} - ignoring concurrent offer`);
            return;
        }
        
        // IMMEDIATELY set lock before any async operations
        this.offerProcessingLocks.set(peerId, true);
        
        // Create a fingerprint of this offer to detect exact duplicates
        const offerFingerprint = JSON.stringify(offer).substring(0, 100); // First 100 chars as fingerprint
        
        // Check if we've already processed this exact offer
        if (!this.processedOffers.has(peerId)) {
            this.processedOffers.set(peerId, new Set());
        }
        
        if (this.processedOffers.get(peerId).has(offerFingerprint)) {
            this._log(`⚠️ Already processed this exact offer from ${peerId} - ignoring duplicate`);
            // Clear lock since we're not processing
            this.offerProcessingLocks.set(peerId, false);
            return;
        }
        
        // Mark this offer as processed
        this.processedOffers.get(peerId).add(offerFingerprint);
        
        try {
            // Determine if we are polite peer
            const isPolite = this.userId < peerId;
            
            // Perfect Negotiation: Handle offer collision
            // Only check signaling state if peer connection exists
            const existingPeer = this.peers.get(peerId);
            const offerCollision = 
                (offer.type === 'offer') &&
                (this.makingOffer.get(peerId) || (existingPeer && existingPeer.signalingState !== 'stable'));
            
            this.ignoreOffer.set(peerId, !isPolite && offerCollision);
            
            if (this.ignoreOffer.get(peerId)) {
                this._log(`🚫 IGNORING offer from ${peerId} (we are impolite and have collision)`);
                return;
            }
            
            this._log(`✅ ACCEPTING offer from ${peerId} (${isPolite ? 'polite' : 'impolite'} peer)`);
            
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
                this._log(`❌ No signaling service available! (might be destroyed)`);
                // Don't throw error, connection might still work if already established
            }
            
            return answer;
        } catch (error) {
            this._log(`❌ Error handling offer from ${peerId}:`, error);
            // Remove from processed offers on error so it can be retried
            if (this.processedOffers.has(peerId)) {
                this.processedOffers.get(peerId).delete(offerFingerprint);
            }
            throw error;
        } finally {
            // Clear processing lock after a delay to prevent rapid re-processing
            setTimeout(() => {
                this.offerProcessingLocks.set(peerId, false);
            }, 2000); // Increased from 1000ms to 2000ms
            
            // Clean up old offer fingerprints after 10 seconds to prevent memory leak
            setTimeout(() => {
                if (this.processedOffers.has(peerId)) {
                    this.processedOffers.get(peerId).delete(offerFingerprint);
                }
            }, 10000);
        }
    }
    
    async handleAnswer(peerId, answer) {
        this._log(`📥 Received answer from: ${peerId}`);
        
        // CRITICAL: Check if we're already processing an answer from this peer
        if (this.answerProcessingLocks.get(peerId)) {
            this._log(`⚠️ Already processing answer from ${peerId} - ignoring duplicate`);
            return;
        }
        
        // IMMEDIATELY set lock before any async operations
        this.answerProcessingLocks.set(peerId, true);
        
        try {
            const pc = this.peers.get(peerId);
            if (!pc) {
                this._log(`❌ No connection found for: ${peerId}`);
                return;
            }
            
            // Check if we're in the correct state to receive an answer
            // Answer can only be set when signalingState is 'have-local-offer'
            if (pc.signalingState !== 'have-local-offer') {
                this._log(`⚠️ Ignoring answer from ${peerId} - wrong signaling state: ${pc.signalingState} (expected: have-local-offer)`);
                return;
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            this._log(`✅ Set remote description (answer) from: ${peerId}`);
        } catch (error) {
            this._log(`❌ Error setting remote description (answer) from ${peerId}:`, error.message);
            // Don't throw - just log and continue
        } finally {
            // Clear lock after a delay
            setTimeout(() => {
                this.answerProcessingLocks.set(peerId, false);
            }, 1000);
        }
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
        if (!channel) {
            console.error(`[RoomConnectionManager] Cannot send to ${peerId} - channel not found in map`);
            console.error(`[RoomConnectionManager] Available channels:`, Array.from(this.dataChannels.keys()));
            return false;
        }
        if (channel.readyState !== 'open') {
            console.error(`[RoomConnectionManager] Cannot send to ${peerId} - channel state: ${channel.readyState}`);
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
        
        // Stop health monitoring
        this.stopConnectionHealthCheck(peerId);
        
        // Clear reconnect attempts
        this.reconnectAttempts.delete(peerId);
        
        // Clear offer and answer processing state
        this.processedOffers.delete(peerId);
        this.offerProcessingLocks.delete(peerId);
        this.answerProcessingLocks.delete(peerId);
        
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
        
        // Clear negotiation state
        this.makingOffer.delete(peerId);
        this.ignoreOffer.delete(peerId);
        
        // Notify that peer disconnected
        if (this.onPeerDisconnected) {
            this.onPeerDisconnected(peerId);
        }
    }
    
    getConnectedPeers() {
        return Array.from(this.dataChannels.keys()).filter(peerId => {
            const channel = this.dataChannels.get(peerId);
            return channel && channel.readyState === 'open';
        });
    }
    
    // ICE restart for failed connections
    async attemptIceRestart(peerId, pc) {
        const attempts = this.reconnectAttempts.get(peerId) || 0;
        
        if (attempts >= this.maxReconnectAttempts) {
            this._log(`❌ Max reconnect attempts reached for ${peerId} - giving up`);
            return;
        }
        
        this.reconnectAttempts.set(peerId, attempts + 1);
        this._log(`🔄 ICE restart attempt ${attempts + 1}/${this.maxReconnectAttempts} for ${peerId}`);
        
        try {
            // Create new offer with ICE restart
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            
            if (this.signaling) {
                this._log(`📡 Sending ICE restart offer to ${peerId}`);
                this.signaling.sendOffer(peerId, offer);
            }
        } catch (error) {
            this._log(`❌ ICE restart failed for ${peerId}:`, error);
        }
    }
    
    // Monitor connection health with periodic checks
    startConnectionHealthCheck(peerId) {
        // Clear any existing health check
        this.stopConnectionHealthCheck(peerId);
        
        // Check connection health every 5 seconds
        const intervalId = setInterval(() => {
            const pc = this.peers.get(peerId);
            const channel = this.dataChannels.get(peerId);
            
            if (!pc || !channel) {
                this.stopConnectionHealthCheck(peerId);
                return;
            }
            
            // Check if connection is healthy
            const isHealthy = 
                (pc.connectionState === 'connected' || pc.connectionState === 'new') &&
                (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') &&
                channel.readyState === 'open';
            
            if (!isHealthy) {
                this._log(`⚠️ Health check failed for ${peerId}: conn=${pc.connectionState}, ice=${pc.iceConnectionState}, channel=${channel.readyState}`);
            }
        }, 5000);
        
        this.connectionHealthChecks.set(peerId, intervalId);
    }
    
    stopConnectionHealthCheck(peerId) {
        const intervalId = this.connectionHealthChecks.get(peerId);
        if (intervalId) {
            clearInterval(intervalId);
            this.connectionHealthChecks.delete(peerId);
        }
    }
    
    destroy() {
        console.log(`[RoomConnectionManager] Destroying all connections for room: ${this.roomId}`);
        
        // Stop all health checks
        this.connectionHealthChecks.forEach((intervalId, peerId) => {
            clearInterval(intervalId);
        });
        this.connectionHealthChecks.clear();
        
        // Clear all reconnect attempts
        this.reconnectAttempts.clear();
        
        // Clear offer and answer processing state
        this.processedOffers.clear();
        this.offerProcessingLocks.clear();
        this.answerProcessingLocks.clear();
        
        // CRITICAL: Destroy signaling first to stop receiving new offers/answers
        if (this.signaling) {
            console.log(`[RoomConnectionManager] Destroying signaling service`);
            if (this.signaling.destroy) {
                this.signaling.destroy();
            }
            this.signaling = null;
        }
        
        this.dataChannels.forEach(channel => channel.close());
        this.dataChannels.clear();
        
        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        
        // Clear negotiation state
        this.makingOffer.clear();
        this.ignoreOffer.clear();
        
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
