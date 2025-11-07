// PKC Module: p2p-libp2p (browser)
// Purpose: Optional P2P via libp2p (WebRTC). This is a scaffold that can be enabled via modules.json
// Notes:
// - Requires an ESM import URL for libp2p packages (e.g. esm.sh bundles)
// - Requires rendezvous/signaling or bootstrap peers for browser discovery
// - Starts only when capability `webrtc` is present

let node = null;
let heartbeat = null;
let peerCount = 0;
let peerCountInterval = null;

function setStatus(text) {
  const wsBadge = document.getElementById('ws-status');
  if (wsBadge) {
    const spanText = wsBadge.querySelector('span:last-child');
    if (spanText) spanText.textContent = text;
  }
  const p2pStatus = document.getElementById('p2p-status');
  if (p2pStatus) p2pStatus.textContent = text;
}

function appendMsg(text) {
  const list = document.getElementById('p2p-messages');
  if (list) {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  } else {
    console.log('[P2P]', text);
  }
}

function updatePeerCount(count) {
  peerCount = count;
  const el = document.getElementById('peer-count');
  if (el) {
    el.textContent = count;
  }
}

export default {
  id: 'p2p-libp2p',
  async init({ pkc, config, appConfig, capabilities }) {
    this.pkc = pkc;
    this.config = config || {};
    this.appConfig = appConfig || {};
    this.capabilities = capabilities || {};
    pkc.ctx.log('p2p-libp2p:init', { config: this.config, appConfig: this.appConfig, capabilities: this.capabilities });
  },
  async start() {
    const { pkc, config, capabilities } = this;
    if (!capabilities.webrtc) {
      pkc.ctx.log('p2p-libp2p: WebRTC not supported in this environment');
      return;
    }

    // Expect import URLs for libp2p bundle(s) from config to avoid hardcoding
    const importUrl = config.importUrl; // e.g. "https://esm.sh/libp2p@0.46.7?bundle"
    const webrtcImportUrl = config.webrtcImportUrl; // e.g. "https://esm.sh/@libp2p/webrtc@latest?bundle"
    const bootstrapImportUrl = config.bootstrapImportUrl; // e.g. "https://esm.sh/@libp2p/bootstrap@latest?bundle"

    if (!importUrl || !webrtcImportUrl) {
      pkc.ctx.log('p2p-libp2p: missing import URLs in config; skipping start');
      setStatus('P2P: config needed');
      return;
    }

    try {
      // Dynamic imports from provided URLs to keep this static-site friendly
      console.log('[PKC] Starting imports...');
      console.log('[PKC] importUrl:', importUrl);
      console.log('[PKC] webrtcImportUrl:', webrtcImportUrl);
      
      const libp2pMod = await import(importUrl);
      console.log('[PKC] libp2p import successful');
      
      let webrtcMod = null;
      try {
        webrtcMod = await import(webrtcImportUrl);
        console.log('[PKC] webrtc import successful');
      } catch (webrtcError) {
        console.error('[PKC] webrtc import failed:', webrtcError);
      }
      
      const bootstrapMod = bootstrapImportUrl ? await import(bootstrapImportUrl) : null;
      console.log('[PKC] bootstrap import result:', !!bootstrapMod);

      const { createLibp2p } = libp2pMod;
      // @libp2p/webrtc exports webRTC function directly
      const webRTC = webrtcMod && (webrtcMod.webRTC || webrtcMod.default);
      const bootstrap = bootstrapMod ? bootstrapMod.bootstrap : undefined;

      console.log('[PKC] After imports:');
      console.log('[PKC] libp2pMod:', !!libp2pMod, 'keys:', Object.keys(libp2pMod || {}));
      console.log('[PKC] webrtcMod:', !!webrtcMod, 'keys:', Object.keys(webrtcMod || {}));
      console.log('[PKC] webRTC extracted:', !!webRTC, typeof webRTC);
      console.log('[PKC] bootstrap:', !!bootstrap);

      // Debug export keys
      this.pkc?.ctx?.log?.('p2p-libp2p: imports', {
        libp2pKeys: Object.keys(libp2pMod || {}),
        webrtcKeys: Object.keys(webrtcMod || {}),
        bootstrapKeys: Object.keys(bootstrapMod || {}),
        webRTCType: typeof webRTC
      });

      const bootstrapList = (config.bootstrap && Array.isArray(config.bootstrap)) ? config.bootstrap : [];

      // Create proper logger that satisfies @libp2p requirements
      const logger = {
        forComponent: (name) => {
          const prefix = `[libp2p:${name}]`;
          return {
            trace: (...args) => console.debug(prefix, ...args),
            debug: (...args) => console.debug(prefix, ...args),
            info: (...args) => console.info(prefix, ...args),
            warn: (...args) => console.warn(prefix, ...args),
            error: (...args) => console.error(prefix, ...args)
          };
        },
        // Add these to satisfy full logger interface
        trace: (...args) => console.debug('[libp2p]', ...args),
        debug: (...args) => console.debug('[libp2p]', ...args),
        info: (...args) => console.info('[libp2p]', ...args),
        warn: (...args) => console.warn('[libp2p]', ...args),
        error: (...args) => console.error('[libp2p]', ...args)
      };

      // Setup transports and discovery
      const transports = [];
      const peerDiscovery = [];

      if (webRTC) {
        try {
          console.log('[PKC] Setting up @libp2p/webrtc transport...');
          // @libp2p/webrtc transport expects logger in init options
          const webRTCTransport = webRTC({
            logger: logger.forComponent('webrtc')
          });
          transports.push(webRTCTransport);
          console.log('[PKC] WebRTC transport configured with logger');
        } catch (e) {
          console.error('[PKC] WebRTC setup failed:', e);
          this.pkc?.ctx?.log?.('p2p-libp2p: WebRTC setup error', e);
          setStatus('P2P: WebRTC setup failed');
          return;
        }
      } else {
        console.log('[PKC] No WebRTC transport available');
        setStatus('P2P: No transport available');
        return;
      }

      if (bootstrap && bootstrapList.length) {
        try {
          console.log('[PKC] Adding bootstrap discovery...');
          peerDiscovery.push(bootstrap({ list: bootstrapList }));
        } catch (e) {
          console.warn('[PKC] Bootstrap setup failed:', e);
        }
      }

      // Guard: ensure we have at least one transport
      if (!transports.length) {
        throw new Error('No usable libp2p transport resolved');
      }

      console.log('[PKC] Creating libp2p node with config:', {
        transportsCount: transports.length,
        peerDiscoveryCount: peerDiscovery.length
      });

      // libp2p v0.46.7 basic configuration
      node = await createLibp2p({
        transports,
        peerDiscovery,
        connectionManager: {
          autoDial: true
        }
      });

      await node.start();
      pkc.ctx.log('p2p-libp2p: node started', { id: (node.peerId && node.peerId.toString && node.peerId.toString()) || 'unknown' });
      setStatus('P2P: started');
      appendMsg('started: ' + ((node.peerId && node.peerId.toString && node.peerId.toString()) || 'unknown'));

      // Track peer connections
      const updateConnectedPeers = async () => {
        if (node) {
          try {
            const peers = await node.getPeers();
            updatePeerCount(peers.length);
          } catch (e) {
            pkc.ctx.log('p2p-libp2p: error getting peers', e);
          }
        }
      };

      // Update peer count periodically and on events
      peerCountInterval = setInterval(updateConnectedPeers, 2000); // Update every 2 seconds
      
      node.addEventListener('peer:connect', (evt) => {
        pkc.ctx.log('p2p-libp2p: peer connected', evt.detail.toString());
        updateConnectedPeers();
      });

      node.addEventListener('peer:disconnect', (evt) => {
        pkc.ctx.log('p2p-libp2p: peer disconnected', evt.detail.toString());
        updateConnectedPeers();
      });

      // Initialize peer count
      updatePeerCount(0);

      // Simple presence topic (optional, requires pubsub in libp2p bundle)
      if (node.services && node.services.pubsub && config.presenceTopic) {
        const topic = config.presenceTopic;
        node.services.pubsub.subscribe(topic);
        node.services.pubsub.addEventListener('message', (evt) => {
          try {
            const data = evt.detail && evt.detail.detail && evt.detail.detail.data || evt.detail?.data;
            const dec = new TextDecoder();
            const txt = ArrayBuffer.isView(data) ? dec.decode(data) : (typeof data === 'string' ? data : JSON.stringify(evt.detail));
            pkc.ctx.log('p2p-libp2p: msg', txt);
            appendMsg('recv: ' + txt);
          } catch {
            pkc.ctx.log('p2p-libp2p: msg', evt.detail);
          }
        });
        const enc = new TextEncoder();
        // Announce presence periodically
        heartbeat = setInterval(() => {
          try {
            node.services.pubsub.publish(topic, enc.encode(JSON.stringify({ type: 'presence', t: Date.now() })));
            appendMsg('sent: presence');
          } catch {}
        }, 10000);
      }
    } catch (e) {
      console.error('[PKC] p2p-libp2p failed to start', e);
      setStatus('P2P: failed');
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('wrtc not set')) {
        appendMsg('error: wrtc not set (node-only build). Use webrtc-star browser bundle and set config.force="star".');
      } else {
        appendMsg('error: ' + (e?.message || e));
      }
    }
  },
  async stop() {
    if (node) {
      try { await node.stop(); } catch {}
      node = null;
    }
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
    if (peerCountInterval) { clearInterval(peerCountInterval); peerCountInterval = null; }
  }
};
