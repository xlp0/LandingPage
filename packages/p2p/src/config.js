// PKC Module: p2p-serverless/config
// Purpose: Centralized configuration for P2P/WebRTC with app-level overrides

// Safe defaults (used only if app-config.json does not provide values)
const DefaultP2PConfig = {
  iceServers: [
    // { urls: 'stun:stun.l.google.com:19302' },
    // { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

/**
 * Load application-level P2P configuration from /app-config.json
 * Expected shape:
 * {
 *   "p2p": {
 *     "iceServers": [ { urls: "stun:..." }, { urls: "turn:...", username: "...", credential: "..." } ]
 *   }
 * }
 */
async function loadAppP2PConfig() {
  try {
    const resp = await fetch('/app-config.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const appCfg = await resp.json();
    return appCfg && appCfg.p2p ? appCfg.p2p : {};
  } catch (_e) {
    return {}; // tolerate missing file or malformed content
  }
}

/**
 * Resolve final P2P config with precedence: overrides > app-config > defaults
 */
export async function resolveP2PConfig(overrides = {}) {
  const appP2P = await loadAppP2PConfig();
  const merged = {
    ...DefaultP2PConfig,
    ...appP2P,
    ...overrides,
  };
  // Normalize iceServers to array
  if (!Array.isArray(merged.iceServers)) merged.iceServers = DefaultP2PConfig.iceServers;
  return merged;
}

export { DefaultP2PConfig };
