// Room Event Emitter Module
// Provides pub/sub event system for room updates

export class RoomEventEmitter {
    constructor() {
        this.eventHandlers = new Map(); // eventName -> Set<handler>
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventName - Event to subscribe to
     * @param {Function} handler - Handler function
     */
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, new Set());
        }
        
        this.eventHandlers.get(eventName).add(handler);
        console.log('[RoomEventEmitter] Subscribed to:', eventName);
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event to unsubscribe from
     * @param {Function} handler - Handler function
     */
    off(eventName, handler) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            handlers.delete(handler);
            console.log('[RoomEventEmitter] Unsubscribed from:', eventName);
        }
    }
    
    /**
     * Emit an event
     * @param {string} eventName - Event to emit
     * @param {*} data - Event data
     */
    emit(eventName, data) {
        const handlers = this.eventHandlers.get(eventName);
        if (!handlers || handlers.size === 0) {
            return;
        }
        
        console.log('[RoomEventEmitter] Emitting:', eventName, 'to', handlers.size, 'handlers');
        
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('[RoomEventEmitter] Handler error for', eventName, ':', error);
            }
        });
    }
    
    /**
     * Remove all handlers for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.eventHandlers.delete(eventName);
            console.log('[RoomEventEmitter] Removed all listeners for:', eventName);
        } else {
            this.eventHandlers.clear();
            console.log('[RoomEventEmitter] Removed all listeners');
        }
    }
    
    /**
     * Get handler count for an event
     * @param {string} eventName - Event name
     * @returns {number} Handler count
     */
    listenerCount(eventName) {
        const handlers = this.eventHandlers.get(eventName);
        return handlers ? handlers.size : 0;
    }
    
    /**
     * Get all event names
     * @returns {Array<string>} Event names
     */
    eventNames() {
        return Array.from(this.eventHandlers.keys());
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.eventHandlers.clear();
        console.log('[RoomEventEmitter] Destroyed');
    }
}
