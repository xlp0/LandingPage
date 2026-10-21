# PKC Landing Page, Universal 4-Modality MCard Browser & Responsive Test Workbench

## Systematic MCard Content Browsing, Responsive Testing, Telemetry Capture & Replay

`LandingPage` is **Estate 3** of the `MCard_TDD` four-estate workspace. It serves two tightly integrated roles:

1. **Universal 4-Modality MCard Content Browser**: A modular, execution-isolated browser for all content stored in the **MCard Canonical Triad SQLite Dataset Engine** (`card`, `handle_registry`, `handle_history`), powered by the published **`clm-kernel@0.0.10`** npm package (`computeHash`, `TypeInterpreter`, `detectMime`, `isBinary`). Every MCard is classified and projected across four universal modalities (`media`, `document`, `code`, `webapp`).
2. **Device-Sensitive Responsive Test Workbench**: A static-first testing and telemetry harness (`responsive-lab.html`) for certifying chosen web targets across viewport geometry, orientation swap, pixel density, touch ergonomics, scale-invariant interaction capture (`[0.0, 1.0]`), and deterministic Playwright replay.

---

## 🏛️ Four-Estate `MCard_TDD` Positioning

| Estate | Submodule / Path | Published Package | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **1. Kernel** | `clm/` | `clm-kernel@0.0.10` | Zero-dependency cryptographic hashing (`blake3`, `sha256`), `g_time` stamping, and `TypeInterpreter` / `detectMime` / `isBinary` judgment. |
| **2. Studio** | `mcard-studio/` | `mcard-studio@0.2.9` | 9-Viewlet browser IDE and workbench on port `5320` for authoring, inspecting, and certifying MCards. |
| **3. Portal & Lab** | `LandingPage/` | `pkc-landing-page-monorepo` | Universal 4-Modality MCard Content Browser, Single-Page MCard host (`urn:mcard:content:landing_page`), and Responsive Test Workbench on port `3001`. |
| **4. Orchestrator** | `MCard_TDD` (root) | Root workspace | Cross-submodule `Makefile` orchestration (`make landing-up`, `make landing-test`, `make landing-seed`, `make status`), consensus gates, and sprint governance. |

---

## 🌐 Universal 4-Modality MCard Content Browser (`Program SMO`)

Every MCard payload stored in `CanonicalTriadBackend` ([`server/mcard-api.mjs`](server/mcard-api.mjs)) is verified over its raw bytes before UTF-8 conversion, classified by [`server/mcard-modality.mjs`](server/mcard-modality.mjs) via `clm-kernel@0.0.10`, and projected by [`js/landing-page-mcard.js`](js/landing-page-mcard.js) and [`js/renderers/`](js/renderers/BaseRenderer.js):

| Modality | Canonical MIME Families | Server & Browser Pipeline | Execution Isolation Contract |
| :--- | :--- | :--- | :--- |
| **1. `media`** (Static Media Files) | `image/*`, `audio/*`, `video/*`, `application/pdf`, `model/*`, `application/octet-stream` | Binary-safe `CanonicalTriadBackend.get(hash)` verifies digest over `rawBytes`. Streamed via `GET /api/mcard/:hash/raw` with `X-Content-Type-Options: nosniff`. Projected via `<img>`, `<audio controls>`, `<video controls>`, or sandboxed PDF `<iframe>`. | Zero script execution (`default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:`). |
| **2. `document`** (Text & Structured Documents) | `text/markdown`, `text/plain`, `application/json`, `application/x-yaml`, `application/x-latex` | UTF-8 text projected via `renderPage()`, `MarkdownRenderer`, `TextRenderer`, `JsonRenderer`, and `LaTeXRenderer` with `[[hash]]` and `[[handle\|label]]` transclusion links. | HTML entities are escaped prior to transclusion link resolution. |
| **3. `code`** (Source Code & CLM Descriptors) | `application/javascript`, `text/javascript`, `application/typescript`, `text/css`, `text/x-python`, `text/x-rust`, `text/x-sql`, `application/x-clm` | Classified by `TypeInterpreter` or CLM triad structural markers (`abstract_spec` / `concrete_impl` / `balanced_exp`). Projected via inert line-numbered `<pre class="mcard-code-body" data-modality="code" data-execution="inert">`. | **Inert Inspection Law (`INV-SMO-04`)**: Browsing a `code` MCard never executes the code payload. |
| **4. `webapp`** (Executable Web Pages & Portals) | `text/html`, `text/uri-list`, `external-url: https://...` | Inline `text/html` cards render inside `<iframe class="mcard-webapp-frame" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer" srcdoc="...">`. External/local URLs are probed via `GET /api/mcard/probe-url` ([`server/mcard-probe-policy.mjs`](server/mcard-probe-policy.mjs)) and mounted via [`js/external-portal-membrane.js`](js/external-portal-membrane.js) (`live` / `snapshot` / `offline`). Supports `{ viewMode: 'source' }` to inspect raw HTML inertly as `code`. | **Membrane Isolation Law**: `allow-same-origin` is omitted from all untrusted `webapp` iframes; telemetry uses fail-closed `postMessage` validation (`mcard-portal-telemetry/v1`). |

