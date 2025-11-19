// PKC Module: tic-tac-toe-p2p/simple-connection
// Purpose: Simplified WebRTC connection that works automatically
// Based on research - connections should be automatic, not manual

/**
 * Simple Game Connection Manager
 * Handles automatic WebRTC connections without manual answer exchange
 */
export class SimpleGameConnection {
  constructor(config = {}) {
    this.config = {
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      ...config
    };
    
    this.peerConnection = null;
    this.dataChannel = null;
    this.roomId = null;
    this.isHost = false;
    this.connectionState = 'disconnected';
    this.eventHandlers = new Map();
    
    // For automatic connection
    this.localOffer = null;
    this.localAnswer = null;
    this.remoteOffer = null;
    this.iceCandidates = [];
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
        console.error(`[SimpleGameConnection] Error in ${event} handler:`, error);
      }
    });
  }
  
  /**
   * Create a new game room (host) - returns invitation that includes everything
   */
  async createRoom() {
    this.roomId = this._generateRoomId();
    this.isHost = true;
    this.connectionState = 'creating-offer';
    
    try {
      this._emit('connection-state-change', { 
        state: 'creating-offer', 
        message: 'Creating room...' 
      });
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({ 
        iceServers: this.config.iceServers 
      });
      
      // Setup connection handlers
      this._setupPeerConnectionHandlers();
      
      // Create data channel (host creates it)
      this.dataChannel = this.peerConnection.createDataChannel('game', { 
        ordered: true 
      });
      this._setupDataChannelHandlers();
      
      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.localOffer = offer;
      
      // Wait for ICE candidates
      await this._waitForInitialIceCandidates();
      
      // Create invitation with everything needed
      const invitation = this._createInvitation({
        roomId: this.roomId,
        offer: this.localOffer,
        iceCandidates: this.iceCandidates,
        type: 'game-invitation'
      });
      
      this.connectionState = 'waiting-for-peer';
      this._emit('connection-state-change', { 
        state: 'waiting-for-peer', 
        message: 'Room created! Share invitation to start playing.' 
      });
      
      return {
        roomId: this.roomId,
        invitation: invitation
      };
      
    } catch (error) {
      this.connectionState = 'error';
      this._emit('connection-error', error);
      throw error;
    }
  }
  
  /**
   * Join room and establish connection automatically
   */
  async joinRoom(invitation) {
    try {
      this._emit('connection-state-change', { 
        state: 'joining', 
        message: 'Joining room...' 
      });
      
      const invitationData = this._parseInvitation(invitation);
      this.roomId = invitationData.roomId;
      this.isHost = false;
      this.remoteOffer = invitationData.offer;
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({ 
        iceServers: this.config.iceServers 
      });
      
      // Setup connection handlers
      this._setupPeerConnectionHandlers();
      
      // Set remote description (offer from host)
      await this.peerConnection.setRemoteDescription(this.remoteOffer);
      
      // Add ICE candidates from host
      for (const candidate of invitationData.iceCandidates) {
        try {
          await this.peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.warn('[SimpleGameConnection] Failed to add ICE candidate:', error);
        }
      }
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.localAnswer = answer;
      
      // Wait for ICE candidates
      await this._waitForInitialIceCandidates();
      
      this.connectionState = 'connecting';
      this._emit('connection-state-change', { 
        state: 'connecting', 
        message: 'Connecting to host...' 
      });
      
      // Connection will complete automatically via ICE
      return {
        roomId: this.roomId
      };
      
    } catch (error) {
      this.connectionState = 'error';
      this._emit('connection-error', error);
      throw error;
    }
  }
  
  /**
   * Send game message to peer
   */
  sendGameMessage(message) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[SimpleGameConnection] Cannot send message, data channel not open');
      return false;
    }
    
    try {
      const messageStr = JSON.stringify({
        timestamp: Date.now(),
        ...message
      });
      this.dataChannel.send(messageStr);
      return true;
    } catch (error) {
      console.error('[SimpleGameConnection] Failed to send message:', error);
      return false;
    }
  }
  
  /**
   * Leave current room
   */
  async leaveRoom() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.roomId = null;
    this.isHost = false;
    this.connectionState = 'disconnected';
    this.iceCandidates = [];
    this.localOffer = null;
    this.localAnswer = null;
    this.remoteOffer = null;
  }
  
  /**
   * Setup peer connection event handlers
   */
  _setupPeerConnectionHandlers() {
    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.iceCandidates.push(event.candidate);
        console.log('[SimpleGameConnection] New ICE candidate');
      }
    };
    
    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('[SimpleGameConnection] Connection state:', state);
      
      switch (state) {
        case 'connecting':
          this._emit('connection-state-change', { 
            state: 'connecting', 
            message: 'Establishing connection...' 
          });
          break;
        case 'connected':
          this.connectionState = 'connected';
          this._emit('connection-state-change', { 
            state: 'connected', 
            message: '✅ Connected! Peer joined the room.' 
          });
          this._emit('peer-connected', this.roomId);
          break;
        case 'disconnected':
          this.connectionState = 'disconnected';
          this._emit('connection-state-change', { 
            state: 'disconnected', 
            message: 'Peer disconnected' 
          });
          this._emit('peer-disconnected', this.roomId);
          break;
        case 'failed':
          this.connectionState = 'failed';
          this._emit('connection-state-change', { 
            state: 'failed', 
            message: 'Connection failed' 
          });
          break;
      }
    };
    
    // Data channel handling (guest receives from host)
    this.peerConnection.ondatachannel = (event) => {
      if (!this.isHost) {
        console.log('[SimpleGameConnection] Received data channel from host');
        this.dataChannel = event.channel;
        this._setupDataChannelHandlers();
      }
    };
  }
  
  /**
   * Setup data channel event handlers
   */
  _setupDataChannelHandlers() {
    this.dataChannel.onopen = () => {
      console.log('[SimpleGameConnection] Data channel opened - ready for game!');
      this._emit('connection-state-change', { 
        state: 'ready', 
        message: '🎮 Ready to play! You can now make moves.' 
      });
      this._emit('data-channel-ready');
    };
    
    this.dataChannel.onclose = () => {
      console.log('[SimpleGameConnection] Data channel closed');
    };
    
    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._emit('game-message', message);
      } catch (error) {
        console.error('[SimpleGameConnection] Failed to parse message:', error);
      }
    };
    
    this.dataChannel.onerror = (error) => {
      console.error('[SimpleGameConnection] Data channel error:', error);
      this._emit('connection-error', error);
    };
  }
  
  /**
   * Wait for initial ICE candidates (not all, just enough to start)
   */
  _waitForInitialIceCandidates() {
    return new Promise((resolve) => {
      // Wait a short time for ICE candidates, then proceed
      setTimeout(() => {
        console.log(`[SimpleGameConnection] Collected ${this.iceCandidates.length} ICE candidates`);
        resolve();
      }, 2000); // 2 seconds should be enough for initial candidates
    });
  }
  
  /**
   * Create invitation string
   */
  _createInvitation(data) {
    const invitationObj = {
      version: '2.0',
      type: 'tic-tac-toe-simple',
      timestamp: Date.now(),
      ...data
    };
    
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
      
      if (data.type !== 'tic-tac-toe-simple') {
        throw new Error('Invalid invitation type');
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
    return 'simple_' + Math.random().toString(36).substr(2, 8) + '_' + Date.now().toString(36);
  }
}
