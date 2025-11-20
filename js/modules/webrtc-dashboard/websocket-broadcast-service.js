// WebSocket Broadcast Service
// Uses WebSocket server for cross-browser/cross-device communication

export class WebSocketBroadcastService {
    constructor(channelName, wsUrl = null) {
        this.channelName = channelName;
        
        // Auto-detect WebSocket URL based on current location
        if (!wsUrl) {
            wsUrl = this._getWebSocketUrl();
        }
        
        this.wsUrl = wsUrl;
        this.ws = null;
        this.listeners = new Map();
        this.messageQueue = [];
        this.isReady = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        console.log('[WSBroadcast] Creating service for channel:', channelName);
        console.log('[WSBroadcast] WebSocket URL:', this.wsUrl);
        this._init();
    }
    
    _getWebSocketUrl() {
        // Get current page protocol and host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // includes port if present
        
        // If running on localhost with a specific port, use that
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Use port 8765 for local development
            return `${protocol}//${window.location.hostname}:8765/ws/`;
        }
        
        // For production (pkc.pub, etc.), use the same host
        return `${protocol}//${host}/ws/`;
    }
    
    _init() {
        this._connect();
    }
    
    _connect() {
        try {
            console.log('[WSBroadcast] Connecting to WebSocket:', this.wsUrl);
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('[WSBroadcast] ✅ WebSocket connected');
                this.reconnectAttempts = 0;
                this.isReady = true;
                
                // Subscribe to channel
                this._send({
                    type: 'subscribe',
                    channel: this.channelName
                });
                
                // Process queued messages
                this._processMessageQueue();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('[WSBroadcast] 📨 Message received:', message.type, 'on', this.channelName);
                    
                    // Only handle messages for our channel
                    if (message.channel === this.channelName) {
                        this._handleMessage(message);
                    }
                } catch (error) {
                    console.error('[WSBroadcast] Failed to parse message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('[WSBroadcast] ❌ WebSocket error:', error);
            };
            
            this.ws.onclose = () => {
                console.log('[WSBroadcast] WebSocket closed');
                this.isReady = false;
                
                // Attempt to reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                    console.log(`[WSBroadcast] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    setTimeout(() => this._connect(), delay);
                } else {
                    console.error('[WSBroadcast] Max reconnection attempts reached');
                }
            };
            
        } catch (error) {
            console.error('[WSBroadcast] Failed to create WebSocket:', error);
        }
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
            console.log('[WSBroadcast] Queueing message:', type);
            this.messageQueue.push(message);
            return;
        }
        
        console.log('[WSBroadcast] 📤 Sending:', type, 'on', this.channelName);
        this._send(message);
        
        return message;
    }
    
    _send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
                console.log('[WSBroadcast] ✅ Message sent:', message.type);
            } catch (error) {
                console.error('[WSBroadcast] ❌ Failed to send:', error);
            }
        } else {
            console.warn('[WSBroadcast] WebSocket not ready, queueing message');
            this.messageQueue.push(message);
        }
    }
    
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
        console.log('[WSBroadcast] Listener added for:', type, 'on', this.channelName);
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
    
    _handleMessage(message) {
        const { type, data, sender } = message;
        
        // Don't process our own messages
        if (sender === this._getTabId()) {
            console.log('[WSBroadcast] Ignoring own message:', type);
            return;
        }
        
        console.log('[WSBroadcast] 🎉 Processing message:', type, 'from', sender);
        
        // Emit to specific listeners
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(callback => {
                try {
                    callback(data, message, 'websocket');
                } catch (error) {
                    console.error('[WSBroadcast] Listener error:', error);
                }
            });
        }
        
        // Emit to wildcard listeners
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                try {
                    callback(data, message, 'websocket');
                } catch (error) {
                    console.error('[WSBroadcast] Wildcard listener error:', error);
                }
            });
        }
    }
    
    _processMessageQueue() {
        if (this.messageQueue.length > 0) {
            console.log('[WSBroadcast] Processing', this.messageQueue.length, 'queued messages');
            this.messageQueue.forEach(message => {
                this._send(message);
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
        console.log('[WSBroadcast] Destroying service for:', this.channelName);
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.listeners.clear();
        this.messageQueue = [];
        this.isReady = false;
    }
    
    // Test method
    test() {
        console.log('[WSBroadcast] 🧪 Testing channel:', this.channelName);
        this.send('test', {
            message: 'Test from ' + this._getTabId(),
            timestamp: Date.now()
        });
    }
}
