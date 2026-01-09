// @pkc/p2p - Main entry point
// Re-export from index.js which contains the module API
import P2PModule from './index.js';

export default P2PModule;
export { P2PModule };

// Also export individual components for advanced usage
export { default as Connection } from './connection.js';
export { default as Discovery } from './discovery.js';
export { default as QRCode } from './qr-code.js';
export { resolveP2PConfig } from './config.js';