Detailed architecture guide: **[`docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md`](docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md)**.

---

## 🏆 Completed Sprint Programs

### 1. Program SMO: Submodule Modularity & Universal MCard Browser ([`docs/sprints/01-architecture/`](docs/sprints/01-architecture/INDEX.md))

| Sprint | Focus | Primary Artifacts | Verification Gate | Status |
| :--- | :--- | :--- | :--- | :---: |
| **[SMO-00](docs/sprints/01-architecture/00-submodule-modularity-and-organizational-program-charter.md)** | Program Charter & Invariants | `INV-SMO-01..05`, 4-Modality Matrix | Charter DoD & link verification | ✅ Graduated |
| **[SMO-01](docs/sprints/01-architecture/sprint-smo01-submodule-topology-and-monorepo-duality.md)** | Submodule Topology & Binary-Safe Triad API | `server/mcard-api.mjs`, `server/mcard-modality.mjs`, `server/mcard-probe-policy.mjs` | `GET /api/mcard/:hash/raw` + Contract D (`<= 500` LOC) | ✅ Graduated |
| **[SMO-02](docs/sprints/01-architecture/sprint-smo02-published-kernel-consensus-and-dependency-parity.md)** | Published `clm-kernel@0.0.10` Consensus | `package.json`, `package-lock.json`, `server/mcard-modality.mjs` | `node ../mcard-studio/scripts/check-kernel-version-consensus.mjs` | ✅ Graduated |
| **[SMO-03](docs/sprints/01-architecture/sprint-smo03-four-estate-cross-boundary-contracts.md)** | Four-Estate Contracts & 4-Modality Membrane | `js/landing-page-mcard.js`, `js/renderers/EmbedRenderer.js`, `app-config.json` | `node --test tests/single-page-mcard.test.mjs` (24/24) | ✅ Graduated |
| **[SMO-04](docs/sprints/01-architecture/sprint-smo04-documentation-hygiene-and-tier-reorganization.md)** | Documentation Hygiene & Tier Reorganization | `docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md`, `docs/INDEX.md` | Zero loose root docs in `docs/` + 100% link resolution | ✅ Graduated |
| **[SMO-05](docs/sprints/01-architecture/sprint-smo05-master-readme-alignment-and-verification.md)** | Master README Alignment & Verification | `README.md`, `docs/sprints/01-architecture/INDEX.md` | `npm run test:unit` (97/97) + full SMO gate battery | ✅ Graduated |

### 2. Program ERB: Device-Sensitive Testing Infrastructure ([`docs/sprints/08-testing/`](docs/sprints/08-testing/INDEX.md))

