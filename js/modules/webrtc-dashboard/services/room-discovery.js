// Room Discovery Module
// Handles periodic room discovery and visibility changes

export class RoomDiscovery {
    constructor(broadcaster) {
        this.broadcaster = broadcaster;
        this.discoveryInterval = null;
        this.isDiscovering = false;
    }
    
    /**
     * Start periodic room discovery
     */
    startDiscovery() {
        if (this.isDiscovering) {
            console.log('[RoomDiscovery] Already discovering');
            return;
        }
        
        console.log('[RoomDiscovery] Starting room discovery...');
        this.isDiscovering = true;
        
        // Initial request with delay to ensure other tabs are ready
        setTimeout(() => {
            this._requestRoomList();
        }, 500);
        
        // Periodic discovery every 10 seconds
        this.discoveryInterval = setInterval(() => {
            this._requestRoomList();
        }, 10000);
        
        // Request when tab becomes visible
        this._setupVisibilityListener();
    }
    
    /**
     * Stop room discovery
     */
    stopDiscovery() {
        console.log('[RoomDiscovery] Stopping discovery');
        
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = null;
        }
        
        this.isDiscovering = false;
    }
    
    /**
     * Manual refresh of room list
     */
    refreshRooms() {
        console.log('[RoomDiscovery] Manual refresh requested');
        this._requestRoomList();
    }
    
    /**
     * Request room list from network
     * @private
     */
    _requestRoomList() {
        if (this.broadcaster) {
            this.broadcaster.broadcastRoomListRequest();
        }
    }
    
    /**
     * Setup listener for tab visibility changes
     * @private
     */
    _setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isDiscovering) {
                console.log('[RoomDiscovery] Tab visible, requesting room list');
                setTimeout(() => {
                    this._requestRoomList();
                }, 100);
            }
        });
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopDiscovery();
        console.log('[RoomDiscovery] Destroyed');
    }
}
