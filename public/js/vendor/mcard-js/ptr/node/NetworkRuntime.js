import * as http from 'http';
import { P2PChatSession } from './P2PChatSession.js';
import { createSignalingServer } from './SignalingServer.js';
import { NetworkSecurity } from './network/NetworkSecurity.js';
import { MCardSerialization } from './network/MCardSerialization.js';
import { RateLimiter, NetworkCache } from './network/NetworkInfrastructure.js';
import { HttpClient } from './network/HttpClient.js';
/**
 * Network Runtime for handling declarative network operations.
 */
export class NetworkRuntime {
    collection;
    security;
    cache;
    rateLimiter;
    httpClient;
    sessions;
    constructor(collection) {
        this.collection = collection;
        this.security = new NetworkSecurity();
        this.cache = new NetworkCache(collection);
        this.rateLimiter = new RateLimiter();
        this.httpClient = new HttpClient(this.rateLimiter, this.cache);
        this.sessions = new Map();
    }
    async execute(_code, context, config, _chapterDir) {
        const builtin = config.builtin;
        if (!builtin) {
            throw new Error('NetworkRuntime requires "builtin" to be defined in config.');
        }
        switch (builtin) {
            case 'http_request':
                return this.handleHttpRequest(config.config || {}, context);
            case 'http_get':
                return this.handleHttpGet(config.config || {}, context);
            case 'http_post':
                return this.handleHttpPost(config.config || {}, context);
            case 'load_url':
                return this.handleLoadUrl(config.config || {}, context);
            case 'mcard_send':
                return this.handleMCardSend(config.config || {}, context);
            case 'listen_http':
                return this.handleListenHttp(config.config || {}, context);
            case 'mcard_sync':
                return this.handleMCardSync(config.config || {}, context);
            case 'listen_sync':
                return this.handleListenSync(config.config || {}, context);
            case 'webrtc_connect':
                return this.handleWebRTCConnect(config.config || {}, context);
            case 'webrtc_listen':
                return this.handleWebRTCListen(config.config || {}, context);
            case 'session_record':
                return this.handleSessionRecord(config.config || {}, context);
            case 'mcard_read':
                return this.handleMCardRead(config.config || {}, context);
            case 'run_command':
                return this.handleRunCommand(config.config, context);
            case 'clm_orchestrator':
                return this.handleOrchestrator(config.config || {}, context);
            case 'signaling_server':
                return this.handleSignalingServer(config.config || {}, context);
            default:
                throw new Error(`Unknown network builtin: ${builtin}`);
        }
    }
    async handleHttpGet(config, context) {
        return this.handleHttpRequest({ ...config, method: 'GET' }, context);
    }
    async handleHttpPost(config, context) {
        const params = { ...config, method: 'POST' };
        if (config.json) {
            params.headers = { ...params.headers, 'Content-Type': 'application/json' };
            params.body = JSON.stringify(config.json);
        }
        return this.handleHttpRequest(params, context);
    }
    async handleHttpRequest(config, context) {
        // Interpolate URL
        const url = this.interpolate(config.url, context);
        // Security Validation
        this.security.validateUrl(url);
        const method = config.method || 'GET';
        const headers = this.interpolateHeaders(config.headers || {}, context);
        let body = config.body;
        if (typeof body === 'string') {
            body = this.interpolate(body, context);
        }
        else if (typeof body === 'object' && body !== null) {
            body = JSON.stringify(body);
        }
        // Add Query Params
        const fetchUrl = new URL(url);
        if (config.query_params) {
            for (const [key, value] of Object.entries(config.query_params)) {
                fetchUrl.searchParams.append(key, this.interpolate(String(value), context));
            }
        }
        return this.httpClient.request(fetchUrl.toString(), method, headers, body, {
            retry: config.retry,
            cache: config.cache,
            timeout: typeof config.timeout === 'number' ? config.timeout : config.timeout?.total,
            responseType: config.response_type
        });
    }
    async handleLoadUrl(config, context) {
        const url = this.interpolate(config.url, context);
        this.security.validateUrl(url);
        try {
            const res = await fetch(url);
            const text = await res.text();
            return {
                url,
                content: text,
                status: res.status,
                headers: Object.fromEntries(res.headers.entries())
            };
        }
        catch (e) {
            return { success: false, error: String(e) };
        }
    }
    async handleMCardSend(config, context) {
        if (!this.collection) {
            throw new Error('MCard Send requires a CardCollection.');
        }
        const hash = this.interpolate(config.hash, context);
        const url = this.interpolate(config.url, context);
        const card = await this.collection.get(hash);
        if (!card) {
            return { success: false, error: `MCard not found: ${hash}` };
        }
        const payload = MCardSerialization.serialize(card);
        return this.handleHttpPost({
            url,
            json: payload,
            headers: config.headers
        }, context);
    }
    async handleListenHttp(config, context) {
        const port = Number(this.interpolate(String(config.port || 3000), context));
        const path = this.interpolate(config.path || '/mcard', context);
        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                if (req.method === 'POST' && req.url === path) {
                    const bodyChunks = [];
                    req.on('data', chunk => bodyChunks.push(chunk));
                    req.on('end', async () => {
                        try {
                            const body = Buffer.concat(bodyChunks).toString();
                            const json = JSON.parse(body);
                            const card = await MCardSerialization.deserialize(json);
                            if (json.hash) {
                                MCardSerialization.verifyHash(card, json.hash);
                            }
                            if (this.collection) {
                                await this.collection.add(card);
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, hash: card.hash }));
                        }
                        catch (e) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: String(e) }));
                        }
                    });
                }
                else {
                    res.writeHead(404);
                    res.end();
                }
            });
            server.listen(port, () => {
                console.log(`[Network] Listening on port ${port} at ${path}`);
                resolve({
                    success: true,
                    message: `Server started on port ${port}`
                });
            });
            server.on('error', (err) => {
                reject(err);
            });
        });
    }
    async handleMCardSync(config, context) {
        if (!this.collection) {
            throw new Error('MCard Sync requires a CardCollection.');
        }
        const mode = this.interpolate(config.mode || 'pull', context);
        const urlParams = this.interpolate(config.url, context);
        const url = urlParams.endsWith('/') ? urlParams.slice(0, -1) : urlParams;
        // 1. Get Local Manifest
        const localCards = await this.collection.getAllMCardsRaw();
        const localHashes = new Set(localCards.map(c => c.hash));
        // 2. Get Remote Manifest
        const manifestRes = await this.handleHttpRequest({
            url: `${url}/manifest`,
            method: 'GET'
        }, context);
        if (!manifestRes.success) {
            throw new Error(`Failed to fetch remote manifest: ${manifestRes.error?.message}`);
        }
        const remoteHashes = new Set(manifestRes.body);
        const stats = {
            mode,
            local_total: localHashes.size,
            remote_total: remoteHashes.size,
            synced: 0,
            pushed: 0,
            pulled: 0
        };
        // Push Helper
        const pushCards = async () => {
            const toSend = [];
            for (const card of localCards) {
                if (!remoteHashes.has(card.hash)) {
                    toSend.push(card);
                }
            }
            if (toSend.length > 0) {
                const payload = {
                    cards: toSend.map(card => MCardSerialization.serialize(card))
                };
                const pushRes = await this.handleHttpPost({
                    url: `${url}/batch`,
                    json: payload,
                    headers: config.headers
                }, context);
                if (!pushRes.success) {
                    throw new Error(`Failed to push batch: ${pushRes.error?.message}`);
                }
                return toSend.length;
            }
            return 0;
        };
        // Pull Helper
        const pullCards = async () => {
            const neededHashes = [];
            for (const h of remoteHashes) {
                if (!localHashes.has(h)) {
                    neededHashes.push(h);
                }
            }
            if (neededHashes.length > 0) {
                const fetchRes = await this.handleHttpPost({
                    url: `${url}/get`,
                    json: { hashes: neededHashes },
                    headers: config.headers
                }, context);
                if (!fetchRes.success) {
                    throw new Error(`Failed to pull batch: ${fetchRes.error?.message}`);
                }
                const receivedCards = fetchRes.body.cards;
                for (const json of receivedCards) {
                    const card = await MCardSerialization.deserialize(json);
                    await this.collection.add(card);
                }
                return receivedCards.length;
            }
            return 0;
        };
        if (mode === 'push') {
            stats.pushed = await pushCards();
            stats.synced = stats.pushed;
        }
        else if (mode === 'pull') {
            stats.pulled = await pullCards();
            stats.synced = stats.pulled;
        }
        else if (mode === 'both' || mode === 'bidirectional') {
            const pushed = await pushCards();
            const pulled = await pullCards();
            stats.synced = pushed + pulled;
            stats.pushed = pushed;
            stats.pulled = pulled;
        }
        return { success: true, stats };
    }
    // ============ WebRTC Implementation ============
    getPeerConnectionClass() {
        if (typeof RTCPeerConnection !== 'undefined') {
            return RTCPeerConnection;
        }
        else if (typeof global !== 'undefined' && global.RTCPeerConnection) {
            return global.RTCPeerConnection;
        }
        return null;
    }
    async handleWebRTCConnect(config, context) {
        const PeerConnection = this.getPeerConnectionClass();
        if (!PeerConnection) {
            return {
                success: false,
                error: 'WebRTC not supported in this environment (RTCPeerConnection not found).'
            };
        }
        const signalingUrl = this.interpolate(config.signaling_url, context);
        const targetPeerId = this.interpolate(config.target_peer_id, context);
        const myPeerId = config.peer_id ? this.interpolate(config.peer_id, context) : `peer_${Date.now()}`;
        const channelLabel = config.channel_label || 'mcard-sync';
        // MOCK MODE for Testing
        if (signalingUrl === 'mock://p2p') {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        peer_id: myPeerId,
                        channel: channelLabel,
                        status: 'connected',
                        mock: true
                    });
                }, 100);
            });
        }
        console.log(`[WebRTC] Connecting to ${targetPeerId} via ${signalingUrl} as ${myPeerId}`);
        const pc = new PeerConnection({
            iceServers: config.ice_servers || [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        const dc = pc.createDataChannel(channelLabel);
        const connectionPromise = new Promise((resolve, reject) => {
            const timeoutMs = config.timeout || 30000;
            const timeoutId = setTimeout(() => {
                pc.close();
                reject(new Error('WebRTC connection timed out'));
            }, timeoutMs);
            dc.onopen = () => {
                clearTimeout(timeoutId);
                console.log(`[WebRTC] Data channel '${channelLabel}' open`);
                if (config.message) {
                    const msg = typeof config.message === 'string'
                        ? this.interpolate(config.message, context)
                        : JSON.stringify(config.message);
                    dc.send(msg);
                }
                resolve({
                    success: true,
                    peer_id: myPeerId,
                    channel: channelLabel,
                    status: 'connected'
                });
            };
            dc.onerror = (err) => {
                clearTimeout(timeoutId);
                console.error('[WebRTC] Data channel error:', err);
                reject(err);
            };
            this._setupP2PProtocol(dc);
        });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('[WebRTC] Local Offer created. SDP ready to send.');
        if (config.await_response !== false) {
            return connectionPromise;
        }
        return {
            success: true,
            status: 'initiating',
            peer_id: myPeerId
        };
    }
    _setupP2PProtocol(dc) {
        dc.onmessage = async (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'sync_manifest') {
                    if (!this.collection)
                        return;
                    const remoteHashes = new Set(msg.hashes);
                    const localCards = await this.collection.getAllMCardsRaw();
                    const localHashes = new Set(localCards.map(c => c.hash));
                    const needed = [...remoteHashes].filter((h) => !localHashes.has(h));
                    const toPush = localCards.filter(c => !remoteHashes.has(c.hash));
                    if (needed.length > 0) {
                        dc.send(JSON.stringify({ type: 'sync_request', hashes: needed }));
                    }
                    if (toPush.length > 0) {
                        const payload = {
                            type: 'batch_push',
                            cards: toPush.map(c => MCardSerialization.serialize(c))
                        };
                        dc.send(JSON.stringify(payload));
                    }
                }
                else if (msg.type === 'sync_request') {
                    if (!this.collection)
                        return;
                    const requested = msg.hashes || [];
                    const foundCards = [];
                    for (const h of requested) {
                        const c = await this.collection.get(h);
                        if (c)
                            foundCards.push(MCardSerialization.serialize(c));
                    }
                    if (foundCards.length > 0) {
                        dc.send(JSON.stringify({ type: 'batch_push', cards: foundCards }));
                    }
                }
                else if (msg.type === 'batch_push') {
                    if (!this.collection)
                        return;
                    const cards = msg.cards || [];
                    let added = 0;
                    for (const cJson of cards) {
                        const card = await MCardSerialization.deserialize(cJson);
                        await this.collection.add(card);
                        added++;
                    }
                    console.log(`[WebRTC] Synced ${added} cards from peer.`);
                }
            }
            catch (e) {
                console.error('[WebRTC] Protocol error:', e);
            }
        };
    }
    async handleWebRTCListen(config, context) {
        const PeerConnection = this.getPeerConnectionClass();
        if (!PeerConnection) {
            return {
                success: false,
                error: 'WebRTC not supported in this environment (RTCPeerConnection not found).'
            };
        }
        const signalingUrl = this.interpolate(config.signaling_url, context);
        const myPeerId = config.peer_id ? this.interpolate(config.peer_id, context) : `listener_${Date.now()}`;
        if (signalingUrl === 'mock://p2p') {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        peer_id: myPeerId,
                        status: 'listening',
                        mock: true
                    });
                }, 100);
            });
        }
        console.log(`[WebRTC] Listening on ${signalingUrl} as ${myPeerId}`);
        return {
            success: true,
            status: 'listening',
            peer_id: myPeerId,
            note: 'Signaling loop implementation pending specific server protocol.'
        };
    }
    async handleListenSync(config, context) {
        if (!this.collection) {
            throw new Error('Listen Sync requires a CardCollection.');
        }
        const port = Number(this.interpolate(String(config.port || 3000), context));
        const basePath = this.interpolate(config.base_path || '/sync', context);
        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                const url = req.url || '';
                const readBody = async () => {
                    return new Promise((res, rej) => {
                        const chunks = [];
                        req.on('data', c => chunks.push(c));
                        req.on('end', () => {
                            try {
                                const str = Buffer.concat(chunks).toString();
                                res(JSON.parse(str || '{}'));
                            }
                            catch (e) {
                                rej(e);
                            }
                        });
                        req.on('error', rej);
                    });
                };
                try {
                    if (req.method === 'GET' && url === `${basePath}/manifest`) {
                        const all = await this.collection.getAllMCardsRaw();
                        const hashes = all.map(c => c.hash);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(hashes));
                        return;
                    }
                    if (req.method === 'POST' && url === `${basePath}/batch`) {
                        const json = await readBody();
                        const cards = json.cards || [];
                        let added = 0;
                        for (const cJson of cards) {
                            const card = await MCardSerialization.deserialize(cJson);
                            await this.collection.add(card);
                            added++;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, added }));
                        return;
                    }
                    if (req.method === 'POST' && url === `${basePath}/get`) {
                        const json = await readBody();
                        const requestedHashes = json.hashes || [];
                        const foundCards = [];
                        for (const h of requestedHashes) {
                            const card = await this.collection.get(h);
                            if (card) {
                                foundCards.push(MCardSerialization.serialize(card));
                            }
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, cards: foundCards }));
                        return;
                    }
                    res.writeHead(404);
                    res.end();
                }
                catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                }
            });
            server.listen(port, () => {
                console.log(`[Network] Sync listening on port ${port} at ${basePath}`);
                resolve({
                    success: true,
                    message: `Sync Server started on port ${port}`,
                    port,
                    basePath
                });
            });
            server.on('error', (err) => {
                reject(err);
            });
        });
    }
    interpolate(text, context) {
        if (!text || typeof text !== 'string')
            return text;
        return text.replace(/\$\{([^}]+)\}/g, (_, path) => {
            const keys = path.split('.');
            let val = context;
            for (const key of keys) {
                if (val && typeof val === 'object' && key in val) {
                    val = val[key];
                }
                else {
                    return '';
                }
            }
            return String(val);
        });
    }
    interpolateHeaders(headers, context) {
        const result = {};
        for (const [key, val] of Object.entries(headers)) {
            result[key] = this.interpolate(val, context);
        }
        return result;
    }
    async handleSessionRecord(config, context) {
        if (!this.collection) {
            throw new Error('Session Record requires a CardCollection.');
        }
        const sessionId = this.interpolate(config.sessionId, context);
        let operation = config.operation || 'add';
        if (typeof operation === 'string' && operation.includes('${')) {
            operation = this.interpolate(operation, context);
        }
        if (operation === 'init') {
            if (this.sessions.has(sessionId)) {
                return { success: true, message: 'Session already exists', sessionId };
            }
            let bufferSize = config.maxBufferSize || 5;
            if (typeof config.maxBufferSize === 'string') {
                bufferSize = parseInt(this.interpolate(config.maxBufferSize, context), 10);
            }
            let initialHead = config.initialHeadHash || null;
            if (typeof config.initialHeadHash === 'string') {
                initialHead = this.interpolate(config.initialHeadHash, context);
                if (initialHead === 'null' || initialHead === 'undefined' || initialHead === '')
                    initialHead = null;
            }
            const session = new P2PChatSession(this.collection, sessionId, bufferSize, initialHead);
            this.sessions.set(sessionId, session);
            return { success: true, message: 'Session initialized', sessionId, bufferSize, initialHead };
        }
        if (operation === 'batch') {
            const results = [];
            let subOps = config.operations;
            if (!Array.isArray(subOps)) {
                const ctx = context;
                subOps = ctx?.params?.operations || ctx?.operations || [];
            }
            for (const op of subOps) {
                const subConfig = { ...config, ...op };
                results.push(await this.handleSessionRecord(subConfig, context));
            }
            return {
                success: true,
                operation: 'batch',
                results
            };
        }
        if (operation === 'summarize') {
            let session = this.sessions.get(sessionId);
            if (!session) {
                session = new P2PChatSession(this.collection, sessionId, 5, null);
                this.sessions.set(sessionId, session);
            }
            const keepOriginals = config.keepOriginals === true;
            const summaryHash = await session.summarize(keepOriginals);
            return {
                success: true,
                operation: 'summarize',
                summary_hash: summaryHash,
                sessionId
            };
        }
        const session = this.sessions.get(sessionId);
        if (!session) {
            const newSession = new P2PChatSession(this.collection, sessionId, 5, null);
            this.sessions.set(sessionId, newSession);
        }
        const validSession = this.sessions.get(sessionId);
        if (operation === 'add') {
            const sender = this.interpolate(config.sender || 'unknown', context);
            const content = this.interpolate(config.content || '', context);
            const hash = await validSession.addMessage(sender, content);
            const head = validSession.getHeadHash();
            return {
                success: true,
                checkpoint_hash: hash,
                head_hash: head,
                sessionId
            };
        }
        else if (operation === 'flush') {
            const hash = await validSession.checkpoint();
            return {
                success: true,
                checkpoint_hash: hash,
                sessionId
            };
        }
        return { success: false, error: `Unknown operation ${operation}` };
    }
    async handleMCardRead(config, context) {
        if (!this.collection) {
            throw new Error('MCard Read requires a CardCollection.');
        }
        const hash = this.interpolate(config.hash, context);
        if (!hash)
            throw new Error('Hash is required for mcard_read');
        const card = await this.collection.get(hash);
        if (!card)
            return { success: false, error: 'MCard not found', hash };
        let content = card.getContentAsText();
        if (config.parse_json !== false) {
            try {
                content = JSON.parse(content);
            }
            catch (e) {
            }
        }
        return {
            success: true,
            hash,
            content,
            g_time: card.g_time
        };
    }
    async handleOrchestrator(config, context) {
        const steps = config.steps || [];
        const state = {};
        let allSuccess = true;
        console.log(`[NetworkRuntime] Starting Orchestration with ${steps.length} steps.`);
        for (const step of steps) {
            const stepName = step.name || step.action;
            console.log(`[Orchestrator] Step: ${stepName}`);
            try {
                if (step.action === 'start_process') {
                    const cmd = this.interpolate(step.command, context);
                    const { spawn } = await import('child_process');
                    const parts = cmd.split(' ');
                    const env = { ...process.env, ...(step.env || {}) };
                    const proc = spawn(parts[0], parts.slice(1), {
                        detached: true,
                        stdio: 'inherit',
                        cwd: process.cwd(),
                        env: env
                    });
                    proc.unref();
                    if (step.id_key) {
                        state[step.id_key] = proc.pid;
                        console.log(`[Orchestrator] Process started (PID: ${proc.pid}) stored in '${step.id_key}'`);
                    }
                    else {
                        console.log(`[Orchestrator] Process started (PID: ${proc.pid})`);
                    }
                    if (step.wait_after) {
                        await new Promise(r => setTimeout(r, step.wait_after));
                    }
                }
                else if (step.action === 'run_clm') {
                    if (!context.runCLM)
                        throw new Error("runCLM capability not available in context");
                    const file = step.file;
                    const input = step.input || {};
                    console.log(`[Orchestrator] Running CLM: ${file}`);
                    const res = await context.runCLM(file, input);
                    if (!res.success) {
                        console.error(`[Orchestrator] CLM Failed: ${file}`, res.error);
                        if (!step.continue_on_error) {
                            allSuccess = false;
                            break;
                        }
                    }
                    else {
                        console.log(`[Orchestrator] CLM Passed: ${file}`);
                    }
                }
                else if (step.action === 'run_clm_background') {
                    const file = step.file;
                    const filter = file.replace(/\.(yaml|yml|clm)$/i, '');
                    const cmd = `npx tsx examples/run-all-clms.ts ${filter}`;
                    const { spawn } = await import('child_process');
                    const parts = cmd.split(' ');
                    const env = { ...process.env, ...(step.env || {}) };
                    const proc = spawn(parts[0], parts.slice(1), {
                        detached: true,
                        stdio: 'inherit',
                        cwd: process.cwd(),
                        env: env
                    });
                    proc.unref();
                    if (step.id_key) {
                        state[step.id_key] = proc.pid;
                        console.log(`[Orchestrator] Background CLM started (PID: ${proc.pid}) stored in '${step.id_key}'`);
                    }
                    if (step.wait_after) {
                        await new Promise(r => setTimeout(r, step.wait_after));
                    }
                }
                else if (step.action === 'stop_process') {
                    const key = step.pid_key;
                    const pid = state[key];
                    if (pid) {
                        try {
                            context.process.kill(pid);
                            console.log(`[Orchestrator] Stopped process ${pid} (${key})`);
                        }
                        catch (e) {
                            console.warn(`[Orchestrator] Failed to stop process ${pid}: ${e}`);
                        }
                    }
                    else {
                        console.warn(`[Orchestrator] No PID found for key '${key}'`);
                    }
                }
                else if (step.action === 'sleep') {
                    const ms = step.ms || 1000;
                    await new Promise(r => setTimeout(r, ms));
                }
                else if (step.action === 'start_signaling_server') {
                    const port = step.port || 3000;
                    console.log(`[Orchestrator] Starting builtin signaling server on port ${port}...`);
                    const result = await this.handleSignalingServer({ port, background: true }, context);
                    if (result.success) {
                        console.log(`[Orchestrator] Signaling server started on port ${result.port}`);
                        if (step.id_key) {
                            state[step.id_key] = {
                                type: 'signaling_server',
                                port: result.port,
                                server: this._signalingServer
                            };
                        }
                    }
                    else {
                        console.error(`[Orchestrator] Failed to start signaling server: ${result.error}`);
                        if (!step.continue_on_error) {
                            allSuccess = false;
                            break;
                        }
                    }
                    if (step.wait_after) {
                        await new Promise(r => setTimeout(r, step.wait_after));
                    }
                }
                else if (step.action === 'stop_signaling_server') {
                    const key = step.id_key;
                    const serverInfo = state[key];
                    if (serverInfo && serverInfo.server) {
                        try {
                            serverInfo.server.close();
                            console.log(`[Orchestrator] Signaling server stopped (${key})`);
                        }
                        catch (e) {
                            console.warn(`[Orchestrator] Failed to stop signaling server: ${e}`);
                        }
                    }
                    else if (this._signalingServer) {
                        try {
                            this._signalingServer.close();
                            console.log(`[Orchestrator] Signaling server stopped`);
                        }
                        catch (e) {
                            console.warn(`[Orchestrator] Failed to stop signaling server: ${e}`);
                        }
                    }
                    else {
                        console.warn(`[Orchestrator] No signaling server found to stop`);
                    }
                }
            }
            catch (e) {
                console.error(`[Orchestrator] Step '${stepName}' caused error:`, e);
                allSuccess = false;
                if (!step.continue_on_error)
                    break;
            }
        }
        return {
            success: allSuccess,
            state
        };
    }
    async handleRunCommand(config, context) {
        const command = this.interpolate(config.command, context);
        console.log(`[NetworkRuntime] Executing command: ${command}`);
        const { exec, spawn } = await import('child_process');
        if (config.background) {
            const parts = command.split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);
            const subprocess = spawn(cmd, args, {
                detached: true,
                stdio: 'ignore'
            });
            subprocess.unref();
            console.log(`[NetworkRuntime] Started background process with PID: ${subprocess.pid}`);
            return {
                success: true,
                pid: subprocess.pid,
                message: "Background process started"
            };
        }
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[NetworkRuntime] Command failed: ${error.message}`);
                    return resolve({
                        success: false,
                        error: error.message,
                        stderr
                    });
                }
                console.log(`[NetworkRuntime] Command output:\n${stdout}`);
                resolve({
                    success: true,
                    stdout,
                    stderr
                });
            });
        });
    }
    async handleSignalingServer(config, _context) {
        const port = config.port || 3000;
        console.log(`[NetworkRuntime] Starting signaling server on port ${port}...`);
        const result = await createSignalingServer({
            port,
            autoFindPort: true,
            maxPortTries: 10
        });
        if (result.success && result.server) {
            this._signalingServer = result.server;
        }
        return result;
    }
}
//# sourceMappingURL=NetworkRuntime.js.map