# Chapter 07: Network IO

This chapter demonstrates Network IO and MCard Synchronization capabilities.

## Examples

### 1. Basic HTTP Fetch
Fetch data from a public API.
```bash
cd mcard-js
npm run demo:clm -- ../chapters/chapter_07_network/http_fetch.yaml
```

### 2. MCard Synchronization
To demonstrate synchronization, you need two terminal windows. All commands assume you are in the `mcard-js` directory.

**Terminal 1 (Server):**
Start the synchronization server (listens on port 3001).
```bash
cd mcard-js
npm run demo:clm -- ../chapters/chapter_07_network/sync_server.yaml
```

**Terminal 2 (Client):**
Run the client to pull/push data (connects to port 3001).
```bash
cd mcard-js
npm run demo:clm -- ../chapters/chapter_07_network/sync_client.yaml
```

### 3. MCard Transfer
**Terminal 1 (Receiver):**
Start the receiver (listens on port 3002).
```bash
cd mcard-js
npm run demo:clm -- ../chapters/chapter_07_network/mcard_receive.yaml
```

**Terminal 2 (Sender):**
Send a specific MCard by hash. Note: The hash must exist in your local collection.
```bash
cd mcard-js
npm run demo:clm -- ../chapters/chapter_07_network/mcard_send.yaml --input '{"hash": "<YOUR_HASH>"}'
```
