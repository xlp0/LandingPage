/**
 * Fiber adapter: binary/audio  (payload shape binary, content class audio)
 *
 * A component in the sense of *A Programming Paradigm for Spatiotemporal
 * Composability* (arXiv:2608.25512): it declares a **coeffect specification**
 * as data and registers a **revertible effect** with the fiber, so the runtime
 * holds the inverse rather than trusting the adapter to remember.
 *
 * The adapter is handed a **scoped effect handle**, never a disposable list.
 * `FiberLifecycle` exposes two lists — `fiber.disposables` (unwound by unload)
 * and a load-time `guard.disposables` (the savepoint rollback list, not unwound
 * by a successful unload) — and registering in the wrong one used to leak
 * silently. The adapter now declares inverses through `scope.onDispose` and the
 * runtime registers them, so a leak is impossible rather than merely detected.
 */
import { toDescriptor, applyDescriptor } from './_descriptor.js';

export const kind = 'binary/audio';
export const coeffects = {
  requiredServices: ['media'],
  requiredCapabilities: [],
};

export function mount(card, host, scope, ctx = {}) {
  const d = toDescriptor(kind, card, ctx);
  const el = applyDescriptor(d, host);
  // The inverse is declared to the runtime, which holds it. The adapter is never
  // given a disposable list, so it cannot register in the wrong one.
  scope.onDispose(() => {
    if (el && el.remove) el.remove();
    ctx.onDispose?.();
  });
  return d;
}
