// PKC Core - lightweight module registry and capability detection
export const PKC = {
  registry: new Map(),
  capabilities: {
    websocket: typeof window !== 'undefined' && 'WebSocket' in window,
    webrtc: typeof window !== 'undefined' && 'RTCPeerConnection' in window,
    storage: {
      idb: typeof window !== 'undefined' && !!window.indexedDB,
      opfs: typeof navigator !== 'undefined' && !!navigator.storage && !!navigator.storage.getDirectory
    }
  },
  ctx: {
    root: document.baseURI || '/',
    log: (...args) => console.log('[PKC]', ...args)
  },
  register(def) {
    if (!def || !def.id) throw new Error('Module definition requires an id');
    this.registry.set(def.id, def);
  },
  async load(manifestUrl = '/modules.json') {
    // Load app-level configuration once
    try {
      const appRes = await fetch('/app-config.json', { cache: 'no-cache' });
      if (appRes.ok) {
        this.ctx.appConfig = await appRes.json();
      } else {
        this.ctx.appConfig = {};
      }
    } catch {
      this.ctx.appConfig = {};
    }

    this.ctx.log('Loading manifest', manifestUrl);
    const res = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
    const manifest = await res.json();
    const modules = (manifest && manifest.modules) || [];

    for (const m of modules) {
      if (m.enabled === false) continue;
      if (m.when && typeof m.when === 'string') {
        // simple feature checks by string key
        const ok = this._checkCondition(m.when);
        if (!ok) continue;
      }
      if (!m.entry) {
        this.ctx.log('Skipping module without entry', m);
        continue;
      }
      try {
        console.log(`[PKC] Loading module: ${m.id}`);
        const mod = await import(m.entry);
        const api = mod && (mod.default || mod);
        console.log(`[PKC] Module ${m.id} imported, api:`, !!api);
        if (!api || typeof api.init !== 'function' || typeof api.start !== 'function') {
          this.ctx.log('Module missing required lifecycle (init/start):', m.id);
          continue;
        }
        console.log(`[PKC] Initializing module: ${m.id}`);
        await api.init({ pkc: this, config: m.config || {}, appConfig: this.ctx.appConfig || {}, capabilities: this.capabilities });
        console.log(`[PKC] Starting module: ${m.id}`);
        
        // Wait for DOM to be ready before starting modules that might access DOM
        if (m.id === 'net-gateway' || m.id === 'p2p-libp2p') {
          console.log(`[PKC] Waiting for DOM ready before starting ${m.id}`);
          await new Promise(resolve => {
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', resolve);
            } else {
              resolve();
            }
          });
          console.log(`[PKC] DOM ready, starting ${m.id}`);
        }
        
        await api.start();
        console.log(`[PKC] Module ${m.id} started successfully`);
        this.ctx.log(`Started module: ${m.id}`);
      } catch (e) {
        console.error(`[PKC] Failed to load module ${m.id}`, e);
      }
    }
  },
  _checkCondition(key) {
    switch (key) {
      case 'webrtc': return !!this.capabilities.webrtc;
      case 'websocket': return !!this.capabilities.websocket;
      case 'storage.idb': return !!this.capabilities.storage.idb;
      default: return true;
    }
  }
};
