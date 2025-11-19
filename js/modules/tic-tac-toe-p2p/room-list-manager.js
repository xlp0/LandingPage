// Room List Manager - Handles room list UI and interactions

class RoomListManager {
  constructor(roomService, onJoinRoom) {
    this.roomService = roomService;
    this.onJoinRoom = onJoinRoom;
  }
  
  /**
   * Setup room list UI
   */
  setup() {
    // Create room list container
    const gameBoard = document.querySelector('.game-board');
    if (!gameBoard) return;
    
    const roomListContainer = document.createElement('div');
    roomListContainer.className = 'room-list-container';
    roomListContainer.innerHTML = `
      <div class="room-list-header">
        <h3>🎮 Available Games</h3>
        <button id="refresh-rooms-btn" class="refresh-btn">🔄 Refresh</button>
      </div>
      <div id="room-list" class="room-list">
        <div class="no-rooms">No games available. Create one to get started!</div>
      </div>
    `;
    
    // Insert before game board
    gameBoard.parentNode.insertBefore(roomListContainer, gameBoard);
    
    // Bind refresh button
    const refreshBtn = document.getElementById('refresh-rooms-btn');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        this.roomService.requestRoomList();
        this.updateRoomList();
      };
    }
    
    // Listen for room list updates
    window.addEventListener('roomListUpdated', (event) => {
      this.updateRoomList(event.detail.rooms);
    });
    
    // Initial room list load
    this.updateRoomList();
    
    // Request rooms from other clients
    setTimeout(() => {
      this.roomService.requestRoomList();
    }, 1000);
  }
  
  /**
   * Update room list display
   */
  updateRoomList(rooms = null) {
    const roomList = document.getElementById('room-list');
    if (!roomList) return;
    
    const availableRooms = rooms || this.roomService.getRooms();
    
    if (availableRooms.length === 0) {
      roomList.innerHTML = '<div class="no-rooms">No games available. Create one to get started!</div>';
      return;
    }
    
    roomList.innerHTML = availableRooms.map(room => `
      <div class="room-item" data-room-id="${room.id}">
        <div class="room-info">
          <div class="room-name">${room.name}</div>
          <div class="room-details">
            <span class="room-host">Host: ${room.host}</span>
            <span class="room-players">${room.players}/${room.maxPlayers} players</span>
            <span class="room-time">${this._formatTime(room.created)}</span>
          </div>
        </div>
        <button class="join-room-btn" data-room-id="${room.id}">
          🎯 Join Game
        </button>
      </div>
    `).join('');
    
    // Bind join buttons
    const joinButtons = roomList.querySelectorAll('.join-room-btn');
    joinButtons.forEach(btn => {
      btn.onclick = () => {
        const roomId = btn.getAttribute('data-room-id');
        this.joinRoomFromList(roomId);
      };
    });
  }
  
  /**
   * Join room from list (one-click join)
   */
  async joinRoomFromList(roomId) {
    try {
      const room = this.roomService.getRoom(roomId);
      if (!room) {
        alert('Room no longer available');
        return;
      }
      
      console.log('[RoomListManager] Joining room from list:', room);
      
      // Call the join callback
      await this.onJoinRoom(room.invitation);
      
      // Update room status
      this.roomService.joinRoom(roomId);
      
    } catch (error) {
      console.error('[RoomListManager] Failed to join room from list:', error);
      alert('Failed to join room: ' + error.message);
    }
  }
  
  /**
   * Format timestamp for display
   */
  _formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
}

export default RoomListManager;
