const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from the current directory
app.use(express.static(__dirname));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/' });

// Log WebSocket upgrade attempts
server.on('upgrade', (req, socket, head) => {
    console.log('[Server] WebSocket upgrade attempt:', {
        url: req.url,
        headers: {
            upgrade: req.headers.upgrade,
            connection: req.headers.connection,
            'sec-websocket-key': req.headers['sec-websocket-key'],
            'sec-websocket-version': req.headers['sec-websocket-version']
        }
    });
});

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
    console.log(`[WebSocket] ✅ Client connected (${clientId}):`, req.socket.remoteAddress);
    console.log(`[WebSocket] Total clients: ${connectedClients.size}`);
    console.log(`[WebSocket] Connection details:`, {
        url: req.url,
        protocol: req.headers['sec-websocket-protocol'],
        version: req.headers['sec-websocket-version']
    });

    // Send current client count to the new client immediately
    ws.send(JSON.stringify({
        type: 'client_count',
        count: connectedClients.size,
        timestamp: new Date().toISOString()
    }));

    // Broadcast updated count to all other clients
    broadcastClientCount();

    // Track subscribed channels for this client
    ws.channels = new Set();
    
    ws.on('message', (message) => {
        console.log('Received from client:', message.toString());

        try {
            const data = JSON.parse(message.toString());
            
            // Handle subscribe to channel
            if (data.type === 'subscribe') {
                ws.channels.add(data.channel);
                console.log(`Client ${clientId} subscribed to channel: ${data.channel}`);
                return;
            }
            
            // Handle unsubscribe from channel
            if (data.type === 'unsubscribe') {
                ws.channels.delete(data.channel);
                console.log(`Client ${clientId} unsubscribed from channel: ${data.channel}`);
                return;
            }
            
            // Handle ping
            if (data.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
                return;
            }
            
            // Broadcast message to all clients subscribed to the same channel
            if (data.channel) {
                console.log(`Broadcasting message type "${data.type}" on channel "${data.channel}"`);
                let broadcastCount = 0;
                
                wss.clients.forEach(client => {
                    // Don't send to self, only to other clients on the same channel
                    if (client !== ws && client.readyState === client.OPEN && client.channels && client.channels.has(data.channel)) {
                        client.send(message.toString());
                        broadcastCount++;
                    }
                });
                
                console.log(`Message broadcasted to ${broadcastCount} clients on channel "${data.channel}"`);
            }
            
        } catch (e) {
            console.error('Error processing message:', e);
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

// Serve .env file as JSON endpoint
app.get('/api/env', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    try {
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envObj = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && key.trim()) {
                envObj[key.trim()] = value ? value.trim() : '';
            }
        });
        res.json(envObj);
    } catch (err) {
        console.error('Error reading .env file:', err);
        res.status(500).json({ error: 'Failed to read .env file' });
    }
});

// Serve configuration endpoint (CRITICAL for WebSocket URL configuration)
app.get('/api/config', (req, res) => {
    const config = {
        WEBSOCKET_URL: process.env.WEBSOCKET_URL || null,
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3000
    };
    
    console.log('[Server] Serving /api/config:', config);
    
    // Set CORS headers explicitly for this endpoint
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(config);
});

// Handle OPTIONS requests for CORS preflight
app.options('/api/config', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PKC WebSocket Gateway Server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://0.0.0.0:${PORT}/ws/`);
    console.log(`Connected clients: ${connectedClients.size}`);
});
