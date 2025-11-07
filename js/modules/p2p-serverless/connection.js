// PKC Module: p2p-serverless/connection
// Purpose: WebRTC connection manager for serverless P2P
// Handles peer connection lifecycle, ICE negotiation, and data channels

/**
 * WebRTC Connection Manager
 * Manages individual peer connections using native WebRTC APIs
 */
export class ConnectionManager {
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
    
    this.connections = new Map(); // peerId -> PeerConnection
    this.eventHandlers = new Map();
  }

  /**
   * Create a new peer connection and generate an offer
   * @returns {Promise<{peerId: string, offer: RTCSessionDescriptionInit, ice: RTCIceCandidate[]}>}
   */
  async createOffer() {
    const peerId = this._generatePeerId();
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
    
    // Create data channel (initiator creates it)
    const dataChannel = pc.createDataChannel('data', this.config.dataChannelOptions);
    peerConnection.dataChannel = dataChannel;
    this._setupDataChannel(peerId, dataChannel);
    
    // Setup ICE candidate collection
    const iceCandidates = [];
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidates.push(event.candidate.toJSON());
      }
    };
    
    // Setup connection state monitoring
    this._setupConnectionMonitoring(peerId, pc);
    
    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Wait for ICE gathering to complete
    await this._waitForICEGathering(pc);
    
    peerConnection.state = 'offer-created';
    
    return {
      peerId,
      offer: pc.localDescription.toJSON(),
      ice: iceCandidates
    };
  }

  /**
   * Accept an offer and create an answer
   * @param {string} peerId - Peer identifier
   * @param {RTCSessionDescriptionInit} offer - Remote offer
   * @param {RTCIceCandidate[]} iceCandidates - Remote ICE candidates
   * @returns {Promise<{answer: RTCSessionDescriptionInit, ice: RTCIceCandidate[]}>}
   */
  async acceptOffer(peerId, offer, iceCandidates = []) {
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
    
    // Setup data channel handler (responder receives it)
    pc.ondatachannel = (event) => {
      peerConnection.dataChannel = event.channel;
      this._setupDataChannel(peerId, event.channel);
    };
    
    // Setup ICE candidate collection
    const localIceCandidates = [];
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        localIceCandidates.push(event.candidate.toJSON());
      }
    };
    
    // Setup connection state monitoring
    this._setupConnectionMonitoring(peerId, pc);
    
    // Set remote offer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Add remote ICE candidates
    for (const candidate of iceCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[P2P] Failed to add ICE candidate:', e);
      }
    }
    
    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    // Wait for ICE gathering
    await this._waitForICEGathering(pc);
    
    peerConnection.state = 'answer-created';
    
    return {
      peerId: peerId, // Include peerId so it can be used in the answer invitation
      answer: pc.localDescription.toJSON(),
      ice: localIceCandidates
    };
  }

  /**
   * Complete connection by applying answer
   * @param {string} peerId - Peer identifier
   * @param {RTCSessionDescriptionInit} answer - Remote answer
   * @param {RTCIceCandidate[]} iceCandidates - Remote ICE candidates
   */
  async applyAnswer(peerId, answer, iceCandidates = []) {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      const knownPeers = Array.from(this.connections.keys());
      console.error('[P2P] Known peers:', knownPeers);
      console.error('[P2P] Requested peer:', peerId);
      throw new Error(`Unknown peer: ${peerId}. Known peers: ${knownPeers.join(', ') || 'none'}`);
    }
    
    const { pc } = peerConnection;
    
    // Set remote answer
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    
    // Add remote ICE candidates
    for (const candidate of iceCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[P2P] Failed to add ICE candidate:', e);
      }
    }
    
    peerConnection.state = 'connecting';
  }

  /**
   * Send data to a specific peer
   * @param {string} peerId - Peer identifier
   * @param {any} data - Data to send (will be JSON stringified)
   */
  send(peerId, data) {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection || !peerConnection.dataChannel) {
      throw new Error(`Peer not connected: ${peerId}`);
    }
    
    const { dataChannel } = peerConnection;
    if (dataChannel.readyState !== 'open') {
      throw new Error(`Data channel not open for peer: ${peerId}`);
    }
    
    const payload = JSON.stringify(data);
    dataChannel.send(payload);
  }

  /**
   * Broadcast data to all connected peers
   * @param {any} data - Data to broadcast
   */
  broadcast(data) {
    const connectedPeers = Array.from(this.connections.values())
      .filter(p => p.dataChannel && p.dataChannel.readyState === 'open');
    
    if (connectedPeers.length === 0) {
      console.warn('[P2P] No connected peers to broadcast to');
      return;
    }
    
    const payload = JSON.stringify(data);
    for (const peer of connectedPeers) {
      try {
        peer.dataChannel.send(payload);
      } catch (e) {
        console.warn(`[P2P] Failed to broadcast to peer ${peer.id}:`, e);
      }
    }
  }

  /**
   * Disconnect from a specific peer
   * @param {string} peerId - Peer identifier
   */
  disconnect(peerId) {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      return;
    }
    
    const { pc, dataChannel } = peerConnection;
    
    if (dataChannel) {
      dataChannel.close();
    }
    
    pc.close();
    this.connections.delete(peerId);
    
    this._emit('peer:disconnect', { peerId });
  }

  /**
   * Get list of connected peers
   * @returns {Array<{id: string, state: string, connectedAt: Date}>}
   */
  getPeers() {
    return Array.from(this.connections.values()).map(p => ({
      id: p.id,
      state: p.state,
      connectedAt: p.connectedAt
    }));
  }

  /**
   * Get connection statistics
   */
  async getStats(peerId) {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      return null;
    }
    
    const stats = await peerConnection.pc.getStats();
    const statsObj = {};
    stats.forEach((report) => {
      statsObj[report.id] = report;
    });
    
    return statsObj;
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Cleanup all connections
   */
  destroy() {
    for (const [peerId] of this.connections) {
      this.disconnect(peerId);
    }
    this.eventHandlers.clear();
  }

  // Private methods

  _generatePeerId() {
    return `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _setupDataChannel(peerId, dataChannel) {
    dataChannel.onopen = () => {
      console.log(`[P2P] Data channel opened for peer: ${peerId}`);
      const peerConnection = this.connections.get(peerId);
      if (peerConnection) {
        peerConnection.state = 'connected';
        peerConnection.connectedAt = new Date();
      }
      this._emit('peer:connect', { peerId });
    };
    
    dataChannel.onclose = () => {
      console.log(`[P2P] Data channel closed for peer: ${peerId}`);
      this.disconnect(peerId);
    };
    
    dataChannel.onerror = (error) => {
      console.error(`[P2P] Data channel error for peer ${peerId}:`, error);
      this._emit('error', { peerId, error });
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._emit('message', { peerId, data });
      } catch (e) {
        console.error('[P2P] Failed to parse message:', e);
      }
    };
  }

  _setupConnectionMonitoring(peerId, pc) {
    pc.onconnectionstatechange = () => {
      console.log(`[P2P] Connection state for ${peerId}:`, pc.connectionState);
      
      const peerConnection = this.connections.get(peerId);
      if (peerConnection) {
        peerConnection.state = pc.connectionState;
      }
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.disconnect(peerId);
      }
      
      this._emit('connection:state', { peerId, state: pc.connectionState });
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`[P2P] ICE connection state for ${peerId}:`, pc.iceConnectionState);
      this._emit('ice:state', { peerId, state: pc.iceConnectionState });
    };
  }

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

  _emit(event, data) {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(event);
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (e) {
        console.error(`[P2P] Error in event handler for ${event}:`, e);
      }
    }
  }
}
