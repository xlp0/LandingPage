# pkc-server

Server utilities for PKC including WebSocket gateway and Express middleware.

## Installation

```bash
npm install pkc-server
```

## Features

- **WebSocket Server**: Ready-to-use WebSocket server with room support
- **Room Registry**: Manage connection rooms and message routing
- **Express Integration**: Middleware for Express applications
- **CORS Support**: Configured for cross-origin requests

## Usage

```javascript
import { createWSServer, RoomRegistry } from 'pkc-server';
import express from 'express';

const app = express();
const registry = new RoomRegistry();

// Create WebSocket server
const wss = createWSServer({
  port: 3001,
  path: '/ws/',
  registry
});

// Start HTTP server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## API

### `createWSServer(options)`

Create a WebSocket server.

**Parameters:**
- `options.port`: Port number
- `options.path`: WebSocket path
- `options.registry`: RoomRegistry instance

**Returns:** WebSocket server instance

### `RoomRegistry`

Manages connection rooms and message routing.

#### `createRoom(roomId)`

Create a new room.

#### `joinRoom(roomId, connection)`

Add a connection to a room.

#### `broadcast(roomId, message, exclude)`

Broadcast message to all connections in a room.

## License

ISC
