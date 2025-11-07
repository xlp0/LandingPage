// PKC Module: p2p-serverless/discovery
// Purpose: Peer discovery mechanisms (BroadcastChannel, URL-based, QR codes)
// Enables serverless peer finding without external servers

/**
 * Peer Discovery Manager
 * Handles multiple discovery mechanisms for serverless P2P
 */
export class DiscoveryManager {
  constructor(config = {}) {
    this.config = {
      channelName: config.channelName || 'pkc-p2p-discovery',
      invitationTTL: config.invitationTTL || 300000, // 5 minutes
      ...config
    };
    
    this.broadcastChannel = null;
    this.localPeerId = this._generatePeerId();
    this.discoveredPeers = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Initialize discovery mechanisms
   */
  async init() {
    // Initialize BroadcastChannel for same-origin discovery
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(this.config.channelName);
        this.broadcastChannel.onmessage = (event) => {
          this._handleBroadcastMessage(event.data);
        };
        console.log('[P2P Discovery] BroadcastChannel initialized');
      } catch (e) {
        console.warn('[P2P Discovery] BroadcastChannel not available:', e);
      }
    }
    
    // Check for invitation in URL hash
    this._checkUrlInvitation();
  }

  /**
   * Announce presence to local peers via BroadcastChannel
   */
  announce() {
    if (!this.broadcastChannel) {
      console.warn('[P2P Discovery] BroadcastChannel not available');
      return;
    }
    
    const announcement = {
      type: 'peer:announce',
      peerId: this.localPeerId,
      timestamp: Date.now()
    };
    
    this.broadcastChannel.postMessage(announcement);
    console.log('[P2P Discovery] Announced presence');
  }

  /**
   * Create an invitation for remote peer connection
   * @param {Object} offerData - Connection offer data {offer, ice}
   * @returns {Object} Invitation with URL and QR code data
   */
  createInvitation(offerData) {
    const invitation = {
      version: '1.0',
      peerId: offerData.peerId,
      offer: offerData.offer,
      ice: offerData.ice,
      timestamp: Date.now(),
      expires: Date.now() + this.config.invitationTTL
    };
    
    // Encode invitation as base64 URL-safe string
    const encoded = this._encodeInvitation(invitation);
    
    // Create invitation URL
    const baseUrl = window.location.origin + window.location.pathname;
    const invitationUrl = `${baseUrl}#peer=${encoded}`;
    
    return {
      url: invitationUrl,
      invitation,
      encoded,
      qrData: invitationUrl,
      expires: new Date(invitation.expires)
    };
  }

  /**
   * Parse invitation from URL or encoded string
   * @param {string} urlOrEncoded - Full URL or encoded invitation string
   * @returns {Object|null} Parsed invitation or null if invalid
   */
  parseInvitation(urlOrEncoded) {
    try {
      let encoded;
      
      // Extract from URL if needed
      if (urlOrEncoded.includes('#peer=')) {
        const hash = urlOrEncoded.split('#peer=')[1];
        encoded = hash.split('&')[0]; // Handle additional hash params
      } else if (urlOrEncoded.startsWith('http')) {
        // Try to parse as URL
        const url = new URL(urlOrEncoded);
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);
        encoded = params.get('peer');
      } else {
        encoded = urlOrEncoded;
      }
      
      if (!encoded) {
        return null;
      }
      
      const invitation = this._decodeInvitation(encoded);
      
      // Validate invitation
      if (!this._validateInvitation(invitation)) {
        console.error('[P2P Discovery] Invalid invitation');
        return null;
      }
      
      // Check expiration
      if (invitation.expires < Date.now()) {
        console.error('[P2P Discovery] Invitation expired');
        return null;
      }
      
      return invitation;
    } catch (e) {
      console.error('[P2P Discovery] Failed to parse invitation:', e);
      return null;
    }
  }

  /**
   * Create answer invitation for connection completion
   * @param {Object} answerData - Connection answer data {peerId, answer, ice}
   * @returns {Object} Answer invitation
   */
  createAnswerInvitation(answerData) {
    const invitation = {
      version: '1.0',
      type: 'answer',
      peerId: answerData.peerId, // Use the peerId from the original offer
      answer: answerData.answer,
      ice: answerData.ice,
      timestamp: Date.now()
    };
    
    const encoded = this._encodeInvitation(invitation);
    
    return {
      encoded,
      invitation
    };
  }

  /**
   * Get discovered peers from BroadcastChannel
   * @returns {Array} List of discovered peer IDs
   */
  getDiscoveredPeers() {
    return Array.from(this.discoveredPeers.keys());
  }

  /**
   * Clear expired peer discoveries
   */
  pruneExpiredPeers() {
    const now = Date.now();
    const timeout = 30000; // 30 seconds
    
    for (const [peerId, timestamp] of this.discoveredPeers) {
      if (now - timestamp > timeout) {
        this.discoveredPeers.delete(peerId);
        this._emit('peer:lost', { peerId });
      }
    }
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
   * Remove event handler
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
   * Cleanup resources
   */
  destroy() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.discoveredPeers.clear();
    this.eventHandlers.clear();
  }

  // Private methods

  _generatePeerId() {
    return `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _encodeInvitation(invitation) {
    const json = JSON.stringify(invitation);
    const bytes = new TextEncoder().encode(json);
    const base64 = btoa(String.fromCharCode(...bytes));
    // Make URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  _decodeInvitation(encoded) {
    // Restore standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  _validateInvitation(invitation) {
    if (!invitation || typeof invitation !== 'object') {
      return false;
    }
    
    // Check required fields
    if (!invitation.version || !invitation.peerId) {
      return false;
    }
    
    // For offers, check offer and ice
    if (invitation.offer && !invitation.ice) {
      return false;
    }
    
    // For answers, check answer
    if (invitation.type === 'answer' && !invitation.answer) {
      return false;
    }
    
    return true;
  }

  _checkUrlInvitation() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('#peer=')) {
      return;
    }
    
    const invitation = this.parseInvitation(window.location.href);
    if (invitation) {
      console.log('[P2P Discovery] Found invitation in URL');
      this._emit('invitation:found', { invitation });
    }
  }

  _handleBroadcastMessage(data) {
    if (!data || typeof data !== 'object') {
      return;
    }
    
    switch (data.type) {
      case 'peer:announce':
        if (data.peerId && data.peerId !== this.localPeerId) {
          this.discoveredPeers.set(data.peerId, Date.now());
          this._emit('peer:discovered', { peerId: data.peerId });
        }
        break;
      
      default:
        console.log('[P2P Discovery] Unknown message type:', data.type);
    }
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
        console.error(`[P2P Discovery] Error in event handler for ${event}:`, e);
      }
    }
  }
}
