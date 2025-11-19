// Room Service - Manages available Tic-Tac-Toe rooms for easy discovery

class RoomService {
  constructor() {
    this.rooms = new Map(); // roomId -> room data
    this.broadcastChannel = null;
    this.channelName = 'tic-tac-toe-rooms';
    this.localRooms = new Set(); // rooms created by this client
    
    this._initBroadcastChannel();
    this._setupCleanup();
  }
  
  _initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(this.channelName);
      this.broadcastChannel.onmessage = (event) => {
        this._handleBroadcastMessage(event.data);
      };
      console.log('[RoomService] BroadcastChannel initialized');
    } else {
      console.warn('[RoomService] BroadcastChannel not supported');
    }
  }
  
  _setupCleanup() {
    // Clean up old rooms periodically
    setInterval(() => {
      this._cleanupExpiredRooms();
    }, 30000); // Every 30 seconds
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this._removeLocalRooms();
    });
  }
  
  /**
   * Create a new room and broadcast it
   */
  createRoom(roomData) {
    const room = {
      id: roomData.id,
      name: roomData.name || `Room ${roomData.id.substr(-6)}`,
      host: roomData.host || 'Anonymous',
      created: Date.now(),
      status: 'waiting', // waiting, playing, full
      players: 1,
      maxPlayers: 2,
      invitation: roomData.invitation,
      ...roomData
    };
    
    this.rooms.set(room.id, room);
    this.localRooms.add(room.id);
    
    console.log('[RoomService] Room created:', room);
    
    // Broadcast room creation
    this._broadcastMessage({
      type: 'room-created',
      room: room
    });
    
    return room;
  }
  
  /**
   * Update room status
   */
  updateRoom(roomId, updates) {
    const room = this.rooms.get(roomId);
    if (room) {
      Object.assign(room, updates);
      room.updated = Date.now();
      
      console.log('[RoomService] Room updated:', room);
      
      // Broadcast room update
      this._broadcastMessage({
        type: 'room-updated',
        room: room
      });
      
      return room;
    }
    return null;
  }
  
  /**
   * Remove a room
   */
  removeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      this.rooms.delete(roomId);
      this.localRooms.delete(roomId);
      
      console.log('[RoomService] Room removed:', roomId);
      
      // Broadcast room removal
      this._broadcastMessage({
        type: 'room-removed',
        roomId: roomId
      });
      
      return true;
    }
    return false;
  }
  
  /**
   * Get all available rooms
   */
  getRooms() {
    return Array.from(this.rooms.values())
      .filter(room => room.status === 'waiting')
      .sort((a, b) => b.created - a.created);
  }
  
  /**
   * Get a specific room
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }
  
  /**
   * Join a room (mark as full)
   */
  joinRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.status === 'waiting') {
      room.players = 2;
      room.status = 'playing';
      room.updated = Date.now();
      
      this._broadcastMessage({
        type: 'room-updated',
        room: room
      });
      
      return room;
    }
    return null;
  }
  
  _broadcastMessage(message) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (error) {
        console.error('[RoomService] Failed to broadcast message:', error);
      }
    }
  }
  
  _handleBroadcastMessage(message) {
    console.log('[RoomService] Received broadcast:', message);
    
    switch (message.type) {
      case 'room-created':
        if (!this.localRooms.has(message.room.id)) {
          this.rooms.set(message.room.id, message.room);
          this._notifyRoomListUpdate();
        }
        break;
        
      case 'room-updated':
        if (!this.localRooms.has(message.room.id)) {
          this.rooms.set(message.room.id, message.room);
          this._notifyRoomListUpdate();
        }
        break;
        
      case 'room-removed':
        if (!this.localRooms.has(message.roomId)) {
          this.rooms.delete(message.roomId);
          this._notifyRoomListUpdate();
        }
        break;
        
      case 'room-list-request':
        // Send our local rooms to requester
        this.localRooms.forEach(roomId => {
          const room = this.rooms.get(roomId);
          if (room) {
            this._broadcastMessage({
              type: 'room-created',
              room: room
            });
          }
        });
        break;
    }
  }
  
  _notifyRoomListUpdate() {
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('roomListUpdated', {
      detail: { rooms: this.getRooms() }
    }));
  }
  
  _cleanupExpiredRooms() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [roomId, room] of this.rooms.entries()) {
      const age = now - (room.updated || room.created);
      if (age > maxAge && !this.localRooms.has(roomId)) {
        console.log('[RoomService] Cleaning up expired room:', roomId);
        this.rooms.delete(roomId);
        this._notifyRoomListUpdate();
      }
    }
  }
  
  _removeLocalRooms() {
    // Remove all local rooms when page unloads
    this.localRooms.forEach(roomId => {
      this.removeRoom(roomId);
    });
  }
  
  /**
   * Request room list from other clients
   */
  requestRoomList() {
    this._broadcastMessage({
      type: 'room-list-request'
    });
  }
  
  /**
   * Generate a user-friendly room name
   */
  generateRoomName() {
    const adjectives = ['Quick', 'Epic', 'Fun', 'Cool', 'Smart', 'Fast', 'Wild', 'Super'];
    const nouns = ['Game', 'Match', 'Battle', 'Duel', 'Challenge', 'Contest', 'Fight', 'Round'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    
    return `${adj} ${noun} ${num}`;
  }
}

export default RoomService;
