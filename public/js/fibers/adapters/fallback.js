/**
 * The fallback fiber — renders a card whose kind is not declared.
 *
 * This is a display guarantee, not a claim that the card's semantics are
 * understood: the descriptor is marked `unclassified` so the surface must label
 * it rather than presenting it as if a real fiber had rendered it.
 *
 * It is itself a declared fiber, subject to the same coeffect and revertibility
 * rules as any other. The adapter is handed a **scoped effect handle**, never a
 * disposable list: `FiberLifecycle` exposes two lists — `fiber.disposables`
 * (unwound by unload) and a load-time `guard.disposables` (the savepoint rollback
 * list, not unwound by a successful unload) — and registering in the wrong one
 * used to leak silently. Declaring through `scope.onDispose` makes that
 * impossible rather than merely detected.
 */
import { toDescriptor, applyDescriptor, payloadText } from './_descriptor.js';

export const kind = 'unknown';
export const coeffects = { requiredServices: [], requiredCapabilities: [] };

export function mount(card, host, scope, ctx = {}) {
  const d = {
    ...toDescriptor('unknown', card, { ...ctx, fallback: true }),
    mode: 'fallback',
    unclassified: true,
    label: 'Unclassified card',
    resolvedKind: ctx.resolvedKind ?? 'unknown',
    sizeBytes: payloadText(card).length,
    text: payloadText(card),
  };
  const el = applyDescriptor(d, host);
  // The inverse is declared to the runtime, which holds it.
  scope.onDispose(() => {
    if (el && el.remove) el.remove();
    ctx.onDispose?.();
  });
  return d;
}
