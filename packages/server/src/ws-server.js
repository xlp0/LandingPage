/**
 * PKC WebSocket Gateway Server (ESM)
 * Converted to ESM to support mcard-js library
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Import room management modules (ESM)
import RoomRegistry from './room-registry.mjs';
import RoomMessageHandler from './room-message-handler-server.mjs';
import authRoutes from './routes/auth.js';
import clmRoutes from './routes/clm.js';

// ⚠️ MCard API temporarily disabled - library import issues
// import mcardRoutes from './server/mcard-api.mjs';

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'https://henry.pkc.pub', 'https://dev.pkc.pub'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add cache control headers and permissive CSP
app.use((req, res, next) => {
    // Disable caching for HTML, JS, and CSS files
    if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    // ✅ Override restrictive CSP - allow everything for development
    res.setHeader('Content-Security-Policy', 
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src * 'unsafe-inline' 'unsafe-eval' blob:; " +
        "worker-src * blob:; " +
        "style-src * 'unsafe-inline'; " +
        "img-src * data: blob:; " +
        "font-src *; " +
        "connect-src *; " +
        "media-src * data: blob:; " +
        "object-src *; " +
        "frame-src *;"
    );
    
    next();
});

// Auth routes
app.use('/api/auth', authRoutes);

// CLM routes
app.use('/api/clm', clmRoutes);

// ⚠️ MCard API temporarily disabled - library import issues
// app.use('/api/mcard', mcardRoutes);
console.log('[Server] ⚠️  MCard API disabled - library import issues (browser still works!)');

// Add cache control headers for HTML files to prevent aggressive caching
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve public folder for CSS, JS, and other assets
app.use(express.static(path.join(__dirname, 'public')));

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
    // getAllRooms() already returns formatted room data
    const roomList = roomRegistry.getAllRooms();
    
    res.json({
        status: 'ok',
        version: process.env.GIT_SHA || process.env.npm_package_version || 'unknown',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        endpoints: {
            websocket: '/ws/',
            config: '/api/config',
            env: '/api/env',
            rooms: '/api/rooms',
            mcard: '/api/mcard'
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
            total: roomRegistry.getRoomCount(),
            list: roomList
        },
        mcard: {
            enabled: true,
            library: 'mcard-js v2.1.8',
            storage: 'Server-side SQLite'
        }
    });
});

// Rooms API endpoint
app.get('/api/rooms', (req, res) => {
    const roomList = roomRegistry.getAllRooms();
    
    res.header('Access-Control-Allow-Origin', '*');
    res.json({
        total: roomRegistry.getRoomCount(),
        rooms: roomList,
        timestamp: new Date().toISOString()
    });
});

// Root route serves index.html (static middleware will handle this automatically)
// But we keep this as fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve environment variables as JSON endpoint
// Uses process.env instead of reading .env file directly
// This ensures Docker environment variables are used
app.get('/api/env', (req, res) => {
    try {
        // Return relevant environment variables
        const envObj = {
            WEBSOCKET_URL: process.env.WEBSOCKET_URL || '',
            STUN_SERVERS: process.env.STUN_SERVERS || '',
            ZITADEL_CLIENT_ID: process.env.ZITADEL_CLIENT_ID || '',
            ZITADEL_DOMAIN: process.env.ZITADEL_DOMAIN || '',
            REDIRECT_URI: process.env.REDIRECT_URI || '',
            PKC_Title_Text: process.env.PKC_Title_Text || 'PKC Landing Page',
            BASE_URL: process.env.BASE_URL || '', // Empty string triggers client-side fallback to window.location.origin
            NODE_ENV: process.env.NODE_ENV || 'development'
        };
        res.json(envObj);
    } catch (err) {
        console.error('Error reading environment variables:', err);
        res.status(500).json({ error: 'Failed to read environment variables' });
    }
});

// Serve configuration endpoint (CRITICAL for WebSocket URL configuration)
app.get('/api/config', (req, res) => {
    // Parse STUN servers from environment variable
    // Format: STUN_SERVERS=stun:server1.com:3478,stun:server2.com:3478
    let stunServers = [];
    if (process.env.STUN_SERVERS) {
        stunServers = process.env.STUN_SERVERS.split(',').map(url => ({
            urls: url.trim()
        }));
    }
    
    const config = {
        WEBSOCKET_URL: process.env.WEBSOCKET_URL || null,
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3000,
        STUN_SERVERS: stunServers.length > 0 ? stunServers : null
    };
    
    console.log('[Server] Serving /api/config:', config);
    
    // Set CORS headers explicitly for this endpoint
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(config);
});

// Serve app-config.json dynamically from environment variables
app.get('/app-config.json', (req, res) => {
    try {
        // Parse WebSocket URL from environment
        const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:8765/ws/';
        const wsUrlObj = new URL(wsUrl);
        
        // Extract host and port
        const wsHost = wsUrlObj.hostname;
        const wsPort = wsUrlObj.port || (wsUrlObj.protocol === 'wss:' ? 443 : 80);
        const wsPath = wsUrlObj.pathname;
        
        // Parse STUN servers from environment variable
        let iceServers = [];
        if (process.env.STUN_SERVERS) {
            iceServers = process.env.STUN_SERVERS.split(',').map(url => ({
                urls: url.trim()
            }));
        } else {
            // Default STUN servers
            iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ];
        }
        
        const config = {
            wsHost: wsHost,
            wsPort: parseInt(wsPort),
            wsPath: wsPath,
            p2p: {
                iceServers: iceServers
            }
        };
        
        console.log('[Server] Serving /app-config.json from environment:', config);
        
        // Set CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        res.json(config);
    } catch (err) {
        console.error('[Server] Error generating app-config.json:', err);
        res.status(500).json({ error: 'Failed to generate configuration' });
    }
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PKC WebSocket Gateway Server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://0.0.0.0:${PORT}/ws/`);
    console.log(`Connected clients: ${connectedClients.size}`);
    console.log(`[Server] 📡 Periodic room list broadcast enabled (every 5 seconds)`);
    console.log(`[Server] ✅ MCard API enabled with mcard-js v2.1.8 library`);
});
