// ConnectionStatus.js - Plain JavaScript implementation

export class ConnectionStatus {
    constructor(store) {
        this.store = store;
        this.container = null;
        this.statusElement = null;
        this.peerCountElement = null;
        this.errorElement = null;
        this.unsubscribe = null;
        
        this.statusClasses = {
            disconnected: 'bg-gray-200 text-gray-800',
            connecting: 'bg-yellow-200 text-yellow-800',
            connected: 'bg-green-200 text-green-800',
            error: 'bg-red-200 text-red-800'
        };
        
        this.statusLabels = {
            disconnected: 'Disconnected',
            connecting: 'Connecting...',
            connected: 'Connected',
            error: 'Connection Error'
        };
        
        this.init();
    }
    
    init() {
        // Create container if it doesn't exist
        this.container = document.createElement('div');
        this.container.className = 'fixed bottom-4 right-4 z-50';
        this.container.id = 'connection-status-container';
        
        // Create status element
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'px-4 py-2 rounded-lg shadow-md flex items-center space-x-2';
        
        // Create status indicator dot
        const dot = document.createElement('div');
        dot.className = 'w-3 h-3 rounded-full bg-gray-500';
        this.statusElement.appendChild(dot);
        
        // Create status text
        const statusText = document.createElement('span');
        statusText.className = 'font-medium';
        this.statusElement.appendChild(statusText);
        
        // Create peer count span
        this.peerCountElement = document.createElement('span');
        this.peerCountElement.className = 'ml-2 text-sm';
        this.statusElement.appendChild(this.peerCountElement);
        
        // Create error element
        this.errorElement = document.createElement('div');
        this.errorElement.className = 'mt-2 text-xs text-red-700 bg-red-100 px-2 py-1 rounded hidden';
        
        // Add elements to container
        this.container.appendChild(this.statusElement);
        this.container.appendChild(this.errorElement);
        
        // Add to body if not already there
        if (!document.getElementById('connection-status-container')) {
            document.body.appendChild(this.container);
        }
        
        // Subscribe to store updates
        this.unsubscribe = this.store.subscribe(() => this.update());
        
        // Initial update
        this.update();
        
        console.log('[ConnectionStatus] Initialized');
    }
    
    update() {
        const state = this.store.getState();
        const { status, error, peerCount } = state.connection;
        
        // Update status
        const statusText = this.statusElement.querySelector('span.font-medium');
        statusText.textContent = this.statusLabels[status] || 'Unknown';
        
        // Update status dot color
        const dot = this.statusElement.querySelector('.w-3.h-3');
        dot.className = `w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' : 
            status === 'connecting' ? 'bg-yellow-500' : 
            status === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`;
        
        // Update status container class
        this.statusElement.className = `px-4 py-2 rounded-lg shadow-md flex items-center space-x-2 ${this.statusClasses[status] || this.statusClasses.disconnected}`;
        
        // Update peer count
        if (status === 'connected' && peerCount > 0) {
            this.peerCountElement.textContent = `• ${peerCount} ${peerCount === 1 ? 'peer' : 'peers'}`;
            this.peerCountElement.classList.remove('hidden');
        } else {
            this.peerCountElement.classList.add('hidden');
        }
        
        // Update error message
        if (status === 'error' && error) {
            this.errorElement.textContent = error;
            this.errorElement.classList.remove('hidden');
        } else {
            this.errorElement.classList.add('hidden');
        }
    }
    
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

export default ConnectionStatus;