/**
 * Fiber adapter: text/style  (payload shape text, content class style)
 *
 * A component in the sense of *A Programming Paradigm for Spatiotemporal
 * Composability* (arXiv:2608.25512): it declares a **coeffect specification**
 * as data and registers a **revertible effect** with the fiber, so the runtime
 * holds the inverse rather than trusting the adapter to remember.
 *
 * Cleanup MUST be registered on `fiber.disposables` during the active phase.
 * The `load` callback's `guard.disposables` is the savepoint rollback list and
 * is not unwound by a successful unload.
 */
import { toDescriptor, applyDescriptor } from './_descriptor.js';

export const kind = 'text/style';
export const coeffects = {
  requiredServices: [],
  requiredCapabilities: [],
};

export function mount(card, host, fiber, ctx = {}) {
  const d = toDescriptor(kind, card, ctx);
  const el = applyDescriptor(d, host);
  // the inverse the runtime will hold
  fiber.disposables.add(() => {
    if (el && el.remove) el.remove();
    ctx.onDispose?.();
  });
  return d;
}
