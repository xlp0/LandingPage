// Video Meeting Module - Multi-person P2P video conferencing using WebRTC

import { ConnectionManager } from '../p2p-serverless/connection.js';
import { DiscoveryManager } from '../p2p-serverless/discovery.js';

class VideoMeeting {
  constructor() {
    this.connectionManager = null;
    this.discoveryManager = null;
    this.localStream = null;
    this.peers = new Map(); // Map of peerId -> { connection, stream, videoElement }
    this.roomCode = null;
    this.isHost = false;
    this.roomId = null;
    
    // Media constraints
    this.constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
    
    // UI elements
    this.elements = {};
  }
  
  async init() {
    console.log('[VideoMeeting] Initializing...');
    
    // Initialize P2P modules
    this.connectionManager = new ConnectionManager({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    this.discoveryManager = new DiscoveryManager({
      channelName: 'video-meeting-discovery'
    });
    
    await this.discoveryManager.init();
    
    // Setup event handlers
    this._setupEventHandlers();
    
    // Bind UI elements
    this._bindUI();
    
    // Request camera/mic permissions
    await this._setupLocalStream();
    
    console.log('[VideoMeeting] Initialized successfully');
  }
  
  async _setupLocalStream() {
    try {
      console.log('[VideoMeeting] Setting up local stream...');
      this.localStream = await navigator.mediaDevices.getUserMedia(this.constraints);
      
      // Display local video
      const localVideo = document.getElementById('local-video');
      if (localVideo) {
        localVideo.srcObject = this.localStream;
      }
      
      // Enable media control buttons
      this._enableMediaControls();
      
      console.log('[VideoMeeting] Local stream ready');
    } catch (error) {
      console.error('[VideoMeeting] Failed to get user media:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  }
  
  _bindUI() {
    // Get UI elements
    this.elements = {
      createBtn: document.getElementById('create-room-btn'),
      joinBtn: document.getElementById('join-room-btn'),
      shareBtn: document.getElementById('share-room-btn'),
      leaveBtn: document.getElementById('leave-room-btn'),
      videoBtn: document.getElementById('toggle-video-btn'),
      audioBtn: document.getElementById('toggle-audio-btn'),
      chatInput: document.getElementById('chat-input'),
      sendChatBtn: document.getElementById('send-chat-btn'),
      chatMessages: document.getElementById('chat-messages'),
      peerCount: document.getElementById('peer-count'),
      videoGrid: document.getElementById('video-grid')
    };
    
    // Bind events
    if (this.elements.createBtn) {
      this.elements.createBtn.onclick = () => this.createRoom();
    }
    
    if (this.elements.joinBtn) {
      this.elements.joinBtn.onclick = () => this.joinRoom();
    }
    
    if (this.elements.shareBtn) {
      this.elements.shareBtn.onclick = () => this.shareRoomCode();
    }
    
    // Add complete connection button for host
    const completeBtn = document.createElement('button');
    completeBtn.textContent = '✅ Complete Connection';
    completeBtn.style.display = 'none';
    completeBtn.id = 'complete-connection-btn';
    completeBtn.onclick = () => this.completeConnection();
    
    // Add to controls
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.appendChild(completeBtn);
    }
    
    if (this.elements.leaveBtn) {
      this.elements.leaveBtn.onclick = () => this.leaveRoom();
    }
    
    if (this.elements.videoBtn) {
      this.elements.videoBtn.onclick = () => this.toggleVideo();
    }
    
    if (this.elements.audioBtn) {
      this.elements.audioBtn.onclick = () => this.toggleAudio();
    }
    
    // Chat functionality
    const sendMessage = () => {
      const message = this.elements.chatInput.value.trim();
      if (message) {
        this.sendChatMessage(message);
        this.elements.chatInput.value = '';
      }
    };
    
    if (this.elements.sendChatBtn) {
      this.elements.sendChatBtn.onclick = sendMessage;
    }
    
    if (this.elements.chatInput) {
      this.elements.chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
      };
    }
  }
  
  async createRoom() {
    try {
      console.log('[VideoMeeting] Creating room...');
      
      // Generate room ID
      this.roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      this.isHost = true;
      
      // Create initial offer for room
      const offerData = await this.connectionManager.createOffer();
      
      // Create room invitation
      const roomInvitation = {
        roomId: this.roomId,
        hostOffer: offerData,
        timestamp: Date.now()
      };
      
      // Encode as room code
      this.roomCode = btoa(JSON.stringify(roomInvitation));
      
      // Update UI
      this._showRoomCode('Share this room code with others:', this.roomCode);
      this._updateRoomUI(true);
      
      // Show complete connection button for host
      const completeBtn = document.getElementById('complete-connection-btn');
      if (completeBtn) {
        completeBtn.style.display = 'inline-block';
      }
      
      console.log('[VideoMeeting] Room created:', this.roomId);
      window.updateStatus('Room created - waiting for participants', true);
      
    } catch (error) {
      console.error('[VideoMeeting] Failed to create room:', error);
      alert('Failed to create room: ' + error.message);
    }
  }
  
  async joinRoom() {
    try {
      const roomCode = prompt('Enter room code:');
      if (!roomCode) return;
      
      console.log('[VideoMeeting] Joining room...');
      
      // Decode room invitation
      let roomInvitation;
      try {
        roomInvitation = JSON.parse(atob(roomCode));
        console.log('[VideoMeeting] Decoded room invitation:', roomInvitation);
      } catch (e) {
        throw new Error('Invalid room code format');
      }
      
      // Validate room invitation
      if (!roomInvitation.roomId || !roomInvitation.hostOffer) {
        throw new Error('Invalid room invitation - missing required data');
      }
      
      // Validate host offer structure
      const hostOffer = roomInvitation.hostOffer;
      if (!hostOffer.offer || !hostOffer.offer.type || !hostOffer.offer.sdp) {
        throw new Error('Invalid host offer - missing SDP data');
      }
      
      console.log('[VideoMeeting] Host offer:', hostOffer);
      
      this.roomId = roomInvitation.roomId;
      this.isHost = false;
      
      // Accept host's offer and create answer
      const answerData = await this.connectionManager.acceptOffer(
        hostOffer.peerId,
        hostOffer.offer,
        hostOffer.iceCandidates || []
      );
      console.log('[VideoMeeting] Answer created:', answerData);
      
      // Create join response
      const joinResponse = {
        roomId: this.roomId,
        peerId: answerData.peerId,
        answer: answerData,
        timestamp: Date.now()
      };
      
      // Encode join response
      const joinCode = btoa(JSON.stringify(joinResponse));
      
      // Show join code to send back to host
      this._showRoomCode('Send this code back to the host:', joinCode);
      this._updateRoomUI(false);
      
      console.log('[VideoMeeting] Joined room:', this.roomId);
      window.updateStatus('Joined room - waiting for host confirmation', true);
      
    } catch (error) {
      console.error('[VideoMeeting] Failed to join room:', error);
      alert('Failed to join room: ' + error.message);
    }
  }
  
  async completeConnection() {
    try {
      if (!this.isHost) {
        alert('Only the host can complete connections');
        return;
      }
      
      const joinCode = prompt('Enter the answer code from the participant:');
      if (!joinCode) return;
      
      console.log('[VideoMeeting] Completing connection...');
      
      // Decode join response
      let joinResponse;
      try {
        joinResponse = JSON.parse(atob(joinCode));
        console.log('[VideoMeeting] Decoded join response:', joinResponse);
      } catch (e) {
        throw new Error('Invalid answer code format');
      }
      
      // Validate join response
      if (!joinResponse.answer || !joinResponse.peerId) {
        throw new Error('Invalid answer code - missing required data');
      }
      
      // Apply answer from peer
      await this.connectionManager.applyAnswer(
        joinResponse.peerId,
        joinResponse.answer.answer,
        joinResponse.answer.iceCandidates || []
      );
      
      console.log('[VideoMeeting] Connection completed with peer:', joinResponse.peerId);
      window.updateStatus('Peer connected successfully!', true);
      
    } catch (error) {
      console.error('[VideoMeeting] Failed to complete connection:', error);
      alert('Failed to complete connection: ' + error.message);
    }
  }
  
  _setupEventHandlers() {
    // Connection events
    this.connectionManager.on('peer:connect', (data) => {
      console.log('[VideoMeeting] Peer connected:', data.peerId);
      this._handlePeerConnected(data.peerId);
    });
    
    this.connectionManager.on('peer:disconnect', (data) => {
      console.log('[VideoMeeting] Peer disconnected:', data.peerId);
      this._handlePeerDisconnected(data.peerId);
    });
    
    // Message events
    this.connectionManager.on('message', (data) => {
      console.log('[VideoMeeting] Message received:', data);
      this._handleMessage(data.data);
    });
    
    // Note: Stream events are handled via ontrack in _sendStreamToPeer
  }
  
  _handlePeerConnected(peerId) {
    console.log('[VideoMeeting] Handling peer connected:', peerId);
    
    // Add peer to map
    if (!this.peers.has(peerId)) {
      this.peers.set(peerId, {
        peerId: peerId,
        stream: null,
        videoElement: null
      });
      console.log('[VideoMeeting] Added peer to map:', peerId);
    }
    
    // Send local stream to new peer
    if (this.localStream) {
      this._sendStreamToPeer(peerId);
    }
    
    // Update UI
    this._updatePeerCount();
    this._addChatMessage('System', `Peer ${peerId.substr(0, 8)} joined the room`);
    
    // Enable chat
    if (this.elements.chatInput) {
      this.elements.chatInput.disabled = false;
    }
    if (this.elements.sendChatBtn) {
      this.elements.sendChatBtn.disabled = false;
    }
  }
  
  _handlePeerDisconnected(peerId) {
    // Remove peer video
    const peer = this.peers.get(peerId);
    if (peer && peer.videoElement) {
      peer.videoElement.remove();
    }
    
    // Remove from map
    this.peers.delete(peerId);
    
    // Update UI
    this._updatePeerCount();
    this._addChatMessage('System', `Peer ${peerId.substr(0, 8)} left the room`);
  }
  
  _handleMessage(message) {
    switch (message.type) {
      case 'chat':
        this._addChatMessage(message.sender, message.text);
        break;
        
      case 'media-state':
        this._updatePeerMediaState(message.peerId, message.video, message.audio);
        break;
        
      case 'stream-offer':
        // Handle stream negotiation if needed
        break;
        
      default:
        console.warn('[VideoMeeting] Unknown message type:', message.type);
    }
  }
  
  _handleRemoteStream(peerId, stream) {
    console.log('[VideoMeeting] Adding remote stream from:', peerId);
    
    // Create video element for peer
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.id = `peer-video-${peerId}`;
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsinline = true;
    video.srcObject = stream;
    
    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = `Peer ${peerId.substr(0, 8)}`;
    
    videoContainer.appendChild(video);
    videoContainer.appendChild(label);
    
    // Add to grid
    this.elements.videoGrid.appendChild(videoContainer);
    
    // Update peer info
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.stream = stream;
      peer.videoElement = videoContainer;
    }
  }
  
  _sendStreamToPeer(peerId) {
    console.log('[VideoMeeting] Sending stream to peer:', peerId);
    
    // Get peer connection from ConnectionManager
    const peerConnection = this.connectionManager.connections.get(peerId);
    if (peerConnection && peerConnection.pc && this.localStream) {
      console.log('[VideoMeeting] Adding tracks to peer connection');
      
      // Set up ontrack handler to receive remote streams
      peerConnection.pc.ontrack = (event) => {
        console.log('[VideoMeeting] Received remote track from:', peerId);
        if (event.streams && event.streams[0]) {
          this._handleRemoteStream(peerId, event.streams[0]);
        }
      };
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        try {
          peerConnection.pc.addTrack(track, this.localStream);
          console.log('[VideoMeeting] Added track:', track.kind);
        } catch (error) {
          console.error('[VideoMeeting] Failed to add track:', error);
        }
      });
    } else {
      console.warn('[VideoMeeting] No peer connection found for:', peerId);
    }
  }
  
