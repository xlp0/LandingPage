// Connection Handler - Manages P2P connections and signaling

class ConnectionHandler {
  constructor(connectionManager, discoveryManager) {
    this.connectionManager = connectionManager;
    this.discoveryManager = discoveryManager;
    this.currentRoom = null;
  }
  
  /**
   * Create a new game room
   */
  async createRoom() {
    try {
      console.log('[ConnectionHandler] Creating room...');
      
      // Create offer using ConnectionManager
      const offerData = await this.connectionManager.createOffer();
      console.log('[ConnectionHandler] Offer created:', offerData);
      
      // Create invitation using DiscoveryManager
      const invitationData = this.discoveryManager.createInvitation(offerData);
      console.log('[ConnectionHandler] Invitation created:', invitationData);
      
      // Generate room ID
      const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Store current room info
      this.currentRoom = {
        roomId: roomId,
        invitation: invitationData.encoded,
        isHost: true,
        offerData: offerData,
        invitationData: invitationData
      };
      
      return {
        roomId,
        invitation: invitationData.encoded,
        invitationData
      };
      
    } catch (error) {
      console.error('[ConnectionHandler] Failed to create room:', error);
      throw error;
    }
  }
  
  /**
   * Join an existing game room
   */
  async joinRoom(invitation) {
    try {
      console.log('[ConnectionHandler] Joining room...');
      
      // Parse invitation using DiscoveryManager
      const parsedInvitation = this.discoveryManager.parseInvitation(invitation);
      if (!parsedInvitation) {
        throw new Error('Invalid invitation format');
      }
      
      console.log('[ConnectionHandler] Parsed invitation:', parsedInvitation);
      
      // Accept offer and create answer using ConnectionManager
      const answerData = await this.connectionManager.acceptOffer(
        parsedInvitation.peerId,
        parsedInvitation.offer,
        parsedInvitation.ice || []
      );
      
      console.log('[ConnectionHandler] Answer created:', answerData);
      
      // Create answer invitation using DiscoveryManager
      const answerInvitation = this.discoveryManager.createAnswerInvitation(answerData);
      
      // Store current room info
      this.currentRoom = {
        roomId: parsedInvitation.roomId || 'unknown',
        isHost: false,
        answerInvitation: answerInvitation,
        guestPeerId: answerData.peerId
      };
      
      // Send join request to host via data channel
      // This will be sent once the data channel is open
      this.pendingJoinRequest = {
        type: 'join-request',
        peerId: answerData.peerId,
        answerInvitation: answerInvitation.encoded,
        timestamp: Date.now()
      };
      
      return {
        answerInvitation: answerInvitation.encoded,
        autoConnect: true
      };
      
    } catch (error) {
      console.error('[ConnectionHandler] Failed to join room:', error);
      throw error;
    }
  }
  
  /**
   * Get pending join request
   */
  getPendingJoinRequest() {
    return this.pendingJoinRequest;
  }
  
  /**
   * Clear pending join request
   */
  clearPendingJoinRequest() {
    this.pendingJoinRequest = null;
  }
  
  /**
   * Complete connection (host receives answer from guest)
   */
  async completeConnection(answerInvitation) {
    if (!this.currentRoom || !this.currentRoom.isHost) {
      throw new Error('Only host can complete connection');
    }
    
    try {
      console.log('[ConnectionHandler] Completing connection...');
      
      // Parse answer invitation
      const parsedAnswer = this.discoveryManager.parseInvitation(answerInvitation);
      if (!parsedAnswer) {
        throw new Error('Invalid answer invitation');
      }
      
      console.log('[ConnectionHandler] Parsed answer:', parsedAnswer);
      
      // Apply answer using ConnectionManager
      await this.connectionManager.applyAnswer(
        parsedAnswer.peerId,
        parsedAnswer.answer,
        parsedAnswer.ice || []
      );
      
      console.log('[ConnectionHandler] Connection completed');
      
    } catch (error) {
      console.error('[ConnectionHandler] Failed to complete connection:', error);
      throw error;
    }
  }
  
  /**
   * Get current room info
   */
  getCurrentRoom() {
    return this.currentRoom;
  }
  
  /**
   * Check if current user is host
   */
  isHost() {
    return this.currentRoom?.isHost || false;
  }
}

export default ConnectionHandler;
