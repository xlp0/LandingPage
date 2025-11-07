// PKC Module: p2p-serverless (browser)
// Purpose: Serverless P2P communication using WebRTC without external dependencies
// Architecture: Browser-native, no bootstrap servers, QR/URL-based peer discovery

import { ConnectionManager } from './connection.js';
import { DiscoveryManager } from './discovery.js';
import { QRCodeGenerator, QRCodeScanner } from './qr-code.js';

let connectionManager = null;
let discoveryManager = null;
let qrScanner = null;
let messageHandlers = [];

// UI element references
let statusElement = null;
let peerCountElement = null;
let messagesElement = null;

/**
 * Update status display
 */
function setStatus(text, type = 'info') {
  const wsBadge = document.getElementById('ws-status');
  if (wsBadge) {
    const spanText = wsBadge.querySelector('span:last-child');
    if (spanText) spanText.textContent = text;
  }
  
  statusElement = document.getElementById('p2p-status');
  if (statusElement) {
    statusElement.textContent = text;
    statusElement.className = `status-${type}`;
  }
  
  console.log(`[P2P Serverless] ${text}`);
}

/**
 * Append message to UI
 */
function appendMsg(text) {
  messagesElement = document.getElementById('p2p-messages');
  if (messagesElement) {
    const li = document.createElement('li');
    // Ensure long content (codes/JSON) wraps fully
    li.className = 'whitespace-pre-wrap break-words break-all font-mono text-xs leading-snug';
    li.textContent = `${new Date().toLocaleTimeString()}: ${text}`;
    messagesElement.appendChild(li);
    
    // Auto-scroll
    messagesElement.scrollTop = messagesElement.scrollHeight;
  } else {
    console.log('[P2P]', text);
  }
}

/**
 * Update peer count display
 */
function updatePeerCount(count) {
  peerCountElement = document.getElementById('peer-count');
  if (peerCountElement) {
    peerCountElement.textContent = count;
  }
}

/**
 * Refresh peer list in UI
 */
