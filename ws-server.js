const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const cors = require('cors');
const path = require('path');

// Import room management modules
const RoomRegistry = require('./room-registry.js');
const RoomMessageHandler = require('./room-message-handler-server.js');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from the current directory
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/' });

// Track connected clients
let connectedClients = new Set();

// Track WebSocket connections: Map<clientId, { ws, userId, rooms: Set<roomId> }>
const clientConnections = new Map();

// Initialize room management
const roomRegistry = new RoomRegistry();
const roomMessageHandler = new RoomMessageHandler(
    roomRegistry, 
    () => broadcastRoomList(),
    clientConnections  // Pass connection tracking
);

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

// Function to broadcast room list to all clients on webrtc-dashboard-rooms channel
function broadcastRoomList() {
    const roomList = roomRegistry.getAllRooms();

    const message = JSON.stringify({
        type: 'server-room-list',
        channel: 'webrtc-dashboard-rooms',
        rooms: roomList,
        timestamp: new Date().toISOString()
    });

    console.log(`[Server] 📡 Broadcasting room list: ${roomList.length} rooms`);
    console.log(`[Server] 📋 Room list data:`, JSON.stringify(roomList, null, 2));

    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN && 
            client.channels && 
            client.channels.has('webrtc-dashboard-rooms')) {
            client.send(message);
        }
    });
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientId = Date.now() + Math.random();
    connectedClients.add(clientId);
    
    // Track this connection
    clientConnections.set(clientId, {
        ws: ws,
        userId: null,  // Will be set when user joins a room
        rooms: new Set()
    });
    
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
    ws.clientId = clientId;  // Store clientId on ws object for easy access
    
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
            
            // Try to handle as room management message
            const handled = roomMessageHandler.handle(data, ws);
            if (handled) {
                return; // Message was handled by room manager
            }
            
            // Broadcast message to all clients subscribed to the same channel
            if (data.channel) {
                console.log(`[Server] 📤 Relaying message type "${data.type}" on channel "${data.channel}"`);
                let broadcastCount = 0;
                
                wss.clients.forEach(client => {
                    // Don't send to self, only to other clients on the same channel
                    if (client !== ws && client.readyState === client.OPEN && client.channels && client.channels.has(data.channel)) {
                        client.send(message.toString());
                        broadcastCount++;
                    }
                });
                
                console.log(`[Server] ✅ Message relayed to ${broadcastCount} clients`);
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
        console.log(`[WebSocket] 🔌 Client disconnected (${clientId})`);
        
        // Clean up user from all rooms
        if (clientConnections.has(clientId)) {
            const connection = clientConnections.get(clientId);
            const { userId, rooms } = connection;
            
            if (userId && rooms.size > 0) {
                console.log(`[WebSocket] 🧹 Cleaning up user ${userId} from ${rooms.size} rooms`);
                
                // Remove user from each room
                rooms.forEach(roomId => {
                    roomRegistry.removeUserFromRoom(roomId, userId);
                    console.log(`[WebSocket] ✅ Removed user ${userId} from room ${roomId}`);
                });
                
                // Broadcast updated room list
                broadcastRoomList();
            }
            
            // Remove connection tracking
            clientConnections.delete(clientId);
        }
        
        connectedClients.delete(clientId);
        console.log(`[WebSocket] Total clients: ${connectedClients.size}`);
        broadcastClientCount();
    });

    ws.on('error', (error) => {
        console.error(`[WebSocket] ❌ Error for client (${clientId}):`, error);
        
        // Clean up on error (same as close)
        if (clientConnections.has(clientId)) {
            const connection = clientConnections.get(clientId);
            const { userId, rooms } = connection;
            
            if (userId && rooms.size > 0) {
                rooms.forEach(roomId => {
                    roomRegistry.removeUserFromRoom(roomId, userId);
                });
                broadcastRoomList();
            }
            
            clientConnections.delete(clientId);
        }
        
        connectedClients.delete(clientId);
        broadcastClientCount();
    });
});

// Health check endpoint (for Kubernetes probes and debugging)
app.get('/health', (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        host: room.host,
        participantCount: room.participants.size,
        participants: Array.from(room.participants)
    }));
    
    res.json({
        status: 'ok',
        version: process.env.GIT_SHA || process.env.npm_package_version || 'unknown',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        endpoints: {
            websocket: '/ws/',
            config: '/api/config',
            env: '/api/env',
            rooms: '/api/rooms'
        },
        environment: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || 3001,
            WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'auto-detect'
        },
        websocket: {
            connected_clients: connectedClients.size
        },
        rooms: {
            total: rooms.size,
            list: roomList
        }
    });
});

// Rooms API endpoint
app.get('/api/rooms', (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        host: room.host,
        hostId: room.hostId,
        createdAt: room.createdAt,
        participantCount: room.participants.size,
        participants: Array.from(room.participants)
    }));
    
    res.header('Access-Control-Allow-Origin', '*');
    res.json({
        total: rooms.size,
        rooms: roomList,
        timestamp: new Date().toISOString()
    });
});

// Root route serves index.html (static middleware will handle this automatically)
// But we keep this as fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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

// Serve static files AFTER all API routes
// This prevents static file middleware from intercepting API requests
app.use(express.static(__dirname));

// Periodic room list broadcast (every 5 seconds)
setInterval(() => {
    if (roomRegistry.getRoomCount() > 0) {
        console.log(`[Server] 📡 Periodic broadcast: ${roomRegistry.getRoomCount()} rooms`);
        broadcastRoomList();
    }
}, 5000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PKC WebSocket Gateway Server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://0.0.0.0:${PORT}/ws/`);
    console.log(`Connected clients: ${connectedClients.size}`);
    console.log(`[Server] 📡 Periodic room list broadcast enabled (every 5 seconds)`);
});
