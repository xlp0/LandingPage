const WebSocket = require('ws');

// Test script to connect to WebSocket server and monitor messages
const ws = new WebSocket('ws://localhost:3001/ws/');

ws.on('open', () => {
    console.log('Test client connected');
});

ws.on('message', (data) => {
    console.log('Test client received:', data.toString());
    try {
        const msg = JSON.parse(data.toString());
        console.log('Parsed message:', msg);
    } catch (e) {
        console.log('Raw message:', data.toString());
    }
});

ws.on('error', (error) => {
    console.error('Test client error:', error);
});

ws.on('close', () => {
    console.log('Test client disconnected');
});

// Keep the script running
setInterval(() => {
    // Send a ping to keep connection alive
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', from: 'test-client' }));
    }
}, 10000);

console.log('Test WebSocket client started...');
