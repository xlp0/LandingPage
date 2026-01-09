# @pkc/mcard

MCard management system for browser environments with IndexedDB support.

## Installation

```bash
npm install @pkc/mcard
```

## Features

- **Content-Addressed Storage**: SHA-256 based content addressing
- **IndexedDB Backend**: Persistent browser storage via mcard-js
- **Friendly Handles**: Support for `@handle` names alongside hashes
- **Content Type Detection**: Automatic MIME type detection for various formats
- **Browser Optimized**: Built specifically for browser environments

## Usage

```javascript
import { MCardManager } from '@pkc/mcard';

// Create instance
const manager = new MCardManager();
await manager.init();

// Create a new MCard
const card = await manager.createCard({
  content: 'Hello, world!',
  contentType: 'text/plain',
  handle: '@welcome'
});

// Retrieve by handle or hash
const retrieved = await manager.getCard('@welcome');
console.log(retrieved.content);

// List all cards
const allCards = await manager.getAllCards();
```

## API

### `MCardManager`

Main class for managing MCards.

#### `init()`

Initialize the manager and IndexedDB connection.

#### `createCard(options)`

Create a new MCard.

**Parameters:**
- `options.content`: Card content (string or ArrayBuffer)
- `options.contentType`: MIME type
- `options.handle`: Optional friendly name (e.g., `@readme`)

**Returns:** Promise resolving to created MCard

#### `getCard(identifier)`

Retrieve a card by handle or content hash.

**Parameters:**
- `identifier`: Handle (e.g., `@welcome`) or content hash

**Returns:** Promise resolving to MCard or null

### `CardViewer`

UI component for displaying MCards.

### `BrowserContentTypeDetector`

Advanced content type detection for browser environments.

## License

ISC
