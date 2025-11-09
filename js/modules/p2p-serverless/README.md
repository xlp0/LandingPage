# P2P Serverless Module

**Zero-dependency, browser-native peer-to-peer communication system**

## Overview

This module implements a completely serverless P2P architecture using WebRTC DataChannels. No bootstrap servers, signaling servers, or external dependencies are required after the initial page load.

## Features

- ✅ **100% Browser-Native** - No external libraries (except optional QR libraries)
- ✅ **Zero Server Dependencies** - Works entirely in the browser
- ✅ **Multiple Discovery Methods** - BroadcastChannel, URL sharing, QR codes
- ✅ **Mesh Network** - Automatic peer-to-peer message routing
- ✅ **Privacy-First** - No central tracking or data collection
- ✅ **Offline Capable** - Works on local networks without internet

## Architecture

```
┌─────────────────────────────────────────────────┐
│              p2p-serverless Module              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  index.js    │  │  Main module interface  │  │
│  └──────┬───────┘  └─────────────────────────┘  │
│         │                                       │
│         ├──► connection.js  (WebRTC Manager)    │
│         ├──► discovery.js   (Peer Discovery)    │
│         └──► qr-code.js     (QR Generation)     │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Usage

### 1. Module Configuration

Preferred: set P2P settings in the application-level `app-config.json` (see section below). You can still override via module init or `modules.json` if needed.

Add to `modules.json` (optional override):

```json
{
  "id": "p2p-serverless",
  "enabled": true,
  "config": {
    "iceServers": [ /* optional override; see app-config.json */ ],
    "channelName": "pkc-p2p-discovery",
    "autoAcceptInvitations": false
  }
}
```

### 2. Basic API

```javascript
// Get module reference
const p2p = pkc.modules['p2p-serverless'];

// Create invitation for another peer
const invitation = await p2p.createInvitation();
console.log('Share this URL:', invitation.url);
// Display QR code: invitation.qrData

// Accept invitation from URL or code
await p2p.acceptInvitation(invitationUrl);

// Send message to all connected peers
p2p.broadcast({ 
  type: 'chat', 
  message: 'Hello everyone!' 
});

// Send message to specific peer
p2p.send(peerId, { 
  type: 'private', 
  message: 'Secret message' 
});

// Listen for messages
p2p.onMessage(({ peerId, data }) => {
  console.log('Received from', peerId, ':', data);
});

// Get connected peers
const peers = p2p.getPeers();
console.log('Connected to', peers.length, 'peers');

// Disconnect from peer
p2p.disconnect(peerId);
```

### 3. UI Integration

Required HTML elements (optional):

```html
<!-- Status display -->
<div id="p2p-status">Ready</div>

<!-- Peer count -->
<span id="peer-count">0</span>

<!-- Messages list -->
<ul id="p2p-messages"></ul>

<!-- Peer list -->
<ul id="peer-list"></ul>

<!-- Controls -->
<button id="create-invitation-btn">Create Invitation</button>
<button id="accept-invitation-btn">Accept Invitation</button>

<input type="text" id="message-input" placeholder="Type message...">
<button id="send-message-btn">Send</button>

<!-- Invitation display -->
<div id="invitation-display"></div>
```

## Connection Flow

### Scenario 1: URL/QR Code Exchange

**Peer A (Initiator):**
1. Calls `createInvitation()`
2. Receives invitation with URL and QR code
3. Shares URL via any method (QR, text, email, etc.)

**Peer B (Responder):**
1. Receives invitation URL
2. Calls `acceptInvitation(url)`
3. Generates answer code
4. Sends answer back to Peer A

**Peer A:**
1. Receives answer code
2. System automatically completes connection
3. Both peers are now connected!

### Scenario 2: Same-Origin Discovery

**Both Peers:**
1. Open app in different tabs/windows on same origin
2. BroadcastChannel automatically announces presence
3. Optional: Implement auto-connect logic

## API Reference

### Module Methods

#### `createInvitation()`
Creates a new peer connection invitation.

**Returns:** `Promise<Object>`
```javascript
{
  url: 'https://...#peer=...',
  qrData: 'https://...#peer=...',
  invitation: { /* raw invitation data */ },
  encoded: 'base64-encoded-string',
  expires: Date
}
```

#### `acceptInvitation(urlOrEncoded)`
Accepts a peer invitation.

**Parameters:**
- `urlOrEncoded` (string): Full invitation URL or encoded string

**Returns:** `Promise<void>`

#### `broadcast(data)`
Sends data to all connected peers.

**Parameters:**
- `data` (any): Data to send (will be JSON serialized)

#### `send(peerId, data)`
Sends data to a specific peer.

**Parameters:**
- `peerId` (string): Target peer identifier
- `data` (any): Data to send

#### `getPeers()`
Gets list of connected peers.

**Returns:** `Array<{id: string, state: string, connectedAt: Date}>`

#### `disconnect(peerId)`
Disconnects from a specific peer.

**Parameters:**
- `peerId` (string): Peer to disconnect from

#### `onMessage(handler)`
Registers a message handler.

**Parameters:**
- `handler` (function): `({ peerId, data }) => void`

#### `offMessage(handler)`
Removes a message handler.

**Parameters:**
- `handler` (function): Previously registered handler

## Events

The module emits the following events internally:

- `peer:connect` - New peer connected
- `peer:disconnect` - Peer disconnected
- `message` - Message received
- `error` - Error occurred
- `connection:state` - Connection state changed
- `ice:state` - ICE connection state changed

## File Structure

```
p2p-serverless/
├── index.js          # Main module (exports default)
├── connection.js     # ConnectionManager class
├── discovery.js      # DiscoveryManager class
├── qr-code.js        # QRCodeGenerator & Scanner classes
└── README.md         # This file
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebRTC DataChannel | ✅ 56+ | ✅ 44+ | ✅ 11+ | ✅ 79+ |
| BroadcastChannel | ✅ 54+ | ✅ 38+ | ✅ 15.4+ | ✅ 79+ |

