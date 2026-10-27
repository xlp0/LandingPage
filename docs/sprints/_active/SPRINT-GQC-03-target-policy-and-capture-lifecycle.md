# Sprint GQC-03: Target policy and capture lifecycle

## Metadata

- Sprint ID: `SPRINT-GQC-03`
- Handle: `urn:pcard:sprint:SPRINT-GQC-03`
- Status: `COMPLETED`
- Depends on: `SPRINT-GQC-02B`
- Unblocks: `SPRINT-GQC-04`
- Execution unit: `PR-GQC-03`
- Poteto playbook: `security-review`, `tdd`, and `principle-boundary-discipline`
- BMAD roles: Analyst, Product Manager, Architect, TEA, Dev, UX Designer

## Outcome

Make target selection, target type, runtime configuration, and cross-origin capture follow one tested contract. Keep a target application's identity separate from its Page and Place graph. Preserve the existing ERB target membrane and telemetry receiver. Add no new generic security layer.

Use the [MCard_TDD design contract](./INDEX.md#mcard_tdd-design-contract). An unknown URL is not automatically an approved SPA target. A PenPot MPA graph does not authorize its URLs for capture.

This sprint runs after the Astro host. The Responsive Lab is an Astro page with Preact islands, and Express still owns CORS, CSP, configuration routes, and WebSockets. Policy must therefore hold for three page sources: Astro prerendered files in `dist/client/`, the Astro handler, and any remaining `legacy-static` page. In the GQC-02A net, every configuration fetch is a declared `server-call-request` Transition with `ok` and `fail` results. The blocked, unavailable, and handshake-timeout states are declared `error` Places or declared error states with a `recover` Transition. A policy state the net does not declare is a defect.

## Current contract gaps

- `app-config.json` defines `labTargets`, including approved local and blocked external targets, but does not declare whether a target is a SPA, MPA, MCard `webapp`, or probe fixture.
- `ws-server.js` defines a later `/app-config.json` route that returns WebSocket and P2P settings.
- Root static middleware at `ws-server.js:138` precedes the dynamic route. A second static mount follows the route at `ws-server.js:383`. Because the root contains `app-config.json`, the first mount shadows the later route for that path.
- `ws-server.js` derives some server behavior from target configuration. P2P modules also read runtime settings.
- The target selector derives options from `labTargets`, while quick-launch chips are hardcoded in `responsive-lab.html`.
- `ws-server.js` adds origins from all `labTargets` entries to CORS, including targets marked blocked.
- `ws-server.js` sends wildcard `default-src`, `connect-src`, and `frame-src` policies, and allows `unsafe-inline` and `unsafe-eval`.
- The target selector and `?target=` parameter choose an application URL. Neither identifies its Page or Place nor its Functional Link or Transition graph.
- The `app.html` default is not classified as an SPA. `index.html` redirects top-level traffic to the workbench and is not a substitute for a target SPA fixture.
- `createCaptureSource()` defaults `allowedOrigins` to an empty list. Its current predicate treats an empty list as unrestricted.
- The Responsive Lab calls `createCaptureSource()` without passing `allowedOrigins`.
- `CaptureProbeAgentSource` checks frame source, origin, schema, type, and nonce. `InteractionRecorder.setSource()` detaches its old source but does not call `destroy()`.
- The probe agent retries 30 times at 500 ms intervals but has no explicit tested UI result when the handshake ends without `lab:hello`.
- An iframe navigation can change its effective origin while the current probe source still reports its prior connection state. Messages from a changed origin must not be attributed to the prior target.

### Gaps introduced or exposed by the Astro host

- GQC-02B mounts the `dist/client/` static directory and the Astro handler before the legacy root static mount at `ws-server.js:138`. The `/app-config.json` shadow now depends on three mounts. If the Astro `publicDir` copies `app-config.json` into `dist/client/`, the Astro static mount also shadows the dynamic route.
- Astro hydrates islands with inline bootstrap scripts. Removing `unsafe-inline` from `script-src` breaks hydration unless the pinned Astro version emits CSP hashes or nonces that Express can apply.
- `astro dev` serves pages from its own server and port. CORS and CSP headers that Express sets do not apply to pages served by `astro dev` unless the dev proxy forwards them.
- The Lab toolbar, quick-launch chips, and capture controls are islands. A capture source created inside an island must be released when that island unmounts, not only when the target changes.
- The service workers `sw.js`, `public/sw.js`, and `sw-clm.js` can serve a stale page or configuration response after the Astro switch.

GQC-03 must verify live endpoint responses and every configuration consumer before it selects an endpoint shape or target policy.

## Work sequence

1. Inventory all readers of `app-config.json`, `/app-config.json`, `/api/config`, `labTargets`, WebSocket URL, P2P configuration, and target type. Record both root static mounts and their order relative to the dynamic route.
2. Capture current endpoint responses under the root and packaged server entry points.
3. Decide whether lab targets and runtime networking belong in one schema or separate endpoints. Record the owner and migration path.
4. Define target classes for SPA, MPA candidate, MCard `webapp`, probe fixture, blocked target, and custom target. Keep an undecided value until the Product Manager approves it.
5. Make the target registry the source for built-in chips, selector options, target type, and allowed origins.
6. Define how user-entered custom targets differ from approved targets. Do not treat a custom URL as approved by inserting it into a trusted registry.
7. Pass the approved origin policy into the capture factory. Reject unlisted cross-origin capture before recording starts.
8. Reject capture from blocked-target origins. Test that a target marked `blocked` does not widen CORS.
9. Record the effective CORS and CSP headers for each server variant. Have the security owner approve any policy change before it alters target compatibility.
10. Test an approved target without a probe agent as unavailable for capture, distinct from a frame-policy block.
11. Define a bounded handshake timeout. After it expires, show capture-unavailable, stop retrying, and release the source on target change.
12. Revalidate each new frame handshake after navigation. An unapproved redirect invalidates capture and cannot append events to the prior target run.
13. Test exact scheme, host, and port matching, including `localhost` and `127.0.0.1`.
14. Test events arriving during target switch. Discard or attribute them to the old run, never to the new target.
15. Give each capture source an explicit lifecycle. Destroy replaced sources and clear timers, listeners, callbacks, and nonces.
16. Preserve the `target-membrane.js` single-writer rule and the existing privacy behavior for input values.
17. Record all page sources and their order in `ws-server.js`: the Astro static mount, the Astro handler, the legacy root static mounts, and the dynamic configuration routes. Prove which source answers `/app-config.json`, `/api/config`, and `/api/env`.
18. Record the inline scripts Astro emits for each island directive in the pinned version. Choose one CSP path: Astro-emitted hashes or nonces applied by Express, or `unsafe-inline` kept with a recorded risk and owner.
19. Apply the same CORS and CSP headers to Astro prerendered pages, Astro handler responses, and legacy pages. Record how `astro dev` receives or approximates them.
20. Tie each capture source to the island that creates it. Release it on island unmount and on target change.
21. Declare every configuration call, target-load call, and probe handshake in `src/net/workbench-net.yaml` as request and result Transitions. Declare blocked, unavailable, and timeout states with a `recover` Transition. Run `check:net` in this PR.
22. Unregister workbench service workers on `localhost` and `127.0.0.1` and send `no-store` for configuration responses in development, or record why a worker must stay.

## Files in the implementation PR

- `app-config.json`
- `ws-server.js`
- `playwright.config.js`
- `astro.config.mjs`, limited to `publicDir`, CSP, and dev proxy header settings
- `src/pages/responsive-lab.astro` and the Lab islands under `src/islands/`, limited to registry-derived chips, target status, and capture-source ownership
- `src/net/workbench-net.yaml`, adding configuration Transitions and policy error Places
- `js/harness/lab-toolbar.js`
- `js/harness/target-membrane.js`
- `js/harness/membrane-interceptor.js`
- `js/harness/capture-probe-agent.js`
- `js/harness/recorder.js`
- Read-only input: `server/mcard-probe-policy.mjs` and its current `tests/single-page-mcard.test.mjs` coverage
- Read-only input: `js/harness/lab-probe-agent.js`, `tests/fixtures/probe-target.html`, and `tests/fixtures/probe-target-noagent.html`
- `responsive-lab.html`, only if GQC-02B kept a `legacy-static` fallback
- Tests under `tests/unit/` and `tests/features/`
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator after each approved policy decision

`playwright.config.js` follows the GQC-01 matcher changes. This PR changes only its test-server configuration. `js/harness/recorder.js` changes only for capture-source lifecycle. Record both files and their dependencies in the lane input manifest.

The quick-launch chips that were hardcoded in `responsive-lab.html` now live in the Astro page or a Lab island after GQC-02B. Derive them from the registry there. Do not reintroduce a second hardcoded list.

Keep the MCard external-portal probe policy separate from Responsive Lab capture authorization. If a change to `server/mcard-probe-policy.mjs` is required, stop and request a separate reviewed file boundary.

## BMAD responsibilities

### Analyst and Product Manager

- Decide which target types the product supports, including local custom targets.
- Approve user-visible blocked and unavailable states.
- Keep browser compatibility checks separate from authorization to capture.
- Approve the security owner and compatibility impact for any CORS or CSP change.

### Architect

- Define the endpoint schemas and their owners.
- Enforce [`INV-STU-01` and `INV-STU-02`](../../01-architecture/landing-page-architecture.md) without adding a second target registry.
- Keep target classification separate from the target's Page and Place and Transition graph.
- Keep source, origin, schema, message type, and nonce checks at the message boundary.
- Record the effective CORS and CSP policy for the selected server. Do not make a broad security-policy change without product and security review.
- Own the page-source order in `ws-server.js` and the CSP path for Astro island bootstrap scripts.
- Keep policy states in the workbench net as declared Places and Transitions, not as undeclared UI branches.

### TEA

- Add contract tests before changing route order or target behavior.
- Cover valid, invalid, blocked, unavailable, forged, stale, and cleanup states.
- Record rejected messages instead of silently dropping them.

### Dev

- Reuse `target-membrane.js`, `membrane-interceptor.js`, and `createTelemetryReceiver()`.
- Add explicit cleanup to the existing capture-source lifecycle.
- Keep sensitive input values redacted before they enter the recording buffer.

### UX Designer

- Review the blocked target message, capture-unavailable state, and custom-target affordance.
- Verify keyboard and screen-reader access to selector and status controls.

## Stories and acceptance criteria

### GQC-03.1 Define configuration contracts

- [x] Every configuration endpoint has a schema, owner, and list of consumers.
- [x] The test requests each endpoint from the selected server and validates the returned shape.
- [x] The root static file and dynamic route cannot silently claim the same contract.
- [x] Integration tests prove that both root static mounts and the dynamic route return the approved response for `/app-config.json`.
- [x] CORS behavior follows the approved registry contract.
- [x] Tests verify that blocked target origins are excluded from CORS.
- [x] The effective CSP is recorded for each supported server variant. Any policy change has an owner and a compatibility decision.
- [x] If no security owner is assigned, leave CSP unchanged, record the open risk, and escalate it to the Product Manager and operations owner.
- [x] Integration tests prove which mount answers `/app-config.json` with the Astro static mount, Astro handler, and legacy root mounts in their GQC-02B order.
- [x] Astro prerendered pages, Astro handler responses, and remaining legacy pages return the same CORS and CSP headers.
- [x] The chosen CSP path keeps every Lab island hydrating. A Playwright test fails if an island bootstrap script is blocked by CSP.
- [x] Each configuration fetch is a declared request Transition with `ok` and `fail` result Transitions in `workbench-net.yaml`, and `check:net` passes.

### GQC-03.2 Enforce the target-origin policy

- [x] Built-in options and quick-launch controls derive from the approved registry.
- [x] Target type, target URL, and Page graph identity remain separate fields.
- [x] An unknown custom URL remains custom until the approved policy allows it. It is not labeled or counted as an approved SPA.
- [x] A registered same-origin target remains loadable and capturable.
- [x] A registered cross-origin target requires a valid probe-agent handshake.
- [x] An unregistered cross-origin target cannot begin capture.
- [x] An approved target with no probe agent shows a capture-unavailable state distinct from a blocked-target state.
- [x] A target that remains silent through the bounded handshake timeout shows a distinct timeout reason and releases its retry timer.
- [x] A frame navigation to an unapproved origin clears the active capture state before any new event is accepted.
- [x] Custom targets are clearly distinguished and follow the approved policy.
- [x] The existing iframe sandbox and SSRF-guarded probe behavior remain intact.
- [x] Existing `/api/mcard/probe-url` checks still reject prohibited hosts, redirects, and unsafe framing policy.
- [x] A target marked blocked cannot add its origin to the CORS allowlist.
- [x] The security owner reviews the wildcard CSP and unsafe script directives before any policy tightening.
- [x] An origin mismatch, including `localhost` versus `127.0.0.1`, rejects the probe message.
- [x] Invalid or unapproved `?target=` values show a recoverable error and do not start capture.
- [x] An unclassified target may be previewed only when URL and frame policy allow it. Capture remains disabled until its type and origin are approved.
- [x] Events already queued at target switch are either discarded or stored with the old target identity.
- [x] Blocked, capture-unavailable, and handshake-timeout states are declared `error` Places or declared error states. Each has a `recover` Transition that a Playwright trace fires.

### GQC-03.3 Close capture-source lifecycles

- [x] Replacing a source removes its message and iframe listeners.
- [x] Replacing a source clears its timer, callback, receiver, and nonce.
- [x] Repeating target changes does not increase active listeners or timers.
- [x] Old sources cannot append events after a new source is active.
- [x] Unmounting the island that owns a capture source releases that source, even when the target has not changed.
- [x] Development runs on `localhost` do not receive pages or configuration from a stale service worker.

### GQC-03.4 Preserve privacy and protocol checks

- [x] Password and explicitly redacted inputs never appear in serialized test runs.
- [x] Wrong frame source, origin, schema, message type, or nonce is rejected and counted.
- [x] A blocked target shows a reason and does not report successful capture.
- [x] PenPot graph metadata cannot authorize a target origin or change its capture policy.

## Test design

| ID | Level | Scenario | Expected result |
| --- | --- | --- | --- |
| GQC-03-UNIT-01 | Unit | Validate each runtime and lab configuration payload | The validator accepts the agreed shape and rejects invalid fields. |
| GQC-03-UNIT-02 | Unit | Create capture source for an unlisted origin | The factory returns an unavailable source. |
| GQC-03-UNIT-03 | Unit | Replace a probe-agent source | The prior source removes listeners, timer, and nonce. |
| GQC-03-UNIT-04 | Unit | Load a blocked target from `labTargets` | Its origin is not added to the CORS allowlist. |
| GQC-03-UNIT-05 | Unit | Probe agent never sends `lab:hello` | The bounded timeout reports capture-unavailable and clears the retry timer. |
| GQC-03-INT-01 | Integration | Request configuration from each server variant | Each response matches the documented endpoint contract. |
| GQC-03-E2E-01 | E2E | Load an approved same-origin target | The selector, iframe, and capture state agree. |
| GQC-03-E2E-02 | E2E | Send forged and stale probe messages | The recorder rejects and counts them. |
| GQC-03-E2E-03 | E2E | Record a sensitive input | The stored value is redacted. |
| GQC-03-E2E-04 | E2E | Load an approved target with no probe agent | The UI shows capture unavailable, not a successful capture or frame-policy block. |
| GQC-03-E2E-05 | E2E | Redirect an instrumented target to an unapproved origin during recording | Capture stops, and no redirected-origin event enters the saved run. |
| GQC-03-E2E-06 | E2E | Switch targets while a message is in flight | The event is discarded or remains linked to the old target run. |
| GQC-03-INT-02 | Integration | Request `/app-config.json`, `/api/config`, and `/api/env` through the GQC-02B mount order | Each path returns its approved contract, and the answering mount is recorded. |
| GQC-03-INT-03 | Integration | Request one Astro prerendered page, one handler page, and one legacy page | All three return the same CORS and CSP headers. |
| GQC-03-E2E-07 | E2E | Load the Lab under the chosen CSP | Every island hydrates, and the console shows no CSP violation. |
| GQC-03-E2E-08 | E2E | Mount and unmount the capture island 50 times | Capture sources, listeners, and timers return to the starting count. |
| GQC-03-UNIT-06 | Unit | Replay a blocked-target trace through the workbench net | The trace reaches the error Place and fires `recover` without a disabled Transition. |

## Non-goals

- Do not allow arbitrary cross-origin capture because a URL is syntactically valid.
- Do not add a new general-purpose URL policy library.
- Do not remove the target membrane or existing message receiver.
- Do not merge all server configuration into one endpoint before consumer review.
- Do not change third-party frame policy without a product compatibility decision.
- Do not move configuration routes from Express to Astro endpoints in this sprint. GQC-05 owns server ownership.

## Open decisions

| Decision | Owner | Target sprint | State |
| --- | --- | --- | --- |
| Which target classes can be selected and captured, and which target type is the default? | Product Manager and Architect | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| May a custom local target capture events, and which origins may it use? | Product Manager | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| Should `labTargets` and WebSocket settings share an endpoint or use separate endpoints? | Architect | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| Which endpoint serves Responsive Lab runtime configuration in the root server? | Architect | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| What blocked-target message and recovery action should the UI show? | Product Manager and UX Designer | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| Which origin list authorizes cross-origin capture? | Architect and Product Manager | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| Which CSP directives are required for the workbench and target iframe, and who approves compatibility changes? | Architect, Product Manager, and security owner | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| What bounded handshake timeout and visible recovery message should the Lab use? | Product Manager, Architect, and UX Designer | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| If no security owner is available, who accepts the existing wildcard CSP risk? | Product Manager and operations owner | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| Does the pinned Astro version emit usable CSP hashes or nonces for island scripts, or does `unsafe-inline` stay with a recorded risk? | Architect and security owner | GQC-03 | Decided (`DECISIONS.tsv:bmad-security-and-config`) |
| Does the Astro `publicDir` include `app-config.json`, and which mount answers it? | Architect | GQC-03 | Decided (`DECISIONS.tsv:bmad-ports-and-publicdir`) |

## Definition of done

- [x] Record each decision in `DECISIONS.tsv` before changing the affected runtime path.
- [x] The Architect records one schema owner for every configuration endpoint.
- [x] The origin policy blocks unlisted cross-origin capture by default.
- [x] All replaced sources release their listeners and timers.
- [x] Unit, API, and Playwright tests cover every listed security and lifecycle state.
- [x] Existing ERB assertions remain intact or changes have an approved reason.
- [x] The UX Designer reviews changed target and status interactions.
- [x] Policy states and configuration calls are declared in the workbench net, and `check:net` passes.
- [x] Astro, handler, and legacy pages share one CORS and CSP policy, and islands hydrate under it.
- [ ] The operator approves the handoff to GQC-04.
