// Shared Broadcast Service Instance
// Single instance shared across all dashboard services

import { WebSocketBroadcastService } from './websocket-broadcast-service.js';

// Create shared instances for each channel
const services = new Map();

export function getSharedBroadcastService(channelName) {
    if (!services.has(channelName)) {
        console.log('[SharedBroadcast] Creating new WebSocket service for channel:', channelName);
        services.set(channelName, new WebSocketBroadcastService(channelName));
    }
    return services.get(channelName);
}

export function destroyAllServices() {
    console.log('[SharedBroadcast] Destroying all services');
    services.forEach((service, channelName) => {
        service.destroy();
    });
    services.clear();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    destroyAllServices();
});