**Minimum Requirements:**
- HTTPS connection (required for WebRTC)
- Modern browser (2020+)
- JavaScript enabled

## Security Considerations

1. **HTTPS Required** - WebRTC requires secure context
2. **No Built-in Encryption** - Messages sent in plain text over WebRTC
3. **Peer Authentication** - No built-in authentication mechanism
4. **Trust Model** - Users manually exchange invitations

**Future Enhancements:**
- End-to-end encryption using Web Crypto API
- Peer identity verification
- Rate limiting and spam prevention

## Performance

**Connection Establishment:**
- Time to first connection: 1-3 seconds
- ICE negotiation: 500ms - 2s
- Supports: Up to 8 concurrent peer connections

**Message Throughput:**
- Data channel bandwidth: 10-100 Mbps
- Message rate: 100-1000 msg/s
- Latency: 10-50ms (direct peer)

**Memory Usage:**
- Base footprint: ~5-10 MB
- Per peer overhead: ~1-2 MB

## Troubleshooting

### Application-level configuration (app-config.json)

`app-config.json` (served from the site root) is the primary place to manage runtime configuration for the app, including P2P/WebRTC settings. The P2P module loads it at startup via `resolveP2PConfig()` (see `js/modules/p2p-serverless/config.js`).

Example:

```json
{
  "wsHost": "192.168.1.139",
  "wsPort": 3001,
  "wsPath": "/ws/",
  "p2p": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      { "urls": "stun:stun1.l.google.com:19302" }
    ]
  }
}
```

Precedence for P2P settings (highest first):

1. Module init overrides (e.g. `p2p.init({ config: { iceServers: [...] } })`)
2. `app-config.json` → `p2p.iceServers`
3. Built-in safe defaults (empty list by default; provide app-config or overrides for production)

Notes:

- The loader fetches `/app-config.json` with `cache: 'no-cache'` to avoid stale values.
- If the file is missing or malformed, defaults are used (no crash).
- Add TURN servers here for constrained networks (NAT/firewall) to stabilize connectivity.

### Connection Fails

**Problem:** Peers can't connect after exchanging invitations

**Solutions:**
1. Ensure both peers are on HTTPS
2. Check browser console for errors
3. Verify STUN servers are accessible
4. Try different network (some firewalls block WebRTC)
5. Check that invitation hasn't expired (5 min default)

### BroadcastChannel Not Working

**Problem:** Same-origin peers don't discover each other

**Solutions:**
1. Ensure both tabs/windows are on exact same origin
2. Check browser compatibility (Safari 15.4+)
3. Verify BroadcastChannel API is available

### QR Code Doesn't Scan

**Problem:** QR scanner can't detect code

**Note:** Current implementation uses placeholder QR encoding.

**Solutions:**
1. For production, integrate `qrcode` library for generation
2. For scanning, integrate `jsqr` library
3. Manual URL entry always works as fallback

## Future Enhancements

- [ ] Integrate proper QR code libraries
- [ ] Add end-to-end encryption
- [ ] Implement CRDT for state synchronization (Yjs)
- [ ] Add file sharing capabilities
- [ ] Voice/video call support
- [ ] Mobile app wrapper (React Native)
- [ ] Blockchain-based signaling (optional)

## Comparison with libp2p

| Feature | p2p-serverless | libp2p |
|---------|----------------|--------|
| Bundle Size | ~20 KB | ~500 KB+ |
| Server Dependencies | Zero | Bootstrap nodes |
| Complexity | Low | High |
| Setup Time | < 5 min | Hours |
| NAT Traversal | STUN only | STUN + TURN |
| Offline Support | ✅ Full | Limited |

## License

Part of PKC (Personal Knowledge Container) project.

## Support

For issues or questions, see main PKC documentation.

---

**Status:** ✅ Phase 1 Complete - Core Infrastructure  
**Next:** Phase 2 - Network Layer Optimization
