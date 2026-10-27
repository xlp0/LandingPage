export const PKC = {
  registry: new Map(),
  failures: [],
  startedOrder: [],
  activeModules: {},
  capabilities: {
    websocket: typeof window !== 'undefined' && 'WebSocket' in window,
    webrtc: typeof window !== 'undefined' && 'RTCPeerConnection' in window,
    storage: {
      idb: typeof window !== 'undefined' && !!window.indexedDB,
      opfs: typeof navigator !== 'undefined' && !!navigator.storage && !!navigator.storage.getDirectory
    }
  },
  ctx: {
    root: typeof document !== 'undefined' && document.baseURI ? document.baseURI : '/',
    log: (...args) => console.log('[PKC]', ...args)
  },
  register(def) {
    if (!def || !def.id) throw new Error('Module definition requires an id');
    this.registry.set(def.id, def);
  },

  async init(config = {}, options = {}) {
    if (typeof config === 'string') {
      return this.load(config, options);
    }

    await this.stop();
    this.failures = [];

    if (!options.skipAppConfig) {
      await this._loadAppConfig(options);
    }

    if (config && config.modules && Array.isArray(config.modules)) {
      return this._loadModules(config.modules, options);
    }

    return this.load('/modules.json', { ...options, skipAppConfig: true });
  },

  async _loadAppConfig(options = {}) {
    const fetcher = options.fetcher || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetcher) {
      this.ctx.appConfig = {};
      return;
    }
    try {
      const appRes = await fetcher(`/app-config.json?t=${Date.now()}`, { cache: 'no-cache' });
      if (appRes && appRes.ok) {
        this.ctx.appConfig = await appRes.json();
      } else {
        this.ctx.appConfig = {};
      }
    } catch {
      this.ctx.appConfig = {};
    }
  },

  async load(manifestUrl = '/modules.json', options = {}) {
    await this.stop();
    this.failures = [];

    if (!options.skipAppConfig) {
      await this._loadAppConfig(options);
    }

    const fetcher = options.fetcher || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetcher) {
      throw new Error('Failed to load manifest: fetch unavailable');
    }

    this.ctx.log('Loading manifest', manifestUrl);
    const res = await fetcher(`${manifestUrl}?t=${Date.now()}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
    const manifest = await res.json();
    const modules = (manifest && manifest.modules) || [];

    return this._loadModules(modules, options);
  },

  _recordFailure(descriptor, phase, error, options = {}) {
    const failure = {
      id: descriptor?.id || 'unknown',
      owner: descriptor?.owner || 'unassigned',
      phase,
      required: descriptor?.required === true,
      message: error instanceof Error ? error.message : String(error)
    };
    this.failures.push(failure);
    const handler = options.onModuleError || this.ctx.onModuleError;
    if (typeof handler === 'function') {
      try {
        handler(failure);
      } catch {}
    }
    return failure;
  },

  async _loadModules(modules, options = {}) {
    const loader = options.loader || ((entry) => import(entry));
    const loadedModules = {};

    for (const m of modules) {
      if (!m || m.enabled === false) continue;
      if (m.when && typeof m.when === 'string') {
        const ok = this._checkCondition(m.when);
        if (!ok) continue;
      }

      if (Array.isArray(m.dependsOn) && m.dependsOn.length > 0) {
        const missingDep = m.dependsOn.find((depId) => !loadedModules[depId]);
        if (missingDep) {
          const depErr = new Error(`Missing started dependency "${missingDep}" for module "${m.id}"`);
          const failure = this._recordFailure(m, 'dependency', depErr, options);
          if (m.required === true) {
            throw new Error(
              `[PKC] Required module "${failure.id}" (owner: ${failure.owner}) failed during dependency: ${failure.message}`
            );
          }
          continue;
        }
      }

      if (!m.entry) {
        if (m.required === true) {
          const entryErr = new Error(`Module "${m.id}" is missing an entry path`);
          const failure = this._recordFailure(m, 'entry', entryErr, options);
          throw new Error(
            `[PKC] Required module "${failure.id}" (owner: ${failure.owner}) failed during entry: ${failure.message}`
          );
        }
        this.ctx.log('Skipping module without entry', m);
        continue;
      }

      let phase = 'import';
      try {
        const mod = await loader(m.entry);
        const api = mod && (mod.default || mod);
        phase = 'contract';
        if (!api || typeof api.init !== 'function' || typeof api.start !== 'function') {
          throw new Error(`Module "${m.id}" is missing required init/start lifecycle functions`);
        }

        phase = 'init';
        await api.init({
          pkc: this,
          config: m.config || {},
          appConfig: this.ctx.appConfig || {},
          capabilities: this.capabilities
        });

        if (typeof document !== 'undefined' && (m.id === 'net-gateway' || m.id === 'p2p-libp2p')) {
          if (document.readyState === 'loading') {
            await new Promise((resolve) => {
              document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
          }
        }

        phase = 'start';
        await api.start();
        this.ctx.log(`Started module: ${m.id}`);

        loadedModules[m.id] = api;
        this.activeModules[m.id] = api;
        this.startedOrder.push({
          id: m.id,
          owner: m.owner || 'unassigned',
          api
        });
      } catch (err) {
        const failure = this._recordFailure(m, phase, err, options);
        if (m.required === true) {
          throw new Error(
            `[PKC] Required module "${failure.id}" (owner: ${failure.owner}) failed during ${phase}: ${failure.message}`
          );
        }
        console.warn(`[PKC] Optional module degraded ${m.id} (owner: ${failure.owner})`, err);
      }
    }

    return loadedModules;
  },

  async stop(options = {}) {
    const reverseOrder = [...this.startedOrder].reverse();
    this.startedOrder = [];
    this.activeModules = {};
    const stoppedIds = [];

    for (const item of reverseOrder) {
      if (typeof item.api?.stop === 'function') {
        try {
          await item.api.stop();
          stoppedIds.push(item.id);
        } catch (err) {
          this._recordFailure({ id: item.id, owner: item.owner, required: false }, 'stop', err, options);
        }
      }
    }

    return stoppedIds;
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
