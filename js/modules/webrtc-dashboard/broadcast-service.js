// Centralized Broadcast Service
// Handles cross-tab communication with fallback mechanisms

export class BroadcastService {
    constructor(channelName) {
        this.channelName = channelName;
        this.broadcastChannel = null;
        this.listeners = new Map();
        this.messageQueue = [];
        this.isReady = false;
        
        console.log('[BroadcastService] Creating service for channel:', channelName);
        this._init();
    }
    
    _init() {
        // Try BroadcastChannel first
        this._initBroadcastChannel();
        
        // Always setup localStorage fallback
        this._initLocalStorageFallback();
        
        // Mark as ready after a short delay
        setTimeout(() => {
            this.isReady = true;
            this._processMessageQueue();
            console.log('[BroadcastService] Service ready for channel:', this.channelName);
        }, 100);
    }
    
    _initBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel(this.channelName);
                this.broadcastChannel.onmessage = (event) => {
                    console.log('[BroadcastService] 📨 BC received:', event.data.type, 'on', this.channelName);
                    this._handleMessage(event.data, 'broadcastchannel');
                };
                console.log('[BroadcastService] ✅ BroadcastChannel initialized for:', this.channelName);
            } catch (error) {
                console.error('[BroadcastService] ❌ BroadcastChannel failed:', error);
                this.broadcastChannel = null;
            }
        } else {
            console.warn('[BroadcastService] BroadcastChannel not supported');
        }
    }
    
    _initLocalStorageFallback() {
        const storageKey = `broadcast-${this.channelName}`;
        
        window.addEventListener('storage', (event) => {
            if (event.key === storageKey && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    // Don't process our own messages
                    if (data.sender !== this._getTabId()) {
                        console.log('[BroadcastService] 📨 LS received:', data.type, 'on', this.channelName);
                        this._handleMessage(data, 'localstorage');
                    }
                } catch (error) {
                    console.error('[BroadcastService] Failed to parse localStorage message:', error);
                }
            }
        });
        
        console.log('[BroadcastService] ✅ localStorage fallback initialized for:', this.channelName);
    }
    
    send(type, data = {}) {
        const message = {
            type,
            data,
            timestamp: Date.now(),
            sender: this._getTabId(),
            channel: this.channelName
        };
        
        if (!this.isReady) {
            console.log('[BroadcastService] Queueing message:', type);
            this.messageQueue.push(message);
            return;
        }
        
        console.log('[BroadcastService] 📤 Sending:', type, 'on', this.channelName);
        
        // Try BroadcastChannel first
        let bcSuccess = false;
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(message);
                bcSuccess = true;
                console.log('[BroadcastService] ✅ BC sent:', type);
            } catch (error) {
                console.error('[BroadcastService] ❌ BC failed:', error);
                this.broadcastChannel = null;
            }
        }
        
        // Always try localStorage as backup (or primary if BC failed)
        this._sendViaLocalStorage(message);
        
        return message;
    }
    
    _sendViaLocalStorage(message) {
        try {
            const storageKey = `broadcast-${this.channelName}`;
            const value = JSON.stringify(message);
            
            // Set the value
            localStorage.setItem(storageKey, value);
            console.log('[BroadcastService] ✅ LS sent:', message.type);
            
            // Clear after a short delay to trigger storage event in other tabs
            setTimeout(() => {
                try {
                    localStorage.removeItem(storageKey);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 50);
            
        } catch (error) {
            console.error('[BroadcastService] ❌ LS failed:', error);
        }
    }
    
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
        console.log('[BroadcastService] Listener added for:', type, 'on', this.channelName);
    }
    
    off(type, callback) {
        if (this.listeners.has(type)) {
            const callbacks = this.listeners.get(type);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    _handleMessage(message, source) {
        const { type, data } = message;
        
        // Emit to specific listeners
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(callback => {
                try {
                    callback(data, message, source);
                } catch (error) {
                    console.error('[BroadcastService] Listener error:', error);
                }
            });
        }
        
        // Emit to wildcard listeners
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                try {
                    callback(data, message, source);
                } catch (error) {
                    console.error('[BroadcastService] Wildcard listener error:', error);
                }
            });
        }
    }
    
    _processMessageQueue() {
        if (this.messageQueue.length > 0) {
            console.log('[BroadcastService] Processing', this.messageQueue.length, 'queued messages');
            this.messageQueue.forEach(message => {
                this.send(message.type, message.data);
            });
            this.messageQueue = [];
        }
    }
    
    _getTabId() {
        if (!this._tabId) {
            this._tabId = 'tab-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        }
        return this._tabId;
    }
    
    destroy() {
        console.log('[BroadcastService] Destroying service for:', this.channelName);
        
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        
        this.listeners.clear();
        this.messageQueue = [];
        this.isReady = false;
    }
    
    // Test method
    test() {
        console.log('[BroadcastService] 🧪 Testing channel:', this.channelName);
        this.send('test', {
            message: 'Test from ' + this._getTabId(),
            timestamp: Date.now()
        });
    }
}
