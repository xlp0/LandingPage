/**
 * PKC WebSocket Gateway Server (ESM)
 * ESM server; Neutral MCard dataset and room coordination server (INV-PKG-10, INV-PKG-11).
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fsSync from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import serveIndex from 'serve-index';

import RoomRegistry from './room-registry.mjs';
import RoomMessageHandler from './room-message-handler-server.mjs';
import authRoutes from './routes/auth.js';
import clmRoutes from './routes/clm.js';
import mcardRoutes, { initMCardAPI } from './server/mcard-api.mjs';
import { createTestRunRouter } from './server/test-run-api.mjs';
import {
    RUNTIME_CONFIG_SCHEMA,
    validateLabConfig,
    validateRuntimeConfig,
    buildCorsAllowlist,
    buildContentSecurityPolicy
} from './js/harness/target-membrane.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const mcardStorage = await initMCardAPI(process.env.MCARD_DB_PATH || undefined);

const app = express();
const configPath = path.join(__dirname, 'app-config.json');
const contentSecurityPolicy = buildContentSecurityPolicy();

const baseCorsOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:4321',
    'http://localhost:4322',
    'http://localhost:8765',
    'https://pkc.pub',
    'https://test.pkc.pub',
    'https://dev.pkc.pub',
    'https://henry.pkc.pub'
];

export function loadLabConfigEnvelope(activePort = null) {
    const raw = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
    const check = validateLabConfig(raw);
    if (!check.ok) {
        const error = new Error(`Invalid app-config.json: ${check.errors.join('; ')}`);
        error.validationErrors = check.errors;
        throw error;
    }
    const portNum = Number(activePort);
    if (!Number.isInteger(portNum) || portNum <= 0 || portNum === 3001) {
        return raw;
    }
    return {
        ...raw,
        labTargets: raw.labTargets.map((item) => {
            if (
                typeof item.url === 'string' &&
                item.url.startsWith('http://127.0.0.1:3001/tests/fixtures/probe-target')
            ) {
                return {
                    ...item,
                    url: item.url.replace('http://127.0.0.1:3001', `http://127.0.0.1:${portNum}`)
                };
            }
            return item;
        })
    };
}

export function buildRuntimeConfigEnvelope(env = process.env, activePort = null) {
    let stunServers = [];
    if (env.STUN_SERVERS) {
        stunServers = env.STUN_SERVERS.split(',').map((url) => ({ urls: url.trim() })).filter((item) => item.urls);
    }
    const resolvedPort = Number(activePort || env.PORT || 3000);
    const defaultWsUrl = `ws://localhost:${env.WS_PORT || 8765}/ws/`;
    const wsCandidate = env.WEBSOCKET_URL || defaultWsUrl;
    let wsUrlObj;
    try {
        wsUrlObj = new URL(wsCandidate);
    } catch {
        wsUrlObj = new URL('ws://localhost:8765/ws/');
    }
    const wsPort = Number(wsUrlObj.port || (wsUrlObj.protocol === 'wss:' ? 443 : 80));

    const payload = {
        schema: RUNTIME_CONFIG_SCHEMA,
        owner: 'Architect',
        WEBSOCKET_URL: env.WEBSOCKET_URL || null,
        MCARD_STUDIO_URL: env.MCARD_STUDIO_URL || 'https://mcardstudio.pkc.pub/',
        NODE_ENV: env.NODE_ENV || 'development',
        PORT: resolvedPort,
        STUN_SERVERS: stunServers.length > 0 ? stunServers : null,
        wsHost: wsUrlObj.hostname,
        wsPort,
        wsPath: wsUrlObj.pathname || '/ws/'
    };

    const check = validateRuntimeConfig(payload);
    if (!check.ok) {
        const error = new Error(`Invalid runtime config: ${check.errors.join('; ')}`);
        error.validationErrors = check.errors;
        throw error;
    }
    return payload;
}

let initialLabConfig = null;
try {
    initialLabConfig = loadLabConfigEnvelope();
} catch (err) {
    console.warn('[ws-server] Could not validate app-config.json:', err.message);
}

const dynamicOrigins = buildCorsAllowlist(
    baseCorsOrigins,
    initialLabConfig,
    [process.env.PORT || 3000, process.env.TEST_PORT || 3001]
);

let boundServerPort = null;

app.use(cors({
    origin(requestOrigin, callback) {
        if (!requestOrigin) {
            callback(null, true);
            return;
        }
        if (dynamicOrigins.includes(requestOrigin)) {
            callback(null, true);
            return;
        }
        if (
            boundServerPort &&
            (requestOrigin === `http://localhost:${boundServerPort}` ||
                requestOrigin === `http://127.0.0.1:${boundServerPort}`)
        ) {
            callback(null, true);
            return;
        }
        callback(null, false);
    },
    credentials: true
}));

app.use((req, res, next) => {
    if (
        req.path.endsWith('.html') ||
        req.path.endsWith('.js') ||
        req.path.endsWith('.mjs') ||
        req.path.endsWith('.css') ||
        req.path === '/'
    ) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    res.setHeader('Content-Security-Policy', contentSecurityPolicy);
    next();
});

app.use('/api/test-runs', express.json({ limit: '2mb' }), createTestRunRouter({ storage: mcardStorage }));
console.log('[Server] ✅ Test-Runs API enabled at /api/test-runs');

app.use('/api', express.json());
app.use('/api', express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/clm', clmRoutes);
app.use('/api/mcard', mcardRoutes);
console.log('[Server] ✅ MCard API enabled');

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/' });

const connectedClients = new Set();
const clientConnections = new Map();

const roomRegistry = new RoomRegistry();
const roomMessageHandler = new RoomMessageHandler(
    roomRegistry,
    () => broadcastRoomList(),
    clientConnections
);

function resolveRequestServerPort(req) {
    const addr = server.address();
    if (addr && typeof addr === 'object' && addr.port) {
        return addr.port;
    }
    const hostHeader = req.headers.host || '';
    const idx = hostHeader.lastIndexOf(':');
    if (idx > 0) {
        const parsed = Number(hostHeader.slice(idx + 1));
        if (Number.isInteger(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return Number(process.env.PORT || 3000);
}

app.get('/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-GQC-Mount', 'ws-server-config');
    res.json({
        status: 'ok',
        version: process.env.npm_package_version || 'unknown',
        uptime: process.uptime(),
        rooms: roomRegistry.getRoomCount(),
        mcard: { enabled: true, engine: 'neutral-sqlite-cas' }
    });
});

app.get('/api/rooms', (req, res) => {
    const roomList = roomRegistry.getAllRooms();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-GQC-Mount', 'ws-server-config');
    res.json({ total: roomRegistry.getRoomCount(), rooms: roomList });
});

app.get('/api/env', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-GQC-Mount', 'ws-server-config');
    res.json({
        WEBSOCKET_URL: process.env.WEBSOCKET_URL || '',
        STUN_SERVERS: process.env.STUN_SERVERS || '',
        MCARD_STUDIO_URL: process.env.MCARD_STUDIO_URL || 'https://mcardstudio.pkc.pub/',
        NODE_ENV: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/config', (req, res) => {
    try {
        const activePort = resolveRequestServerPort(req);
        const config = buildRuntimeConfigEnvelope(process.env, activePort);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-GQC-Mount', 'ws-server-config');
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message, details: err.validationErrors || [] });
    }
});

app.get('/app-config.json', (req, res) => {
    try {
        const activePort = resolveRequestServerPort(req);
        const envelope = loadLabConfigEnvelope(activePort);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-GQC-Mount', 'ws-server-config');
        res.json(envelope);
    } catch (err) {
        res.status(500).json({ error: err.message, details: err.validationErrors || [] });
    }
});

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const astroClientDir = path.join(__dirname, 'dist', 'client');
const astroServerEntry = path.join(__dirname, 'dist', 'server', 'entry.mjs');
if (fsSync.existsSync(astroClientDir)) {
    app.use(express.static(astroClientDir, {
        setHeaders(res) {
            res.setHeader('X-GQC-Page-Mount', 'astro-prerendered');
        }
    }));
}
if (fsSync.existsSync(astroServerEntry)) {
    const { handler: astroSsrHandler } = await import(pathToFileURL(astroServerEntry).href);
    app.use((req, res, next) => {
        res.setHeader('X-GQC-Page-Mount', 'astro-ssr-handler');
        return astroSsrHandler(req, res, (err) => {
            if (!res.headersSent) {
                res.removeHeader('X-GQC-Page-Mount');
            }
            next(err);
        });
    });
}

app.use(
    '/public',
    express.static(path.join(__dirname, 'public'), {
        setHeaders(res) {
            res.setHeader('X-GQC-Page-Mount', 'legacy-static');
        }
    }),
    serveIndex(path.join(__dirname, 'public'), { icons: true })
);

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders(res) {
        res.setHeader('X-GQC-Page-Mount', 'legacy-static');
    }
}));

app.use(express.static(path.join(__dirname), {
    setHeaders(res) {
        res.setHeader('X-GQC-Page-Mount', 'legacy-static');
    }
}));

function startServer(options = {}) {
    const PORT = options.port !== undefined ? options.port : (process.env.PORT || 3000);
    const HOST = options.host || '0.0.0.0';

    server.listen(PORT, HOST, () => {
        const addr = server.address();
        boundServerPort = addr && typeof addr === 'object' ? addr.port : Number(PORT);
        console.log(`PKC WebSocket Gateway Server running on port ${boundServerPort}`);
        console.log(`WebSocket endpoint: ws://${HOST}:${boundServerPort}/ws/`);
        console.log(`Connected clients: ${connectedClients.size}`);
        console.log('[Server] 📡 Periodic room list broadcast enabled (every 5 seconds)');
        console.log('[Server] ✅ MCard API enabled via neutral SQLite dataset engine');

        if (options.onStart) options.onStart();
    });

    return { app, server, wss };
}

server.on('upgrade', () => {});

function broadcastClientCount() {
    const count = connectedClients.size;
    const message = JSON.stringify({
        type: 'client_count',
        count,
        timestamp: new Date().toISOString()
    });

    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });

    console.log(`Broadcasting client count: ${count} clients connected`);
}

function broadcastRoomList() {
    const roomList = roomRegistry.getAllRooms();

    const message = JSON.stringify({
        type: 'server-room-list',
        channel: 'webrtc-dashboard-rooms',
        rooms: roomList,
        timestamp: new Date().toISOString()
    });

    console.log(`[Server] 📡 Broadcasting room list: ${roomList.length} rooms`);

    wss.clients.forEach((client) => {
        if (
            client.readyState === client.OPEN &&
            client.channels &&
            client.channels.has('webrtc-dashboard-rooms')
        ) {
            client.send(message);
        }
    });
}

wss.on('connection', (ws, req) => {
    const clientId = Date.now() + Math.random();
    connectedClients.add(clientId);

    clientConnections.set(clientId, {
        ws,
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
                wss.clients.forEach((client) => {
                    if (
                        client !== ws &&
                        client.readyState === client.OPEN &&
                        client.channels &&
                        client.channels.has(data.channel)
                    ) {
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
                rooms.forEach((roomId) => {
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
        if (clientConnections.has(clientId)) {
            const connection = clientConnections.get(clientId);
            const { userId, rooms } = connection;
            if (userId && rooms.size > 0) {
                rooms.forEach((roomId) => roomRegistry.removeUserFromRoom(roomId, userId));
                broadcastRoomList();
            }
            clientConnections.delete(clientId);
        }
        connectedClients.delete(clientId);
        broadcastClientCount();
    });
});

setInterval(() => {
    if (roomRegistry.getRoomCount() > 0) {
        broadcastRoomList();
    }
}, 5000).unref();

const isDirectRun = Boolean(process.argv[1] && (
    fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()
));
if (isDirectRun) {
    startServer();
}

export { startServer, app, server, wss, dynamicOrigins, contentSecurityPolicy };
