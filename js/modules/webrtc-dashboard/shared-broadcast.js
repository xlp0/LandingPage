// Shared Broadcast Service Instance
// Single instance shared across all dashboard services

import { BroadcastService } from './broadcast-service.js';

// Create shared instances for each channel
const services = new Map();

export function getSharedBroadcastService(channelName) {
    if (!services.has(channelName)) {
        console.log('[SharedBroadcast] Creating new service for channel:', channelName);
        services.set(channelName, new BroadcastService(channelName));
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
