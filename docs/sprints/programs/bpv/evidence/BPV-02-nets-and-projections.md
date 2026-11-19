# BPV-02 nets and projections evidence

| Field | Value |
| --- | --- |
| Audience | BPV sprint owners and reviewers |
| BMAD Owner | Architect with Developer and TEA |
| Source of Truth | [SPRINT-BPV-02](../SPRINT-BPV-02-net-core-and-generated-projections.md), `scripts/gen-bombadil-nets.mjs`, `src/net/net-core.mjs` |
| Status | Complete on 2026-11-17 |

## What changed

| Item | Result |
| --- | --- |
| Pure net core | `src/net/net-core.mjs` owns `stripQuery`, `resolvePlaceForUrl` and `navArcs`. It imports nothing from Playwright or `clm-kernel`. `tests/fixtures/net-trace.js` imports it and the duplicate copy is deleted. |
| Golden test | `tests/unit/net-core.test.mjs` resolves every declared page and view route, every route alias and every query-flagged view, rejects undeclared paths and non-HTTP URLs, and verifies the core resolver against `tests/fixtures/net-core-golden.json`. |
| Recorder table | `RECORDER_TRANSITIONS` in `js/harness/recording-state-machine.js` lists each action with its legal source states and destination. The class guards read the table through `_require(action)`, and `tests/unit/recording-state-machine.test.mjs` passes unchanged. |
| History policy | A Back or Forward step may move along the reverse of a navigation arc the run already fired. The generator emits those as `HISTORY_ARCS` with `history:<transitionId>` ids, and `js/harness/page-state.js` (`restoreCrossDocumentFiring`) emits `history:${reverseMatches[0].transitionId}` on reverse cross-document arrivals. The net is unchanged. |
| Generator | `scripts/gen-bombadil-nets.mjs` writes `tests/bombadil/generated/workbench-net.ts` with `NET_ID`, `PLACES`, `ARCS`, `HISTORY_ARCS`, `ENTRY_URLS`, `ALLOW_URLS`, and `RECORDER_TRANSITIONS`. `--check` (`npm run check:bombadil-nets`) fails on a stale file, unknown `scope.json` place, or broken `triggerSource` (`selector` or `call`). |
| Trigger format | 19 transitions initially (now 21 post-remediation, including `t_link_viewer_to_docs` and `t_link_docs_to_index`) replaced `file:line` with `triggerSource.file` and a stable `selector` (and `triggerDrift()` supports both `selector` and `call`). The generator fails when a `selector` or `call` is missing from its file. |
| Net correction | The portal's Mission Control link was removed in BPV-01, so `t_link_viewer_to_app` was deleted rather than left as a dead declaration. The net is now 32 places and 66 transitions. |
| Docs | `npm run docs:gen-net` regenerated `docs/01-architecture/workbench-net.md` at 32 places and 66 transitions. |

## Verification

| Command | Result |
| --- | --- |
| `node --test tests/unit/net-core.test.mjs tests/unit/bombadil-nets.test.mjs` | PASS, 13 tests |
| `node --test tests/unit/recording-state-machine.test.mjs tests/unit/net-trace-replay.test.mjs` | PASS, 8 tests |
| `npm run check:bombadil-nets` | PASS |
| `npm run check:net` | PASS, 32 places, 66 transitions, session invariant holds |
| `npm run docs:check` | PASS |

## Limits

- A stale GitNexus index was used for the impact step. The callers of `resolvePlaceForUrl` and `RecordingStateMachine` were traced from source instead, and the recorded limitation is the same one the GQC plan names.
- The generated module is TypeScript because the Bombadil spec imports `.ts` paths. Node strips the types at import time, so no build step is needed for the spec.