  sendChatMessage(text) {
    if (!text.trim()) return;
    
    // Add to own chat
    this._addChatMessage('You', text);
    
    // Broadcast to all peers
    this.connectionManager.broadcast({
      type: 'chat',
      sender: 'Peer ' + (this.isHost ? 'Host' : 'Guest'),
      text: text
    });
  }
  
  _addChatMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    senderDiv.textContent = sender;
    
    const textDiv = document.createElement('div');
    textDiv.textContent = text;
    
    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    
    this.elements.chatMessages.appendChild(messageDiv);
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }
  
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        
        // Update button
        if (videoTrack.enabled) {
          this.elements.videoBtn.textContent = '📹 Video On';
          this.elements.videoBtn.classList.add('success');
        } else {
          this.elements.videoBtn.textContent = '📹 Video Off';
          this.elements.videoBtn.classList.remove('success');
        }
        
        // Notify peers
        this._broadcastMediaState();
      }
    }
  }
  
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        
        // Update button
        if (audioTrack.enabled) {
          this.elements.audioBtn.textContent = '🎤 Audio On';
          this.elements.audioBtn.classList.add('success');
        } else {
          this.elements.audioBtn.textContent = '🎤 Audio Off';
          this.elements.audioBtn.classList.remove('success');
        }
        
        // Notify peers
        this._broadcastMediaState();
      }
    }
  }
  
  _broadcastMediaState() {
    const videoEnabled = this.localStream?.getVideoTracks()[0]?.enabled || false;
    const audioEnabled = this.localStream?.getAudioTracks()[0]?.enabled || false;
    
    this.connectionManager.broadcast({
      type: 'media-state',
      peerId: this.connectionManager.localPeerId,
      video: videoEnabled,
      audio: audioEnabled
    });
  }
  
  leaveRoom() {
    // Disconnect all peers
    this.connectionManager.disconnect();
    
    // Clear peer list
    this.peers.forEach((peer, peerId) => {
      if (peer.videoElement) {
        peer.videoElement.remove();
      }
    });
    this.peers.clear();
    
    // Reset UI
    this._updateRoomUI(false, true);
    this._updatePeerCount();
    
    // Clear room info
    this.roomId = null;
    this.roomCode = null;
    this.isHost = false;
    
    window.updateStatus('Disconnected', false);
  }
  
  shareRoomCode() {
    if (this.roomCode) {
      this._showRoomCode('Room code:', this.roomCode);
    }
  }
  
  _showRoomCode(message, code) {
    const modal = document.getElementById('room-code-modal');
    const modalMessage = document.getElementById('modal-message');
    const textarea = document.getElementById('room-code-textarea');
    
    modalMessage.textContent = message;
    textarea.value = code;
    modal.classList.add('show');
  }
  
  _updateRoomUI(inRoom, reset = false) {
    if (reset) {
      this.elements.createBtn.style.display = 'inline-block';
      this.elements.joinBtn.style.display = 'inline-block';
      this.elements.shareBtn.style.display = 'none';
      this.elements.leaveBtn.style.display = 'none';
      this.elements.chatInput.disabled = true;
      this.elements.sendChatBtn.disabled = true;
    } else if (inRoom) {
      this.elements.createBtn.style.display = 'none';
      this.elements.joinBtn.style.display = 'none';
      this.elements.shareBtn.style.display = this.isHost ? 'inline-block' : 'none';
      this.elements.leaveBtn.style.display = 'inline-block';
    }
  }
  
  _updatePeerCount() {
    if (this.elements.peerCount) {
      this.elements.peerCount.textContent = this.peers.size;
    }
  }
  
  _enableMediaControls() {
    this.elements.videoBtn.disabled = false;
    this.elements.audioBtn.disabled = false;
  }
  
  _updatePeerMediaState(peerId, videoEnabled, audioEnabled) {
    const peer = this.peers.get(peerId);
    if (peer && peer.videoElement) {
      const label = peer.videoElement.querySelector('.video-label');
      if (label) {
        const muteIcons = [];
        if (!videoEnabled) muteIcons.push('📹');
        if (!audioEnabled) muteIcons.push('🔇');
        const muteText = muteIcons.length > 0 ? ' ' + muteIcons.join('') : '';
        label.textContent = `Peer ${peerId.substr(0, 8)}${muteText}`;
      }
    }
  }
}

export default VideoMeeting;
