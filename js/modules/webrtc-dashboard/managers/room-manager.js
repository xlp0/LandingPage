// Room Manager
// Handles room creation, joining, and leaving

export class RoomManager {
    constructor(roomService, chatManager, accessControl) {
        this.roomService = roomService;
        this.chatManager = chatManager;
        this.accessControl = accessControl;
        
        this.currentRoom = null;
        this.isHost = false;
    }
    
    async createRoom(options, currentUser) {
        if (!currentUser?.name) {
            throw new Error('Please set your name first');
        }
        
        const roomData = {
            name: options.name || 'Untitled Room',
            description: options.description || '',
            maxParticipants: options.maxParticipants || 10,
            requireApproval: options.requireApproval !== false,
            allowDirectLinks: true,
            host: currentUser.name,
            hostId: currentUser.id,
            createdAt: new Date(),
            participants: []
        };
        
        console.log('[RoomManager] Creating room:', roomData.name);
        
        const room = await this.roomService.createRoom(roomData);
        this.currentRoom = room;
        this.isHost = true;
        
        // CRITICAL: Setup ChatManager FIRST to create connection manager
        // This must happen BEFORE broadcasting user-joined-room
        console.log('[RoomManager] 🔧 Setting up WebRTC connection manager...');
        await this.chatManager.joinRoom(room.id, currentUser);
        
        // THEN join the room via RoomService (broadcasts user-joined-room)
        console.log('[RoomManager] 👤 Creator joining their own room...');
        await this.roomService.joinRoom(room.id, currentUser);
        
        return room;
    }
    
    async requestToJoin(roomId, currentUser, options = {}) {
        if (!currentUser?.name) {
            throw new Error('Please set your name first');
        }
        
        const request = {
            roomId,
            userId: currentUser.id,
            userName: options.displayName || currentUser.name,
            message: options.message || '',
            timestamp: new Date(),
            viaLink: options.viaLink || false
        };
        
        console.log('[RoomManager] Requesting to join room:', roomId);
        await this.accessControl.sendJoinRequest(request);
        
        return request;
    }
    
    async leaveRoom() {
        if (!this.currentRoom) {
            return;
        }
        
        console.log('[RoomManager] 🚪 Leaving room:', this.currentRoom.id);
        
        // CRITICAL: Broadcast user-left-room FIRST before destroying connections
        // This ensures the server and other clients are notified before WebSocket closes
        console.log('[RoomManager] 📡 Broadcasting leave to server...');
        await this.roomService.leaveRoom(this.currentRoom.id);
        
        // Add small delay to ensure broadcast is processed
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[RoomManager] ✅ Leave broadcast complete');
        
        // NOW destroy local connections
        console.log('[RoomManager] 🧹 Cleaning up local connections...');
        await this.chatManager.leaveRoom();
        
        this.currentRoom = null;
        this.isHost = false;
        
        console.log('[RoomManager] ✅ Left room successfully');
    }
    
    generateRoomLink(roomId, options = {}) {
        if (!this.currentRoom || this.currentRoom.id !== roomId) {
            throw new Error('Can only generate links for current room');
        }
        
        const baseUrl = window.location.origin + window.location.pathname;
        const token = this._generateAccessToken();
        
        let url = `${baseUrl}?room=${roomId}&token=${token}`;
        
        if (options.instantJoin) {
            url += '&instant=true';
        }
        
        return url;
    }
    
    _generateAccessToken() {
        return 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    getCurrentRoom() {
        return this.currentRoom;
    }
    
    isCurrentHost() {
        return this.isHost;
    }
}
