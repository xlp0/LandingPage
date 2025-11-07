const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/' });

// Track connected clients
let connectedClients = new Set();

// Function to broadcast client count to all connected clients
function broadcastClientCount() {
    const count = connectedClients.size;
    const message = JSON.stringify({
        type: 'client_count',
        count: count,
        timestamp: new Date().toISOString()
    });

    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });

    console.log(`Broadcasting client count: ${count} clients connected`);
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientId = Date.now() + Math.random();
    connectedClients.add(clientId);
    console.log(`Client connected (${clientId}):`, req.socket.remoteAddress);
    console.log(`Total clients: ${connectedClients.size}`);

    // Send current client count to the new client immediately
    ws.send(JSON.stringify({
        type: 'client_count',
        count: connectedClients.size,
        timestamp: new Date().toISOString()
    }));

    // Broadcast updated count to all other clients
    broadcastClientCount();

    ws.on('message', (message) => {
        console.log('Received from client:', message.toString());

        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'ping') {
                // Respond to ping with pong
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
            }
        } catch (e) {
            // If not JSON, treat as regular message and echo
            const response = {
                type: 'echo',
                original: message.toString(),
                timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(response));
        }
    });

    ws.on('close', () => {
        connectedClients.delete(clientId);
        console.log(`Client disconnected (${clientId})`);
        console.log(`Total clients: ${connectedClients.size}`);
        broadcastClientCount();
    });

    ws.on('error', (error) => {
        connectedClients.delete(clientId);
        console.error('WebSocket error:', error);
        broadcastClientCount();
    });
});

// Basic HTTP route
app.get('/', (req, res) => {
    res.json({
        message: 'PKC WebSocket Gateway Server',
        status: 'running',
        connected_clients: connectedClients.size
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PKC WebSocket Gateway Server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://0.0.0.0:${PORT}/ws/`);
    console.log(`Connected clients: ${connectedClients.size}`);
});