| Sprint | Focus | Primary Artifacts | Verification Gate | Status |
| :--- | :--- | :--- | :--- | :---: |
| **[ERB-00](docs/sprints/08-testing/SPRINT-ERB-00-infrastructure-refactoring.md)** | Infrastructure Modularization | `js/harness/viewport-stage.js`, `js/harness/target-membrane.js`, `js/harness/lab-toolbar.js` | `npm run test:unit` + rotation tests | ✅ Graduated |
| **[ERB-01](docs/sprints/08-testing/SPRINT-ERB-01-ring-buffer-core.md)** | Ring Buffer Core & State Engine | `js/harness/event-ring-buffer.js`, `js/harness/recording-state-machine.js` | `node --test tests/unit/event-ring-buffer.test.mjs` | ✅ Graduated |
| **[ERB-05](docs/sprints/08-testing/SPRINT-ERB-05-device-capability-profiles.md)** | Device Capability Profiles & Fidelity Tiers | `js/device-registry.js` (schema v2), `js/harness/fidelity.js` | `node --test tests/unit/device-registry-v2.test.mjs` | ✅ Graduated |
| **[ERB-02](docs/sprints/08-testing/SPRINT-ERB-02-membrane-normalization.md)** | Target Membrane & Touch Ergonomics | `js/harness/membrane-interceptor.js`, `js/harness/lab-probe-agent.js`, `js/harness/normalize-event.js` | `tests/features/responsive-capture.spec.js` | ✅ Graduated |
| **[ERB-03](docs/sprints/08-testing/SPRINT-ERB-03-mcard-clm-persistence.md)** | Device Telemetry & MCard Pipeline | `js/harness/telemetry-collector.js`, `server/test-run-api.mjs`, `js/harness/test-run-schema.js` | `tests/unit/test-run-api.test.mjs` | ✅ Graduated |
| **[ERB-04](docs/sprints/08-testing/SPRINT-ERB-04-playwright-deterministic-replay.md)** | Playwright Replay & Systematic Sweeps | `scripts/playwright-replay-driver.mjs`, `tests/features/systematic-landing-test.spec.js` | `npm run test:responsive` and `npm run test:replay` | ✅ Graduated |
| **[ERB-06](docs/sprints/08-testing/SPRINT-ERB-06-device-sensitive-conformance.md)** | Conformance Suite & Certification | `tests/conformance/checks/*.js`, `tests/features/device-conformance.spec.js` | `npm run test:conformance` (`urn:mcard:certification:responsive:v1`) | ✅ Graduated |

Detailed testing guide: **[`docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md`](docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md)**.

---

## 🔬 Device-Sensitive Dimensions (100% Certified)

