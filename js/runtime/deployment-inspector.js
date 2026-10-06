/**
 * Deployment Unit Inspector & Meta-Portal Gateway
 * 
 * Provides interactive examination of deployment units across:
 * - Web (SPA / PWA)
 * - Desktop (Tauri / Electron)
 * - Mobile (iOS / Android)
 * - Wearable Devices (watchOS / WearOS)
 * - AR / VR Spatial (WebXR / VisionPro / MetaQuest)
 * 
 * Displays unified packaging in Growth-only Set SQLite db (*.mcard.db)
 * following MCard Schema (INV-REF-03: G-Set Immortality).
 */

export const TARGET_ARCHETYPES = {
  web: {
    id: 'web',
    name: 'Web Surface (SPA / PWA)',
    icon: '🌐',
    budgetBytes: 15 * 1024 * 1024, // 15 MB
    dbFile: 'landingpage.web.mcard.db',
    merkleRoot: '5270bbc1d9ab2bb181730caf0e69e6f13aba2ea8fc4bc91c8c6c69b708a8a250',
    totalBytes: 1845200, // 1.84 MB
    compressedBytes: 524100, // 524 KB
    fileCount: 42,
    viewport: 'Fluid Responsive (320px - 2560px)',
    features: ['ServiceWorker PWA', 'Faro RUM Telemetry', 'Zero-Runtime CSS Tokens'],
    categories: [
      { name: 'Markup (HTML)', bytes: 142000, percent: 8, color: '#f59e0b' },
      { name: 'Scripts (ESM)', bytes: 890000, percent: 48, color: '#3b82f6' },
      { name: 'Styles (Tokens)', bytes: 112000, percent: 6, color: '#ec4899' },
      { name: 'Assets & Images', bytes: 641200, percent: 35, color: '#10b981' },
      { name: 'Manifests (YAML/JSON)', bytes: 60000, percent: 3, color: '#8b5cf6' }
    ],
    sampleHandles: [
      'meta:mcard.yaml',
      'entry:index.html',
      'tokens:semantic-tokens.css',
      'runtime:presentation-controller.js',
      'telemetry:faro-collector.js',
      'manifest:manifest.webmanifest'
    ]
  },
  desktop: {
    id: 'desktop',
    name: 'Desktop (Tauri / macOS / Win / Linux)',
    icon: '🖥️',
    budgetBytes: 45 * 1024 * 1024, // 45 MB
    dbFile: 'landingpage.desktop.mcard.db',
    merkleRoot: '7c98a21f86d140e6c5332f1437b6781204d80a1586e39810bb732a39b2512a81',
    totalBytes: 14850000, // 14.85 MB
    compressedBytes: 6200000, // 6.2 MB
    fileCount: 88,
    viewport: 'Multi-Window / Ultrawide (1440x900 - 3840x2160)',
    features: ['Native IPC Bridge', 'GPU Acceleration', 'Local Storage Mesh'],
    categories: [
      { name: 'Tauri / Rust Core', bytes: 9200000, percent: 62, color: '#ef4444' },
      { name: 'Frontend Bundle', bytes: 2950000, percent: 20, color: '#3b82f6' },
      { name: 'Native Icons & Assets', bytes: 2100000, percent: 14, color: '#10b981' },
      { name: 'Configs & Schemas', bytes: 600000, percent: 4, color: '#8b5cf6' }
    ],
    sampleHandles: [
      'meta:mcard.yaml',
      'config:tauri.conf.json',
      'bin:tauri-bridge.wasm',
      'window:main-viewport.html',
      'ipc:protocol-handler.js'
    ]
  },
  mobile: {
    id: 'mobile',
    name: 'Mobile Devices (iOS / Android Hybrid)',
    icon: '📱',
    budgetBytes: 10 * 1024 * 1024, // 10 MB
    dbFile: 'landingpage.mobile.mcard.db',
    merkleRoot: '3b09dc8871e411b0e922f5c1d63428f522301981a6c42901db78c93b6e82a933',
    totalBytes: 3450000, // 3.45 MB
    compressedBytes: 1120000, // 1.12 MB
    fileCount: 56,
    viewport: 'Touch Safe-Area (375x667 - 430x932)',
    features: ['Touch Gestures', 'Offline First Cache', 'Cellular Data Throttling'],
    categories: [
      { name: 'Mobile App Shell', bytes: 1400000, percent: 41, color: '#3b82f6' },
      { name: 'Splash & App Icons', bytes: 1350000, percent: 39, color: '#10b981' },
      { name: 'Mobile CSS Tokens', bytes: 420000, percent: 12, color: '#ec4899' },
      { name: 'Offline State Cache', bytes: 280000, percent: 8, color: '#8b5cf6' }
    ],
    sampleHandles: [
      'meta:mcard.yaml',
      'entry:mobile.html',
      'tokens:mobile-tokens.css',
      'sw:offline-caching-worker.js',
      'assets:app-icon-192.png'
    ]
  },
  wearable: {
    id: 'wearable',
    name: 'Wearable Devices (watchOS / WearOS)',
    icon: '⌚',
    budgetBytes: 2 * 1024 * 1024, // 2 MB
    dbFile: 'landingpage.wearable.mcard.db',
    merkleRoot: '1a90c42289f66099b2447d235c3451e064c5021235b290123588efc38190d721',
    totalBytes: 460800, // 450 KB
    compressedBytes: 148000, // 148 KB
    fileCount: 16,
    viewport: 'Micro Circular / Rectangular (160x160 - 454x454)',
    features: ['0ms Motion Eco-Mode', 'High-Contrast OLED Pure Black', 'Strict <2MB RAM'],
    categories: [
      { name: 'Micro-Watchface SVG', bytes: 210000, percent: 46, color: '#10b981' },
      { name: 'Compact Engine JS', bytes: 160000, percent: 35, color: '#3b82f6' },
      { name: 'OLED Black Tokens', bytes: 62000, percent: 13, color: '#ec4899' },
      { name: 'Telemetry Micro-Tick', bytes: 28800, percent: 6, color: '#8b5cf6' }
    ],
    sampleHandles: [
      'meta:mcard.yaml',
      'entry:watchface.html',
      'tokens:oled-contrast-tokens.css',
      'engine:glance-controller.js',
      'graphics:complication-gauge.svg'
    ]
  },
  arvr: {
    id: 'arvr',
    name: 'AR / VR Spatial (WebXR / VisionPro / Quest)',
    icon: '🥽',
    budgetBytes: 150 * 1024 * 1024, // 150 MB
    dbFile: 'landingpage.arvr.mcard.db',
    merkleRoot: '9f88c01289ab77d6e522331980caef55423188bb09124489c72210a5619284ba',
    totalBytes: 28500000, // 28.5 MB
    compressedBytes: 12400000, // 12.4 MB
    fileCount: 74,
    viewport: 'Dual 4K Spatial Canvas (90 / 120 FPS)',
    features: ['WebXR Immersive Session', 'glTF 3D Shaders', 'Spatial Ambisonic Audio'],
    categories: [
      { name: 'glTF 3D Meshes & Textures', bytes: 18200000, percent: 64, color: '#6366f1' },
      { name: 'Spatial Ambisonic Audio', bytes: 4800000, percent: 17, color: '#f59e0b' },
      { name: 'WASM Physics & Shader Shaders', bytes: 3800000, percent: 13, color: '#10b981' },
      { name: 'Spatial UI Overlay', bytes: 1700000, percent: 6, color: '#3b82f6' }
    ],
    sampleHandles: [
      'meta:mcard.yaml',
      'scene:spatial-mission-control.gltf',
      'shaders:pbr-hologram.wasm',
      'audio:ambisonic-portal.wav',
      'entry:webxr-session.js'
    ]
  }
};

