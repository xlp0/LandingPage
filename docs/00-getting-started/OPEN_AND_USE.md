# 🎮 How to Open & Use the Responsive UI Lab Workbench

This guide explains how to use the interactive features of the **Responsive UI Lab** (`responsive-lab.html`).

---

## 🚀 Launching the Workbench

1. Start the server:
   ```bash
   npm run dev
   ```
2. Open your browser:
   ```text
   http://localhost:3001/responsive-lab.html
   ```

---

## 🛠️ Workbench Capabilities & Controls

### 1. Target URL Ingestion (`INV-STU-01`, `INV-STU-02`)
- **Top Selector**: Use the target URL dropdown to switch between built-in targets (e.g., `index.html`, `app.html`, or local development servers).
- **Query Parameter**: Directly load any web target via URL:
  ```text
  http://localhost:3001/responsive-lab.html?target=http://localhost:4321/
  ```

### 2. Device Selection & Orientation Reflow (`INV-RVP-01`)
- **Device Presets**: Choose from 8 modern device profiles in the top bar:
  - *Phones*: iPhone 16 Pro, iPhone SE, Google Pixel 8, Samsung Galaxy S24
  - *Tablets*: iPad Air 11", iPad Mini
  - *Desktops*: MacBook Air 13", Desktop 1080p
- **Orientation Toggle**: Click **Portrait** or **Landscape** to physically swap viewport dimensions ($W \leftrightarrow H$).
- **Custom Viewports**: Use the Device Manager to define custom resolutions with automatic GCD aspect ratio calculation.

### 3. Layout-Box Stage Containment (`INV-RVP-02`)
- Even the largest desktop viewports fit entirely on screen inside the `.viewport-scale-wrapper` without introducing window scrollbars.
- The scale factor $s = \min(1, W_{\text{available}} / w_{\text{target}}, H_{\text{available}} / h_{\text{target}})$ automatically recalculates on window resize.

### 4. Interaction Capture & Ring Buffer (`INV-ERB-01..03`)
- **Record**: Click **Record** to begin capturing pointer, touch, scroll, and navigation events into the bounded in-memory ring buffer.
- **Normalize**: Pointer coordinates are automatically mapped to scale-free values $[0.0, 1.0]$ relative to the target's viewport.
- **Redact**: Sensitive inputs (passwords, PINs) are automatically redacted (`INV-PRV-01`).
- **Stop**: Click **Stop** to inspect the recorded session and its event sequence.

### 5. In-Target Telemetry & Ergonomics (`INV-DEV-01..04`)
- **Horizontal Bleed**: Real-time warning if `scrollWidth > innerWidth`.
- **Frame Latency**: 60 fps / 16.6ms budget compliance monitoring.
- **Cumulative Layout Shift (CLS)**: Cumulative shift tracking during rapid reflows.
- **Tap Target Ergonomics**: Live visual audit highlighting clickable elements $< 44\text{px} \times 44\text{px}$ on coarse-pointer profiles.

### 6. Persistence & Replay (`INV-ERB-04`)
- **Save Run**: Send the session to `/api/test-runs` to seal it into the SQLite Triad (`data/mcard-api.db`) with Blake3 content addressing.
- **Automated Replay**: Execute deterministic Playwright headless replays via `npm run test:replay`.
