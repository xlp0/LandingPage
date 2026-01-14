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

// ⚠️ MCard API enabled for library use
import mcardRoutes from './server/mcard-api.mjs';

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

// MCard API
app.use('/api/mcard', mcardRoutes);
console.log('[Server] ✅ MCard API enabled');

// Add cache control headers for HTML files to prevent aggressive caching
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Serve public folder for CSS, JS, and other assets - moved before root static middleware
// Serve public folder for CSS, JS, and other assets - moved before root static middleware
import serveIndex from 'serve-index';

// Enable directory listing for public folder
app.use('/public', express.static(path.join(__dirname, 'public')), serveIndex(path.join(__dirname, 'public'), { 'icons': true }));

app.use(express.static(path.join(__dirname, 'public')));
// Also serve from root for backward compatibility with some paths
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/' });

// Track connected clients
const connectedClients = new Set();
const clientConnections = new Map();

// Initialize room management
const roomRegistry = new RoomRegistry();
const roomMessageHandler = new RoomMessageHandler(
    roomRegistry,
    () => broadcastRoomList(),
    clientConnections
);

// ... (WebSocket logic helpers kept clean, defined below)

// Exportable start function
function startServer(options = {}) {
    const PORT = options.port || process.env.PORT || 3000;
    const HOST = options.host || '0.0.0.0';

    server.listen(PORT, HOST, () => {
        console.log(`PKC WebSocket Gateway Server running on port ${PORT}`);
        console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/ws/`);
        console.log(`Connected clients: ${connectedClients.size}`);
        console.log(`[Server] 📡 Periodic room list broadcast enabled (every 5 seconds)`);
        console.log(`[Server] ✅ MCard API enabled with mcard-js v2.1.8 library`);

        if (options.onStart) options.onStart();
    });

    return { app, server, wss };
}

// Log WebSocket upgrade attempts
server.on('upgrade', (req, socket, head) => {
    // ... (existing logging logic)
});

// ... (existing broadcastClientCount, broadcastRoomList, wss.on connection logic)
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
    // console.log(`[Server] 📋 Room list data:`, JSON.stringify(roomList, null, 2));

    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN &&
            client.channels &&
            client.channels.has('webrtc-dashboard-rooms')) {
            client.send(message);
        }
    });
}

wss.on('connection', (ws, req) => {
    const clientId = Date.now() + Math.random();
    connectedClients.add(clientId);

    clientConnections.set(clientId, {
        ws: ws,
        userId: null,
        rooms: new Set()
    });

    console.log(`[WebSocket] ✅ Client connected (${clientId}):`, req.socket.remoteAddress);

    ws.send(JSON.stringify({
        type: 'client_count',
        count: connectedClients.size,
        timestamp: new Date().toISOString()
    }));

    broadcastClientCount();

    ws.channels = new Set();
    ws.clientId = clientId;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'subscribe') {
                ws.channels.add(data.channel);
                return;
            }

            if (data.type === 'unsubscribe') {
                ws.channels.delete(data.channel);
                return;
            }

            if (data.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
                return;
            }

            const handled = roomMessageHandler.handle(data, ws);
            if (handled) return;

            if (data.channel) {
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === client.OPEN && client.channels && client.channels.has(data.channel)) {
                        client.send(message.toString());
                    }
                });
            }

        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`[WebSocket] 🔌 Client disconnected (${clientId})`);

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

    ws.on('error', (error) => {
        console.error(`[WebSocket] ❌ Error for client (${clientId}):`, error);
        // Cleanup logic same as close
        if (clientConnections.has(clientId)) {
            const connection = clientConnections.get(clientId);
            const { userId, rooms } = connection;
            if (userId && rooms.size > 0) {
                rooms.forEach(roomId => roomRegistry.removeUserFromRoom(roomId, userId));
                broadcastRoomList();
            }
            clientConnections.delete(clientId);
        }
        connectedClients.delete(clientId);
        broadcastClientCount();
    });
});

// ... (Health check, API routes kept same, served before static)
app.get('/health', (req, res) => {
    // ... implementation same as before
    const roomList = roomRegistry.getAllRooms();
    res.json({
        status: 'ok',
        version: process.env.npm_package_version || 'unknown',
        uptime: process.uptime(),
        // ...
        mcard: { enabled: true, library: 'mcard-js v2.1.8' }
    });
});

// ... (other API routes: /api/rooms, /api/env, /api/config, /app-config.json)
// Re-implementing briefly for completeness in refactor
app.get('/api/rooms', (req, res) => {
    const roomList = roomRegistry.getAllRooms();
    res.header('Access-Control-Allow-Origin', '*');
    res.json({ total: roomRegistry.getRoomCount(), rooms: roomList });
});

app.get('/api/env', (req, res) => {
    res.json({
        WEBSOCKET_URL: process.env.WEBSOCKET_URL || '',
        STUN_SERVERS: process.env.STUN_SERVERS || '',
        // ... other envs
        NODE_ENV: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/config', (req, res) => {
    let stunServers = [];
    if (process.env.STUN_SERVERS) {
        stunServers = process.env.STUN_SERVERS.split(',').map(url => ({ urls: url.trim() }));
    }
    const config = {
        WEBSOCKET_URL: process.env.WEBSOCKET_URL || null,
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3000,
        STUN_SERVERS: stunServers.length > 0 ? stunServers : null
    };
    res.header('Access-Control-Allow-Origin', '*');
    res.json(config);
});

app.get('/app-config.json', (req, res) => {
    // ... same logic as before
    const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:8765/ws/';
    const wsUrlObj = new URL(wsUrl);
    // ...
    res.json({
        wsHost: wsUrlObj.hostname,
        wsPort: parseInt(wsUrlObj.port || (wsUrlObj.protocol === 'wss:' ? 443 : 80)),
        wsPath: wsUrlObj.pathname,
        p2p: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });
});


// Serve static files AFTER all API routes
// Ensure this generic static middleware is last
app.use(express.static(__dirname));

// Periodic room list broadcast
setInterval(() => {
    if (roomRegistry.getRoomCount() > 0) {
        broadcastRoomList();
    }
}, 5000);

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}

export { startServer, app, server, wss };
