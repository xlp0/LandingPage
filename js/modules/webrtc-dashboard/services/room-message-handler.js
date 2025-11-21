// Room Message Handler Module
// Processes incoming broadcast messages

export class RoomMessageHandler {
    constructor(roomState, broadcaster, eventEmitter, webrtcCoordinator) {
        this.roomState = roomState;
        this.broadcaster = broadcaster;
        this.eventEmitter = eventEmitter;
        this.webrtcCoordinator = webrtcCoordinator;
    }
    
    /**
     * Initialize message handlers
     */
    init() {
        this.broadcaster.onMessage((type, data) => {
            this.handleMessage(type, data);
        });
        
        console.log('[RoomMessageHandler] Initialized');
    }
    
    /**
     * Handle incoming message
     * @param {string} type - Message type
     * @param {Object} data - Message data
     * @param {Object} fullMessage - Full message object (optional)
     */
    handleMessage(type, data, fullMessage) {
        console.log('[RoomMessageHandler] 📨 Received:', type);
        
        switch (type) {
            case 'server-room-list':
                this._handleServerRoomList(data, fullMessage);
                break;
                
            case 'room-created':
                this._handleRoomCreated(data);
                break;
                
            case 'room-removed':
                this._handleRoomRemoved(data);
                break;
                
            case 'room-list-request':
                this._handleRoomListRequest(data);
                break;
                
            case 'user-joined-room':
                this._handleUserJoinedRoom(data);
                break;
                
            case 'user-left-room':
                this._handleUserLeftRoom(data);
                break;
                
            default:
                console.log('[RoomMessageHandler] Unknown message type:', type);
        }
    }
    
    /**
     * Handle server room list (authoritative source of truth)
     * @private
     */
    _handleServerRoomList(data, fullMessage) {
        // Handle both message formats:
        // Format 1: data = { rooms: [...] } (from WebSocket relay)
        // Format 2: fullMessage = { rooms: [...] } (from server directly)
        const roomList = (data && data.rooms) || (fullMessage && fullMessage.rooms) || [];
        
        if (!roomList || roomList.length === undefined) {
            console.error('[RoomMessageHandler] ❌ Invalid server room list format:', { data, fullMessage });
            return;
        }
        
        console.log('[RoomMessageHandler] 📋 SERVER ROOM LIST received:', roomList.length, 'rooms');
        
        // Clear existing rooms and replace with server list
        this.roomState.clear();
        
        // Add all rooms from server
        roomList.forEach(room => {
            const roomData = {
                id: room.id,
                name: room.name,
                description: room.description,
                host: room.host,
                hostId: room.hostId,
                createdAt: room.createdAt,
                participants: room.participants || [],
                status: 'active',
                participantCount: room.participantCount
            };
            
            this.roomState.addRoom(roomData);
            
            console.log('[RoomMessageHandler]   🏠', room.name, '- Participants:', room.participantCount);
            if (room.participants && room.participants.length > 0) {
                room.participants.forEach(p => {
                    console.log('[RoomMessageHandler]     👤', p.name);
                });
            }
        });
        
        console.log('[RoomMessageHandler] ✅ Updated room list from server');
        
        // Emit event for UI update
        this.eventEmitter.emit('roomListUpdated', this.roomState.getActiveRooms());
    }
    
    /**
     * Handle room created message
     * @private
     */
    _handleRoomCreated(data) {
        const existingRoom = this.roomState.getRoom(data.id);
        
        if (existingRoom) {
            console.log('[RoomMessageHandler] Room already exists:', data.id);
            return;
        }
        
        // Add room to state
        const room = {
            ...data,
            participants: [],
            status: 'active'
        };
        
        this.roomState.addRoom(room);
        console.log('[RoomMessageHandler] ✅ Added room:', data.name);
        
        // Emit event for UI update
        this.eventEmitter.emit('roomListUpdated', this.roomState.getActiveRooms());
    }
    
    /**
     * Handle room removed message
     * @private
     */
    _handleRoomRemoved(data) {
        const room = this.roomState.removeRoom(data.roomId);
        
        if (room) {
            console.log('[RoomMessageHandler] ✅ Removed room:', data.roomId);
            this.eventEmitter.emit('roomListUpdated', this.roomState.getActiveRooms());
        }
    }
    
    /**
     * Handle room list request
     * Respond with our local rooms
     * @private
     */
    _handleRoomListRequest(data) {
        console.log('[RoomMessageHandler] 📢 Responding to room list request');
        
        const localRooms = this.roomState.getAllRooms().filter(room => 
            this.roomState.isLocalRoom(room.id) && room.status === 'active'
        );
        
        // Broadcast each of our rooms
        localRooms.forEach(room => {
            const sanitizedRoom = {
                id: room.id,
                name: room.name,
                description: room.description,
                host: room.host,
                createdAt: room.createdAt,
                status: room.status,
                participantCount: room.participants.length
            };
            
            this.broadcaster.broadcastRoomCreated(sanitizedRoom);
        });
        
        console.log('[RoomMessageHandler] ✅ Sent', localRooms.length, 'rooms');
    }
    
    /**
     * Handle user joined room
     * Coordinate WebRTC connection if needed
     * @private
     */
    async _handleUserJoinedRoom(data) {
        const { roomId, userId, userName, existingParticipants } = data;
        
        console.log('[RoomMessageHandler] 🎯 User joined room:', userName);
        
        // If this is OUR join signal, handle existing participants
        if (userId === this.webrtcCoordinator.currentUserId) {
            console.log('[RoomMessageHandler] 👋 This is OUR join signal');
            
            if (existingParticipants && existingParticipants.length > 0) {
                await this.webrtcCoordinator.handleExistingParticipants(roomId, existingParticipants);
            }
        } else {
            // Another user joined, initiate connection if we should
            await this.webrtcCoordinator.handleUserJoined(data);
        }
        
        // Emit event
        this.eventEmitter.emit('user-joined-room', data);
    }
    
    /**
     * Handle user left room
     * @private
     */
    _handleUserLeftRoom(data) {
        const { roomId, userId } = data;
        
        console.log('[RoomMessageHandler] 👋 User left room:', userId);
        
        // Remove from room participants
        this.roomState.removeParticipantFromRoom(roomId, userId);
        
        // Emit event
        this.eventEmitter.emit('user-left-room', data);
    }
}
