// PKC Module: net-gateway (WebSocket demo)
// Purpose: Demonstrate optional server-assisted networking via WebSocket echo
// Behavior: If WebSocket capability is present and config.wsUrl provided, connect and log echo

let socket = null;
let pingTimer = null;

function setBadge(state, text) {
  const el = document.getElementById('ws-status');
  if (!el) return;
  el.classList.remove('ws-ok', 'ws-warn', 'ws-err');
  el.classList.add(state);
  const spanText = el.querySelector('span:last-child');
  if (spanText) spanText.textContent = text;
  
  // Update the dot color directly with Tailwind classes
  const dot = document.getElementById('ws-dot');
  if (dot) {
    dot.className = 'w-2 h-2 rounded-full'; // Reset classes
    if (state === 'ws-ok') {
      dot.classList.add('bg-green-500');
    } else if (state === 'ws-warn') {
      dot.classList.add('bg-amber-500');
    } else if (state === 'ws-err') {
      dot.classList.add('bg-red-500');
    } else {
      dot.classList.add('bg-gray-400');
    }
  }
}

function updateClientCount(count) {
  console.log('[PKC] updateClientCount called with:', count);
  
  const tryUpdate = () => {
    const el = document.getElementById('client-count');
    console.log('[PKC] Looking for client-count element:', !!el);
    if (el) {
      const oldText = el.textContent;
      el.textContent = count;
      console.log('[PKC] Successfully updated client-count from', oldText, 'to', count);
      return true;
    }
    return false;
  };
  
  // Try immediately
  if (!tryUpdate()) {
    console.log('[PKC] Element not found immediately, will retry...');
    // Try again after a short delay
    setTimeout(() => {
      if (!tryUpdate()) {
        console.error('[PKC] client-count element still not found after retry');
        // Emergency fallback: try to find any span with "client" in the text
        const allSpans = document.querySelectorAll('span');
        console.log('[PKC] Emergency search: found', allSpans.length, 'spans');
        allSpans.forEach((span, i) => {
          if (span.textContent.includes('Clients:') || span.id.includes('client')) {
            console.log('[PKC] Found candidate span', i, ':', span.id, span.textContent);
            // Try to update the next sibling if this is the label
            if (span.nextElementSibling && span.nextElementSibling.tagName === 'SPAN') {
              span.nextElementSibling.textContent = count;
              console.log('[PKC] Updated via emergency fallback');
            }
          }
        });
      }
    }, 500);
  }
}

export default {
  id: 'net-gateway',
  async init({ pkc, config, appConfig, capabilities }) {
    console.log('[PKC] net-gateway: init called');
    this.pkc = pkc;
    this.config = config || {};
    this.appConfig = appConfig || {};
    this.capabilities = capabilities || {};
    console.log('[PKC] net-gateway: config', this.config);
    console.log('[PKC] net-gateway: appConfig', this.appConfig);
    pkc.ctx.log('net-gateway:init', { config: this.config, appConfig: this.appConfig, capabilities: this.capabilities });
  },
  async start() {
    console.log('[PKC] net-gateway: start called');
    const { pkc, config, appConfig, capabilities } = this;
    if (!capabilities.websocket) {
      console.log('[PKC] net-gateway: WebSocket not supported');
      pkc.ctx.log('net-gateway: WebSocket not supported in this environment');
      setBadge('ws-err', 'WS: unsupported');
      return;
    }

    // Test DOM element availability
    console.log('[PKC] Testing DOM element availability...');
    console.log('[PKC] document.readyState:', document.readyState);
    console.log('[PKC] client-count element exists immediately:', !!document.getElementById('client-count'));
    
    // Wait a bit and test again
    setTimeout(() => {
      console.log('[PKC] client-count element exists after 100ms:', !!document.getElementById('client-count'));
    }, 100);
    
    setTimeout(() => {
      console.log('[PKC] client-count element exists after 500ms:', !!document.getElementById('client-count'));
    }, 500);
    // Prefer centralized appConfig; fallback to module config
    const scheme = (location.protocol === 'https:') ? 'wss' : 'ws';
    const urlFromApp = (appConfig && appConfig.wsHost)
      ? `${scheme}://${appConfig.wsHost}${appConfig.wsPort ? ':'+appConfig.wsPort : ''}${appConfig.wsPath || '/ws/'}`
      : null;
    const url = urlFromApp || config.wsUrl;
    console.log('[PKC] net-gateway: constructed URL:', url);
    console.log('[PKC] net-gateway: urlFromApp:', urlFromApp);
    console.log('[PKC] net-gateway: config.wsUrl:', config.wsUrl);
    if (!url) {
      console.log('[PKC] net-gateway: no URL configured');
      pkc.ctx.log('net-gateway: wsUrl not configured; skipping connection');
      setBadge('ws-warn', 'WS: disabled');
      return;
    }
    try {
      console.log('[PKC] net-gateway: attempting WebSocket connection to:', url);
      socket = new WebSocket(url);
      socket.onopen = () => {
        console.log('[PKC] net-gateway: WebSocket connected successfully');
        pkc.ctx.log('net-gateway: connected', url);
        setBadge('ws-ok', 'WS: connected');
        
        // Test DOM update immediately after connection
        console.log('[PKC] Testing DOM update after WebSocket connect...');
        const testEl = document.getElementById('client-count');
        console.log('[PKC] client-count element after connect:', !!testEl);
        if (testEl) {
          console.log('[PKC] Element current text:', testEl.textContent);
          testEl.textContent = 'TEST';
          console.log('[PKC] Element after test update:', testEl.textContent);
          // Reset it
          setTimeout(() => testEl.textContent = '0', 1000);
        }
        
        // simple heartbeat / demo echo
        pingTimer = setInterval(() => {
          try {
            socket.send(JSON.stringify({ type: 'ping', t: Date.now() }));
          } catch {}
        }, 5000);
      };
      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'client_count') {
            console.log('[PKC] Received client_count:', data.count);
            updateClientCount(data.count);
            pkc.ctx.log('net-gateway: client count updated', data.count);
          } else if (data.type === 'pong') {
            // Handle pong response to ping
            pkc.ctx.log('net-gateway: pong received');
          } else {
            pkc.ctx.log('net-gateway: message', data);
          }
        } catch (e) {
          console.error('[PKC] net-gateway: failed to parse message:', evt.data, e);
          // If not JSON, log as raw message
          pkc.ctx.log('net-gateway: raw message', evt.data);
        }
      };
      socket.onerror = (err) => {
        console.error('[PKC] net-gateway websocket error', err);
        setBadge('ws-err', 'WS: error');
      };
      socket.onclose = () => {
        pkc.ctx.log('net-gateway: disconnected');
        setBadge('ws-warn', 'WS: disconnected');
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      };
    } catch (e) {
      console.error('[PKC] net-gateway failed to open', e);
      setBadge('ws-err', 'WS: failed');
    }
  },
  async stop() {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    if (socket && socket.readyState === WebSocket.OPEN) {
      try { socket.close(); } catch {}
    }
    socket = null;
    setBadge('ws-warn', 'WS: stopped');
  }
};
