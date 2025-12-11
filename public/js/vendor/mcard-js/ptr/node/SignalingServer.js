/**
 * Signaling Server Module for WebRTC P2P Coordination.
 *
 * This module provides a reusable signaling server that can be started
 * programmatically from NetworkRuntime or standalone.
 *
 * Features:
 * - SSE (Server-Sent Events) for real-time message delivery
 * - Message buffering for offline peers
 * - Port conflict resolution (kill or fallback)
 * - Graceful shutdown
 */
import { createServer } from 'http';
import { URL } from 'url';
import { exec } from 'child_process';
/**
 * Kill any existing process on the specified port (macOS/Linux only)
 */
function killProcessOnPort(port) {
    return new Promise((resolve) => {
        exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, (error) => {
            if (error) {
                console.log(`[Signal] No existing process on port ${port} to kill`);
            }
            else {
                console.log(`[Signal] Killed existing process on port ${port}`);
            }
            // Wait for port to be released
            setTimeout(resolve, 500);
        });
    });
}
/**
 * Create and start a signaling server.
 *
 * @param config - Server configuration
 * @returns Promise with server result
 */
export async function createSignalingServer(config = {}) {
    const startPort = config.port || 3000;
    const maxTries = config.maxPortTries || 10;
    const autoFindPort = config.autoFindPort !== false;
    // In-memory signaling state
    const clients = new Map();
    const messageBuffer = new Map();
    const server = createServer((req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const path = url.pathname;
        // Health check
        if (req.method === 'GET' && path === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                clients: Array.from(clients.keys()),
                buffered: Array.from(messageBuffer.keys())
            }));
            return;
        }
        // SSE Registration: GET /signal?peer_id=...
        if (req.method === 'GET' && path === '/signal') {
            const peerId = url.searchParams.get('peer_id');
            if (!peerId) {
                res.writeHead(400);
                res.end('Missing peer_id');
                return;
            }
            console.log(`[Signal] Client connected: ${peerId}`);
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            const keepAlive = setInterval(() => {
                res.write(': keep-alive\n\n');
            }, 15000);
            clients.set(peerId, res);
            // Flush buffered messages
            if (messageBuffer.has(peerId)) {
                const msgs = messageBuffer.get(peerId);
                for (const msg of msgs) {
                    res.write(`data: ${JSON.stringify(msg)}\n\n`);
                }
                messageBuffer.delete(peerId);
            }
            req.on('close', () => {
                console.log(`[Signal] Client disconnected: ${peerId}`);
                clearInterval(keepAlive);
                clients.delete(peerId);
            });
            return;
        }
        // Message relay: POST /signal
        if (req.method === 'POST' && path === '/signal') {
            let body = '';
            req.on('data', (chunk) => body += chunk);
            req.on('end', () => {
                try {
                    const msg = JSON.parse(body);
                    const target = msg.target;
                    if (!target) {
                        res.writeHead(400);
                        res.end('Missing target');
                        return;
                    }
                    console.log(`[Signal] Relaying ${msg.type} to ${target}`);
                    if (clients.has(target)) {
                        clients.get(target).write(`data: ${JSON.stringify(msg)}\n\n`);
                    }
                    else {
                        console.log(`[Signal] Target ${target} offline, buffering...`);
                        if (!messageBuffer.has(target)) {
                            messageBuffer.set(target, []);
                        }
                        messageBuffer.get(target).push(msg);
                    }
                    res.writeHead(200);
                    res.end('Sent');
                }
                catch (e) {
                    console.error(e);
                    res.writeHead(500);
                    res.end(String(e));
                }
            });
            return;
        }
        res.writeHead(404);
        res.end();
    });
    // Try to start on the specified port
    for (let attempt = 0; attempt < maxTries; attempt++) {
        const port = startPort + attempt;
        try {
            await new Promise((resolve, reject) => {
                server.once('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        reject(err);
                    }
                    else {
                        reject(err);
                    }
                });
                server.listen(port, () => {
                    server.removeAllListeners('error');
                    resolve();
                });
            });
            console.log(`[Signal] Server running on port ${port}`);
            return {
                success: true,
                port,
                server,
                message: `Signaling server started on port ${port}`
            };
        }
        catch (err) {
            server.removeAllListeners('error');
            // First attempt - try killing existing process
            if (attempt === 0 && autoFindPort) {
                console.log(`[Signal] Port ${port} in use, trying to kill existing process...`);
                await killProcessOnPort(port);
                // Retry same port after kill
                try {
                    await new Promise((resolve, reject) => {
                        server.once('error', reject);
                        server.listen(port, () => {
                            server.removeAllListeners('error');
                            resolve();
                        });
                    });
                    console.log(`[Signal] Server running on port ${port} (after kill)`);
                    return {
                        success: true,
                        port,
                        server,
                        message: `Signaling server started on port ${port}`
                    };
                }
                catch {
                    server.removeAllListeners('error');
                    // Continue to next port
                }
            }
            if (!autoFindPort) {
                return {
                    success: false,
                    error: `Port ${port} is already in use`
                };
            }
            console.log(`[Signal] Port ${port} still in use, trying next...`);
        }
    }
    return {
        success: false,
        error: `Could not find available port after ${maxTries} attempts starting from ${startPort}`
    };
}
/**
 * Stop a signaling server.
 */
export function stopSignalingServer(server) {
    return new Promise((resolve) => {
        server.close(() => {
            console.log('[Signal] Server stopped');
            resolve();
        });
    });
}
//# sourceMappingURL=SignalingServer.js.map