function refreshPeerList() {
  if (!connectionManager) return;
  
  const peers = connectionManager.getPeers();
  updatePeerCount(peers.length);
  
  const peerListElement = document.getElementById('peer-list');
  if (peerListElement) {
    peerListElement.innerHTML = '';
    
    peers.forEach(peer => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="peer-id">${peer.id}</span>
        <span class="peer-state">${peer.state}</span>
        <button onclick="window.p2p.disconnect('${peer.id}')">Disconnect</button>
      `;
      peerListElement.appendChild(li);
    });
  }
}

export default {
  id: 'p2p-serverless',
  
  async init({ pkc, config, appConfig, capabilities }) {
    this.pkc = pkc;
    this.config = config || {};
    this.appConfig = appConfig || {};
    this.capabilities = capabilities || {};
    
    pkc.ctx.log('p2p-serverless:init', {
      config: this.config,
      capabilities: this.capabilities
    });
    
    // Expose API globally for UI buttons
    window.p2p = this;
  },
  
  async start() {
    const { pkc, config, capabilities } = this;
    
    // Check WebRTC support
    if (!capabilities.webrtc) {
      pkc.ctx.log('p2p-serverless: WebRTC not supported');
      setStatus('WebRTC not supported', 'error');
      return;
    }
    
    try {
      setStatus('Initializing...', 'info');
      
      // Initialize connection manager
      connectionManager = new ConnectionManager({
        iceServers: config.iceServers || [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      // Initialize discovery manager
      discoveryManager = new DiscoveryManager({
        channelName: config.channelName || 'pkc-p2p-discovery'
      });
      
      await discoveryManager.init();
      
      // Setup event handlers
      this._setupEventHandlers();
      
      // Announce presence
      discoveryManager.announce();
      
      // Check for invitation in URL
      const invitation = discoveryManager.parseInvitation(window.location.href);
      if (invitation) {
        await this._handleInvitation(invitation);
      }
      
      // Setup UI handlers
      this._setupUI();
      
      setStatus('Ready - Create or accept invitation', 'success');
      appendMsg('P2P system ready');
      
      pkc.ctx.log('p2p-serverless: started successfully');
    } catch (e) {
      console.error('[P2P Serverless] Failed to start:', e);
      setStatus('Failed to start: ' + e.message, 'error');
      appendMsg('Error: ' + e.message);
    }
  },
  
  async stop() {
    if (connectionManager) {
      connectionManager.destroy();
      connectionManager = null;
    }
    
    if (discoveryManager) {
      discoveryManager.destroy();
      discoveryManager = null;
    }
    
    if (qrScanner) {
      qrScanner.stop();
      qrScanner = null;
    }
    
    messageHandlers = [];
    setStatus('Stopped', 'info');
  },
  
  /**
   * Create an invitation for others to connect
   */
  async createInvitation() {
    if (!connectionManager || !discoveryManager) {
      throw new Error('P2P not initialized');
    }
    
    try {
      setStatus('Creating invitation...', 'info');
      
      // Create WebRTC offer
      const offerData = await connectionManager.createOffer();
      
      // Create invitation with QR code
      const invitation = discoveryManager.createInvitation(offerData);
      
      appendMsg('Invitation created');
      setStatus('Waiting for peer to connect...', 'info');
      
      return invitation;
    } catch (e) {
      console.error('[P2P] Failed to create invitation:', e);
      setStatus('Failed to create invitation', 'error');
      throw e;
    }
  },
  
  /**
   * Accept an invitation from another peer
   * Returns answer data that must be sent back to the inviter
   */
  async acceptInvitation(urlOrEncoded) {
    if (!connectionManager || !discoveryManager) {
      throw new Error('P2P not initialized');
    }
    
    try {
      setStatus('Accepting invitation...', 'info');
      
      // Parse invitation
      const invitation = discoveryManager.parseInvitation(urlOrEncoded);
      if (!invitation) {
        throw new Error('Invalid invitation');
      }
      
      if (invitation.type === 'answer') {
        // This is an answer, not an offer - wrong method
        throw new Error('This is an answer. Use completeConnection() instead.');
      }
      
      // Accept the offer and generate answer
      const answerData = await connectionManager.acceptOffer(
        invitation.peerId,
        invitation.offer,
        invitation.ice
      );
      
      // Create answer invitation for user to send back
      const answerInvitation = discoveryManager.createAnswerInvitation(answerData);
      
      appendMsg('Answer generated - send it back to the inviter');
      setStatus('Waiting for connection...', 'info');
      
      // Display answer for user
      this._displayAnswer(answerInvitation);
      
      return answerInvitation;
    } catch (e) {
      console.error('[P2P] Failed to accept invitation:', e);
      setStatus('Failed to accept invitation', 'error');
      throw e;
    }
  },
  
  /**
   * Complete connection by applying answer (for the inviter)
   */
  async completeConnection(answerEncoded) {
    if (!connectionManager || !discoveryManager) {
      throw new Error('P2P not initialized');
    }
    
    try {
      setStatus('Completing connection...', 'info');
      
      // Parse answer invitation
      const answerInvitation = discoveryManager.parseInvitation(answerEncoded);
      if (!answerInvitation || answerInvitation.type !== 'answer') {
        throw new Error('Invalid answer data');
      }
      
      // Apply the answer
      await connectionManager.applyAnswer(
        answerInvitation.peerId,
        answerInvitation.answer,
        answerInvitation.ice
      );
      
      appendMsg('Connection completing...');
      setStatus('Connecting...', 'info');
    } catch (e) {
      console.error('[P2P] Failed to complete connection:', e);
      setStatus('Failed to complete connection', 'error');
      throw e;
    }
  },
  
  /**
   * Send message to specific peer
   */
  send(peerId, data) {
    if (!connectionManager) {
      throw new Error('P2P not initialized');
    }
    
    connectionManager.send(peerId, data);
  },
  
  /**
   * Broadcast message to all peers
   */
  broadcast(data) {
    if (!connectionManager) {
      throw new Error('P2P not initialized');
    }
    
    connectionManager.broadcast(data);
    appendMsg(`Broadcast: ${JSON.stringify(data)}`);
  },
  
  /**
   * Get connected peers
   */
  getPeers() {
    if (!connectionManager) {
      return [];
    }
    return connectionManager.getPeers();
  },
  
  /**
   * Disconnect from specific peer
   */
  disconnect(peerId) {
    if (!connectionManager) {
      return;
    }
    
    connectionManager.disconnect(peerId);
    appendMsg(`Disconnected from ${peerId}`);
    refreshPeerList();
  },
  
  /**
   * Register message handler
   */
  onMessage(handler) {
    messageHandlers.push(handler);
  },
  
  /**
   * Remove message handler
   */
  offMessage(handler) {
    const index = messageHandlers.indexOf(handler);
    if (index > -1) {
      messageHandlers.splice(index, 1);
    }
  },
  
  // Private methods
  
  async _handleInvitation(invitation) {
    // This method is now simplified - kept for backward compatibility
    if (invitation.type === 'answer') {
      await this.completeConnection(invitation);
    } else {
      return await this.acceptInvitation(invitation);
    }
  },
  
  _setupEventHandlers() {
    // Connection events
    connectionManager.on('peer:connect', ({ peerId }) => {
      appendMsg(`Peer connected: ${peerId}`);
      refreshPeerList();
      setStatus(`Connected to ${connectionManager.getPeers().length} peer(s)`, 'success');
    });
    
    connectionManager.on('peer:disconnect', ({ peerId }) => {
      appendMsg(`Peer disconnected: ${peerId}`);
      refreshPeerList();
      
      const peerCount = connectionManager.getPeers().length;
      if (peerCount === 0) {
        setStatus('No peers connected', 'info');
      } else {
        setStatus(`Connected to ${peerCount} peer(s)`, 'success');
      }
    });
    
    connectionManager.on('message', ({ peerId, data }) => {
      appendMsg(`From ${peerId}: ${JSON.stringify(data)}`);
      
      // Call registered handlers
      messageHandlers.forEach(handler => {
        try {
          handler({ peerId, data });
        } catch (e) {
          console.error('[P2P] Error in message handler:', e);
        }
      });
    });
    
    connectionManager.on('error', ({ peerId, error }) => {
      appendMsg(`Error with ${peerId}: ${error.message}`);
    });
    
    // Discovery events
    discoveryManager.on('peer:discovered', ({ peerId }) => {
      console.log('[P2P] Discovered local peer:', peerId);
    });
    
    discoveryManager.on('invitation:found', async ({ invitation }) => {
      // Auto-accept invitation if configured
      if (this.config.autoAcceptInvitations) {
        await this._handleInvitation(invitation);
      }
    });
  },
  
  _setupUI() {
    // Setup create invitation button
    const createBtn = document.getElementById('create-invitation-btn');
    if (createBtn) {
      createBtn.onclick = async () => {
        try {
          const invitation = await this.createInvitation();
          this._displayInvitation(invitation);
        } catch (e) {
          alert('Failed to create invitation: ' + e.message);
        }
      };
    }
    
    // Setup accept invitation button
    const acceptBtn = document.getElementById('accept-invitation-btn');
    if (acceptBtn) {
      acceptBtn.onclick = async () => {
        const input = prompt('Enter invitation URL or code:');
        if (input) {
          try {
            await this.acceptInvitation(input);
          } catch (e) {
            alert('Failed to accept invitation: ' + e.message);
          }
        }
      };
    }
    
    // Setup complete connection button
    const completeBtn = document.getElementById('complete-connection-btn');
    if (completeBtn) {
      completeBtn.onclick = async () => {
        const input = prompt('Paste answer code from Tab 2:');
        if (input) {
          try {
            await this.completeConnection(input);
            alert('Connection completed! You should now be connected.');
          } catch (e) {
            alert('Failed to complete connection: ' + e.message);
          }
        }
      };
    }
    
    // Setup send message button
    const sendBtn = document.getElementById('send-message-btn');
    const msgInput = document.getElementById('message-input');
    if (sendBtn && msgInput) {
      sendBtn.onclick = () => {
        const message = msgInput.value.trim();
        if (message) {
          this.broadcast({ type: 'chat', message, timestamp: Date.now() });
          msgInput.value = '';
        }
      };
      
      msgInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          sendBtn.click();
        }
      };
    }
  },
  
  _displayInvitation(invitation) {
    // Display invitation in modal or dedicated area
    const container = document.getElementById('invitation-display') || document.body;
    
    const modal = document.createElement('div');
    modal.className = 'p2p-invitation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>📤 Peer Invitation Created!</h3>
        <p><strong>Instructions:</strong></p>
        <ol style="text-align: left; margin: 10px 0;">
          <li>Copy the invitation code below</li>
          <li>Send it to Tab 2 (or another device)</li>
          <li>In Tab 2, click "Accept Invitation" and paste this code</li>
          <li>Tab 2 will generate an answer - send it back here</li>
          <li>Click "Complete Connection" with the answer</li>
        </ol>
        <div id="qr-code-container"></div>
        <p style="color: #666; font-size: 13px;">Invitation Code:</p>
        <textarea readonly style="width: 100%; height: 100px; font-family: monospace; font-size: 11px; margin: 10px 0;">${invitation.encoded}</textarea>
        <button onclick="navigator.clipboard.writeText('${invitation.encoded}'); this.textContent='✅ Copied!'">📋 Copy Invitation</button>
        <button onclick="this.closest('.p2p-invitation-modal').remove()">Close</button>
        <p style="font-size: 12px; color: #666;">Expires: ${invitation.expires.toLocaleString()}</p>
      </div>
    `;
    
    container.appendChild(modal);
    
    // Generate QR code (if QR generation is working)
    const qrContainer = modal.querySelector('#qr-code-container');
    if (qrContainer) {
      try {
        QRCodeGenerator.renderTo(invitation.qrData || invitation.encoded, qrContainer);
      } catch (e) {
        console.log('[P2P] QR generation skipped:', e.message);
      }
    }
  },
  
  _displayAnswer(answerInvitation) {
    const container = document.getElementById('invitation-display') || document.body;
    
    const modal = document.createElement('div');
    modal.className = 'p2p-invitation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>✅ Connection Answer Generated!</h3>
        <p><strong>Instructions:</strong></p>
        <ol style="text-align: left; margin: 10px 0;">
          <li>Copy this answer code below</li>
          <li>Send it back to Tab 1 (the inviter)</li>
          <li>In Tab 1, click "Complete Connection" and paste this code</li>
          <li>Both tabs will connect automatically!</li>
        </ol>
        <p style="color: #666; font-size: 13px;">Answer Code:</p>
        <textarea readonly style="width: 100%; height: 120px; font-family: monospace; font-size: 11px;">${answerInvitation.encoded}</textarea>
        <button onclick="navigator.clipboard.writeText('${answerInvitation.encoded}'); this.textContent='✅ Copied!'">📋 Copy Answer Code</button>
        <button onclick="this.closest('.p2p-invitation-modal').remove()">Close</button>
      </div>
    `;
    
    container.appendChild(modal);
  }
};
