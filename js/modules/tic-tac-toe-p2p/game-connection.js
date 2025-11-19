// PKC Module: tic-tac-toe-p2p/game-connection
// Purpose: WebRTC connection manager for game rooms
// Based on the existing p2p-serverless connection system
// Version: 2.0 - Fixed with P2P module pattern

console.log('[GameConnection] Loading version 2.0 - P2P pattern implementation');

/**
 * Game Connection Manager
 * Handles WebRTC connections for game rooms with invitation system
 */
export class GameConnection {
  constructor(config = {}) {
    this.config = {
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      dataChannelOptions: {
        ordered: true,
        maxRetransmits: 3
      },
      ...config
    };
    
    // Like P2P module - use connections Map with peer tracking
    this.connections = new Map(); // peerId -> connection object
    this.roomId = null;
    this.isHost = false;
    this.connectionState = 'disconnected';
    this.eventHandlers = new Map();
    this.currentPeerId = null; // Track current peer
  }
  
  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }
  
  /**
   * Emit event to handlers
   */
  _emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[GameConnection] Error in ${event} handler:`, error);
      }
    });
  }
  
  /**
   * Create invitation (exactly like P2P module createOffer)
   */
  async createInvitation() {
    try {
      this._emit('connection-state-change', { 
        state: 'creating-invitation', 
        message: 'Creating game invitation...' 
      });
      
      // Generate peer ID and room ID
      const peerId = this._generatePeerId();
      this.roomId = this._generateRoomId();
      this.isHost = true;
      this.currentPeerId = peerId;
      
      // Create peer connection (like P2P module)
      const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
      
      const peerConnection = {
        id: peerId,
        pc,
        dataChannel: null,
        iceCandidates: [],
        state: 'creating-offer',
        connectedAt: null
      };
      
      this.connections.set(peerId, peerConnection);
      
      // Create data channel (initiator creates it) - like P2P module
      const dataChannel = pc.createDataChannel('game', this.config.dataChannelOptions);
      peerConnection.dataChannel = dataChannel;
      this._setupDataChannel(peerId, dataChannel);
      
      // Setup ICE candidate collection (like P2P module)
      const iceCandidates = [];
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate.toJSON());
        }
      };
      
      // Setup connection state monitoring (like P2P module)
      this._setupConnectionMonitoring(peerId, pc);
      
      // Create offer (like P2P module)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Wait for ICE gathering to complete (like P2P module)
      await this._waitForICEGathering(pc);
      
      peerConnection.state = 'offer-created';
      
      // Create invitation with offer and ICE candidates (like P2P module)
      const invitation = this._createInvitation({
        version: '1.0',
        type: 'game-offer',
        roomId: this.roomId,
        peerId: peerId,
        offer: pc.localDescription.toJSON(),
        ice: iceCandidates
      });
      
      this.connectionState = 'waiting-for-peer';
      this._emit('connection-state-change', { 
        state: 'waiting-for-peer', 
        message: 'Game room created! Share invitation to start playing.' 
      });
      
      return {
        roomId: this.roomId,
        invitation: invitation,
        url: invitation // For compatibility
      };
      
    } catch (error) {
      this.connectionState = 'error';
      this._emit('connection-error', error);
      throw error;
    }
  }
  
  /**
   * Accept invitation (exactly like P2P module acceptOffer)
   * Returns answer data that must be sent back to the inviter
   */
  async acceptInvitation(invitationCode) {
    try {
      this._emit('connection-state-change', { 
        state: 'accepting-invitation', 
        message: 'Accepting game invitation...' 
      });
      
      // Parse invitation (like P2P module)
      const invitationData = this._parseInvitation(invitationCode);
      if (!invitationData || invitationData.type !== 'game-offer') {
        throw new Error('Invalid game invitation');
      }
      
      this.roomId = invitationData.roomId;
      this.isHost = false;
      
      // Create peer connection (exactly like P2P module acceptOffer)
      const peerId = invitationData.peerId;
      const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
      
      const peerConnection = {
        id: peerId,
        pc,
        dataChannel: null,
        iceCandidates: [],
        state: 'accepting-offer',
        connectedAt: null
      };
      
      this.connections.set(peerId, peerConnection);
      
      // Setup data channel handler (responder receives it) - like P2P module
      pc.ondatachannel = (event) => {
        peerConnection.dataChannel = event.channel;
        this._setupDataChannel(peerId, event.channel);
      };
      
      // Setup ICE candidate collection (like P2P module)
      const localIceCandidates = [];
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          localIceCandidates.push(event.candidate.toJSON());
        }
      };
      
      // Setup connection state monitoring (like P2P module)
      this._setupConnectionMonitoring(peerId, pc);
      
      // Set remote offer (like P2P module)
      await pc.setRemoteDescription(new RTCSessionDescription(invitationData.offer));
      
      // Add remote ICE candidates (like P2P module)
      for (const candidate of invitationData.ice) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.warn('[GameConnection] Failed to add ICE candidate:', error);
        }
      }
      
      // Create answer (like P2P module)
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Wait for ICE gathering (like P2P module)
      await this._waitForICEGathering(pc);
      
      peerConnection.state = 'answer-created';
      
      // Create answer invitation (like P2P module)
      const answerInvitation = this._createInvitation({
        version: '1.0',
        type: 'game-answer',
        roomId: this.roomId,
        peerId: peerId,
        answer: pc.localDescription.toJSON(),
        ice: localIceCandidates
      });
      
      this.connectionState = 'waiting-for-completion';
      this._emit('connection-state-change', { 
        state: 'answer-generated', 
        message: 'Answer generated - send it back to the host!' 
      });
      
      return {
        roomId: this.roomId,
        answerInvitation: answerInvitation
      };
      
    } catch (error) {
      this.connectionState = 'error';
      this._emit('connection-error', error);
      throw error;
    }
  }
  
  /**
   * Complete connection (exactly like P2P module applyAnswer)
   */
  async completeConnection(answerInvitation) {
    if (!this.isHost) {
      throw new Error('Only host can complete connection');
    }
    
    try {
      console.log('[GameConnection] 🔄 Starting completeConnection...');
      this._emit('connection-state-change', { 
        state: 'completing-connection', 
        message: 'Completing connection...' 
      });
      
      // Parse answer invitation (like P2P module)
      console.log('[GameConnection] 📝 Parsing answer invitation...');
      const answerData = this._parseInvitation(answerInvitation);
      console.log('[GameConnection] ✅ Answer data parsed:', {
        type: answerData.type,
        peerId: answerData.peerId,
        hasAnswer: !!answerData.answer,
        iceCandidatesCount: answerData.ice?.length || 0
      });
      
      if (!answerData || answerData.type !== 'game-answer') {
        throw new Error('Invalid answer data');
      }
      
      // Find the peer connection (like P2P module applyAnswer)
      const peerConnection = this.connections.get(answerData.peerId);
      if (!peerConnection) {
        const knownPeers = Array.from(this.connections.keys());
        console.error('[GameConnection] Known peers:', knownPeers);
        console.error('[GameConnection] Requested peer:', answerData.peerId);
        throw new Error(`Unknown peer: ${answerData.peerId}. Known peers: ${knownPeers.join(', ') || 'none'}`);
      }
      
      const { pc } = peerConnection;
      
      // Log current connection state
      console.log('[GameConnection] 📊 Current peer connection state:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState
      });
      
      // Set remote answer (like P2P module)
      console.log('[GameConnection] 🔗 Setting remote description (answer)...');
      await pc.setRemoteDescription(new RTCSessionDescription(answerData.answer));
      console.log('[GameConnection] ✅ Remote description set successfully');
      
      // Add remote ICE candidates (like P2P module)
      console.log('[GameConnection] 🧊 Adding ICE candidates from guest...');
      let successfulCandidates = 0;
      for (const candidate of answerData.ice) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          successfulCandidates++;
        } catch (error) {
          console.warn('[GameConnection] ❌ Failed to add ICE candidate:', error);
        }
      }
      console.log('[GameConnection] ✅ Added ICE candidates:', `${successfulCandidates}/${answerData.ice.length}`);
      
      peerConnection.state = 'connecting';
      this.connectionState = 'connecting';
      this._emit('connection-state-change', { 
        state: 'connection-completing', 
        message: `Connection setup complete! Added ${successfulCandidates} ICE candidates. Waiting for WebRTC...` 
      });
      
      // Log final state
      console.log('[GameConnection] 🏁 CompleteConnection finished. Final state:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState
      });
      
    } catch (error) {
      console.error('[GameConnection] ❌ CompleteConnection failed:', error);
      this.connectionState = 'error';
      this._emit('connection-error', error);
      throw error;
    }
  }
  
  /**
   * Leave current room (like P2P module disconnect)
   */
  async leaveRoom() {
    // Disconnect from all peers
    for (const [peerId, peerConnection] of this.connections) {
      const { pc, dataChannel } = peerConnection;
      
      if (dataChannel) {
        dataChannel.close();
      }
      
      pc.close();
    }
    
    this.connections.clear();
    this.roomId = null;
    this.isHost = false;
    this.connectionState = 'disconnected';
    this.currentPeerId = null;
  }
  
  /**
   * Send game message to peer (like P2P module broadcast)
   */
  sendGameMessage(message) {
    // Find connected peers with open data channels
    const connectedPeers = Array.from(this.connections.values())
      .filter(p => p.dataChannel && p.dataChannel.readyState === 'open');
    
    if (connectedPeers.length === 0) {
      console.warn('[GameConnection] No connected peers to send message to');
      return false;
    }
    
    const messageStr = JSON.stringify({
      timestamp: Date.now(),
      ...message
    });
    
    // Send to all connected peers
    for (const peer of connectedPeers) {
      try {
        peer.dataChannel.send(messageStr);
      } catch (error) {
        console.warn(`[GameConnection] Failed to send message to peer ${peer.id}:`, error);
      }
    }
    
    return true;
  }
  
  
  /**
   * Wait for ICE gathering to complete (exactly like P2P module)
   */
  async _waitForICEGathering(pc, timeout = 5000) {
    return new Promise((resolve) => {
      // If already complete, resolve immediately
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      
      const timeoutId = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', handler);
        resolve(); // Resolve even on timeout
      }, timeout);
      
      const handler = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeoutId);
          pc.removeEventListener('icegatheringstatechange', handler);
          resolve();
        }
      };
      
      pc.addEventListener('icegatheringstatechange', handler);
    });
  }
  
  /**
   * Setup connection monitoring (like P2P module)
   */
  _setupConnectionMonitoring(peerId, pc) {
    pc.onconnectionstatechange = () => {
      console.log(`[GameConnection] Connection state for ${peerId}:`, pc.connectionState);
      this._emit('connection:state', { peerId, state: pc.connectionState });
      
      const peerConnection = this.connections.get(peerId);
      if (peerConnection) {
        peerConnection.state = pc.connectionState;
        
        if (pc.connectionState === 'connected') {
          peerConnection.connectedAt = new Date();
          this._emit('peer-connected', peerId);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this._emit('peer-disconnected', peerId);
        }
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`[GameConnection] ICE connection state for ${peerId}:`, pc.iceConnectionState);
      this._emit('ice:state', { peerId, state: pc.iceConnectionState });
    };
  }
  
  /**
   * Setup data channel (like P2P module)
   */
  _setupDataChannel(peerId, dataChannel) {
    dataChannel.onopen = () => {
      console.log(`[GameConnection] Data channel opened for peer ${peerId}`);
      this._emit('data-channel-ready', peerId);
    };
    
    dataChannel.onclose = () => {
      console.log(`[GameConnection] Data channel closed for peer ${peerId}`);
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._emit('game-message', { peerId, message });
      } catch (error) {
        console.error(`[GameConnection] Failed to parse message from ${peerId}:`, error);
      }
    };
    
    dataChannel.onerror = (error) => {
      console.error(`[GameConnection] Data channel error for ${peerId}:`, error);
      this._emit('connection-error', error);
    };
  }
  
  /**
   * Generate peer ID (like P2P module)
   */
  _generatePeerId() {
    return 'peer_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
  
  /**
   * Create invitation string
   */
  _createInvitation(data) {
    const invitationObj = {
      version: '1.0',
      ...data
    };
    
    // Encode as base64 for easy sharing
    const jsonStr = JSON.stringify(invitationObj);
    return btoa(jsonStr);
  }
  
  /**
   * Parse invitation string
   */
  _parseInvitation(invitation) {
    try {
      const jsonStr = atob(invitation);
      const data = JSON.parse(jsonStr);
      
      // Accept both game-offer and game-answer types
      if (data.type !== 'game-offer' && data.type !== 'game-answer') {
        throw new Error('Invalid invitation type: ' + data.type);
      }
      
      return data;
    } catch (error) {
      throw new Error('Invalid invitation format: ' + error.message);
    }
  }
  
  /**
   * Generate unique room ID
   */
  _generateRoomId() {
    return 'room_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}