1. **Dynamic Geometry & Orientation Reflow (`INV-RVP-01`)**: Instant swapping of viewport width and height across the 8 built-in profiles in [`js/device-registry.js`](js/device-registry.js).
2. **Declared Fidelity Tiers (`INV-DSF-01`, `INV-DSF-02`)**: Every run and report declares its fidelity tier (`T0` lab iframe, `T1`/`T2` Playwright context with DPR/touch/UA/CDP throttling, `T3` physical LAN device).
3. **Horizontal Viewport Bleed (`INV-DEV-01`)**: Automated detection of horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`).
4. **Touch Target Ergonomics (`INV-DEV-02`)**: Interactive elements on coarse-pointer devices meet mobile tap size requirements ($\ge 44\text{px} \times 44\text{px}$).
5. **Scale-Invariant Interaction Capture (`INV-ERB-01..05`, `INV-PRV-01`)**: Bounded in-memory ring buffer normalized to $[0.0, 1.0]$ with automatic credential/input redaction.
6. **Frame Budget & Layout Stability (`INV-DEV-04`)**: Observation of frame latency ($16.6\text{ms}$ budget / $60\text{fps}$) and layout shift (CLS).
7. **MCard Test Dataset Certification (`INV-ERB-04`)**: Content-addressed persistence of test runs into the SQLite Triad (`data/mcard-api.db`) with `clm-kernel@0.0.10` (`blake3`) hashing and `urn:mcard:certification:responsive:v1`.

---

## 📦 Canonical 3-Table, 3-Column Triad SQLite Contract (`INV-510`)

`LandingPage` persists all MCards (both single-page portal cards and `data/samples/portal_samples.mcard.db`) using the canonical 3-table, 3-column Triad SQLite schema implemented in [`server/mcard-api.mjs`](server/mcard-api.mjs):

```sql
CREATE TABLE IF NOT EXISTS card (
  hash TEXT PRIMARY KEY NOT NULL,
  content BLOB NOT NULL,
  g_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS handle_registry (
  handle TEXT PRIMARY KEY NOT NULL,
  current_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS handle_history (
  handle TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  changed_at TEXT NOT NULL
);
```

- **Content-Only Hash Law**: `card.hash = hex(H(content))` where algorithm `H` (`blake3` default, `sha256` legacy) is declared in coordinate `a` of `g_time = ALGORITHM|TIMESTAMP|LOCALE`.
- **Append-Only G-Set (`INV-REF-03`)**: `DELETE /api/mcard/:hash` releases mutable handle bindings in `handle_registry` while retaining immutable card content in `card`.
- **Deterministic 6-Sample Corpus**: [`scripts/seed-portal-samples.mjs`](scripts/seed-portal-samples.mjs) seeds [`data/samples/portal_samples.mcard.db`](data/samples/portal_samples.mcard.db), [`data/samples/portal_samples_manifest.yaml`](data/samples/portal_samples_manifest.yaml), and [`data/samples/portal_samples_manifest.json`](data/samples/portal_samples_manifest.json).

---

## 🛠️ Quick Start (Standalone & Monorepo Dual-Mode)

### 1. From `LandingPage/` (Standalone Submodule Mode)

```bash
# Start the unified HTTP + WebSocket + MCard API server on port 3001
npm run dev

# Run the complete unit + single-page MCard test suite (97 tests)
npm run test:unit

# Regenerate and verify the 6-sample portal corpus
node scripts/seed-portal-samples.mjs

# Run Playwright responsive, replay, and conformance suites
npm run test:responsive
npm run test:replay
npm run test:conformance
```

### 2. From `MCard_TDD/` (Parent Monorepo Mode)

```bash
make landing-up      # Start LandingPage server on port 3001
make landing-test    # Run LandingPage unit and single-page MCard tests
make landing-seed    # Seed and verify the 6-sample portal corpus
make status          # Check health across clm, mcard-studio (:5320), and LandingPage (:3001)
```

---

## 📚 Documentation Architecture & 12-Tier Categorized Directory

See the **[Master Documentation Index (`docs/INDEX.md`)](docs/INDEX.md)** and **[Documentation Structure Guide (`docs/README.md`)](docs/README.md)** for complete navigation.

| Tier | Category | Key Topics & Invariants | Entry Point |
| :---: | :--- | :--- | :--- |
| **00** | **Getting Started** | Developer onboarding, 5-minute setup, operational status, interactive lab usage guide | [docs/00-getting-started/](docs/00-getting-started/README.md) |
| **01** | **Architecture** | Four-Estate framework (`ULR-01`), [Universal 4-Modality MCard Browser](docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md), system invariants | [docs/01-architecture/](docs/01-architecture/README.md) |
| **02** | **Authentication** | Zitadel OIDC with PKCE, Google OAuth setup, auth-gated CSP, privacy redaction (`INV-PRV-01`) | [docs/02-authentication/](docs/02-authentication/README.md) |
| **03** | **Data Management** | Canonical SQLite Triad (`card`, `handle_registry`, `handle_history`), `clm-kernel@0.0.10` consensus, 4-modality rendering | [docs/03-data-management/](docs/03-data-management/README.md) |
| **04** | **Networking** | WebRTC P2P data mesh, WebSocket signaling on port 3001, SSRF network membrane guards | [docs/04-networking/](docs/04-networking/README.md) |
| **05** | **State Management** | Global Redux Toolkit application store and deterministic 20-pair `RecordingStateMachine` (`INV-ERB-03`) | [docs/05-state-management/](docs/05-state-management/README.md) |
| **06** | **Components** | Responsive Lab harness ES modules, CLM Three Sets framework, 3D Theater, and [Multiplayer Games](docs/06-components/games/CHESS_GAME_DOCUMENTATION.md) | [docs/06-components/](docs/06-components/README.md) |
| **07** | **Deployment** | Containerized Node.js runtime, ArgoCD GitOps pipelines, Cloudflare R2 storage, pre-deploy CI gates | [docs/07-deployment/](docs/07-deployment/README.md) |
| **08** | **Testing** | Device-sensitive testing infrastructure, Playwright replay driver, 16-device sweeps, conformance suite | [docs/08-testing/](docs/08-testing/README.md) |
| **09** | **Performance** | In-target telemetry (16.6ms frame budget `INV-DEV-04`, CLS, bleed `INV-DEV-01`), Grafana Faro RUM | [docs/09-performance/](docs/09-performance/README.md) |
| **10** | **Project Management** | Agile methodology, BMAD agent roles, sprint coordination, and epics | [docs/10-project-management/](docs/10-project-management/README.md) |
| **11** | **Standards** | Unified CSS token contracts (`tokens.css`, `semantic-tokens.css`), style gates, clean-room contracts | [docs/11-standards/](docs/11-standards/README.md) |

### Specialized References & Sprint Archives
- 📖 **[Universal 4-Modality MCard Browser Architecture](docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md)**
- 🏆 **[Graduated Program SMO Sprints Archive (`SMO-00..05`)](docs/sprints/01-architecture/INDEX.md)**
- 🏆 **[Graduated Program ERB Sprints Archive (`ERB-00..06`)](docs/sprints/08-testing/INDEX.md)**
- 📖 **[Device-Sensitive Testing Infrastructure Guide](docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md)**
- 🌟 **[Authoritative Functional Specifications Library](docs/functionalities/README.md)**
- 🧪 **[Playwright E2E Test Documentation](tests/TEST_DOCUMENTATION.md)**