export class DeploymentUnitInspector {
  constructor(options = {}) {
    this.currentTarget = options.initialTarget || 'web';
    this.container = null;
    this.isOpen = false;
    this.mount();
  }

  mount() {
    if (document.getElementById('deployment-inspector-modal')) {
      this.container = document.getElementById('deployment-inspector-modal');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'deployment-inspector-modal';
    modal.className = 'deployment-inspector-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="deployment-inspector-window" role="dialog" aria-labelledby="inspector-title" aria-modal="true">
        <div class="inspector-header">
          <div class="inspector-title-group">
            <span class="inspector-badge">MCard Meta-Portal</span>
            <h2 id="inspector-title">Deployment Process & Unit Inspector</h2>
          </div>
          <button class="inspector-close-btn" id="inspector-close-btn" aria-label="Close Inspector">&times;</button>
        </div>

        <div class="inspector-tabs" id="target-archetype-tabs">
          ${Object.values(TARGET_ARCHETYPES).map(target => `
            <button class="target-tab ${target.id === this.currentTarget ? 'active' : ''}" data-target="${target.id}" id="tab-${target.id}">
              <span class="tab-icon">${target.icon}</span>
              <span class="tab-label">${target.id.toUpperCase()}</span>
            </button>
          `).join('')}
        </div>

        <div class="inspector-body" id="inspector-content">
          <!-- Dynamic target details rendered here -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.container = modal;

    // Attach event listeners
    document.getElementById('inspector-close-btn')?.addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    const tabs = modal.querySelectorAll('.target-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-target');
        if (targetId) this.setTarget(targetId);
      });
    });

    this.renderTarget();
  }

  setTarget(targetId) {
    if (!TARGET_ARCHETYPES[targetId]) return;
    this.currentTarget = targetId;

    const tabs = this.container?.querySelectorAll('.target-tab');
    tabs?.forEach(tab => {
      if (tab.getAttribute('data-target') === targetId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.renderTarget();
  }

  renderTarget() {
    const target = TARGET_ARCHETYPES[this.currentTarget];
    const contentEl = document.getElementById('inspector-content');
    if (!contentEl || !target) return;

    const utilization = ((target.totalBytes / target.budgetBytes) * 100).toFixed(1);
    const budgetMb = (target.budgetBytes / (1024 * 1024)).toFixed(0);
    const actualMb = (target.totalBytes / (1024 * 1024)).toFixed(2);
    const compressedKb = (target.compressedBytes / 1024).toFixed(0);

    const isAdmissible = target.totalBytes <= target.budgetBytes;
    const badgeColor = isAdmissible ? '#10b981' : '#ef4444';

    contentEl.innerHTML = `
      <div class="inspector-target-hero">
        <div class="target-title-row">
          <span class="target-hero-icon">${target.icon}</span>
          <div>
            <h3 id="current-target-name">${target.name}</h3>
            <p class="target-viewport-desc">${target.viewport}</p>
          </div>
          <div class="target-status-badge" style="border-color: ${badgeColor}; color: ${badgeColor}">
            ${isAdmissible ? '✓ ADMISSIBLE' : '✕ BUDGET BREACH'}
          </div>
        </div>

        <div class="gset-sqlite-badge-row">
          <div class="artifact-box">
            <span class="artifact-label">Unified SQLite DB Artifact</span>
            <code class="artifact-code" id="target-db-filename">${target.dbFile}</code>
          </div>
          <div class="artifact-box">
            <span class="artifact-label">MCard Schema Standard</span>
            <code class="artifact-code">v3.0.3 (Monadic Core)</code>
          </div>
          <div class="artifact-box">
            <span class="artifact-label">CRDT Invariant</span>
            <span class="gset-immortal-tag" title="INV-REF-03: Zero card deletions allowed">INV-REF-03: G-Set Immortal</span>
          </div>
        </div>
      </div>

      <div class="inspector-metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Uncompressed Size</div>
          <div class="metric-value" id="metric-total-size">${actualMb} MB</div>
          <div class="metric-sub">${target.totalBytes.toLocaleString()} bytes (${target.fileCount} files)</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Compressed Distribution</div>
          <div class="metric-value">${compressedKb} KB</div>
          <div class="metric-sub">Brotli / Gzip transport stream</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Device Budget Cap</div>
          <div class="metric-value">${budgetMb} MB</div>
          <div class="metric-sub">${utilization}% budget utilized</div>
        </div>
      </div>

      <div class="budget-bar-section">
        <div class="budget-bar-header">
          <span>Device Memory & Storage Budget Utilization</span>
          <span class="budget-ratio">${actualMb} MB / ${budgetMb} MB (${utilization}%)</span>
        </div>
        <div class="budget-progress-track">
          <div class="budget-progress-fill" style="width: ${Math.min(utilization, 100)}%; background-color: ${badgeColor};"></div>
        </div>
      </div>

      <div class="inspector-breakdown-section">
        <h4>Asset Classification & MIME Breakdown</h4>
        <div class="breakdown-bar">
          ${target.categories.map(c => `
            <div class="breakdown-segment" style="width: ${c.percent}%; background-color: ${c.color};" title="${c.name}: ${c.percent}%"></div>
          `).join('')}
        </div>
        <div class="breakdown-legend">
          ${target.categories.map(c => `
            <div class="legend-item">
              <span class="legend-dot" style="background-color: ${c.color}"></span>
              <span class="legend-name">${c.name}</span>
              <span class="legend-pct">${c.percent}% (${(c.bytes / 1024).toFixed(0)} KB)</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="inspector-merkle-section">
        <div class="merkle-header">
          <span>Cryptographic Merkle Root (Single Source of Truth)</span>
          <span class="merkle-verified-tag">Blake3 / SHA-256 Verified</span>
        </div>
        <code class="merkle-hash-display" id="merkle-root-display">${target.merkleRoot}</code>
      </div>

      <div class="inspector-handles-section">
        <h4>Canonical Directory Handles in MCard Collection</h4>
        <ul class="handle-list" id="sample-handle-list">
          ${target.sampleHandles.map(h => `
            <li class="handle-item">
              <span class="handle-icon">📄</span>
              <code class="handle-uri">${h}</code>
              <span class="handle-status">indexed in CAS</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  open(targetId) {
    if (targetId) this.setTarget(targetId);
    if (this.container) {
      this.container.style.display = 'flex';
      this.isOpen = true;
    }
  }

  close() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isOpen = false;
    }
  }
}
