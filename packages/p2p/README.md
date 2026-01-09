# @pkc/p2p

Serverless P2P networking using WebRTC with manual invitation exchange.

## Installation

```bash
npm install @pkc/core @pkc/p2p
```

## Features

- **Serverless Architecture**: No signaling or bootstrap servers required
- **WebRTC Direct Connections**: Peer-to-peer data channels
- **Manual Invitation Exchange**: URL/QR code based peer discovery
- **Zero Infrastructure**: Works completely offline between local peers
- **Privacy-First**: No central tracking or data collection

## Usage

```javascript
import { PKC } from '@pkc/core';
import P2PModule from '@pkc/p2p';

// Initialize PKC and P2P module
await PKC.init({
  modules: [
    {
      id: 'p2p',
      entry: () => P2PModule,
      enabled: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    }
  ]
});

const p2p = window.pkc.modules['p2p'];

// Create invitation for peer to join
const invitation = await p2p.createInvitation();
console.log('Share this URL:', invitation.url);

// Accept invitation (on another peer)
await p2p.acceptInvitation(invitationUrl);

// Send messages
p2p.broadcast({ type: 'chat', message: 'Hello!' });

// Listen for messages
p2p.onMessage(({ peerId, data }) => {
  console.log('From', peerId, ':', data);
});
```

## API

### `createInvitation()`

Create an invitation for another peer to connect.

**Returns:** Promise resolving to invitation object with `url` property

### `acceptInvitation(invitationUrl)`

Accept an invitation from another peer.

**Parameters:**
- `invitationUrl`: The invitation URL from the creator

**Returns:** Promise resolving when connection established

### `broadcast(data)`

Send data to all connected peers.

**Parameters:**
- `data`: Any JSON-serializable data

### `onMessage(callback)`

Listen for messages from peers.

**Parameters:**
- `callback`: Function called with `{ peerId, data }`

## License

ISC
