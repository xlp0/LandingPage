/**
 * The fallback fiber — renders a card whose kind is not declared.
 *
 * This is a display guarantee, not a claim that the card's semantics are
 * understood: the descriptor is marked `unclassified` so the surface must label
 * it rather than presenting it as if it were rendered by a real fiber.
 *
 * It is itself a declared fiber, subject to the same coeffect and revertibility
 * rules as any other.
 */
import { toDescriptor, applyDescriptor, payloadText } from './_descriptor.js';

export const kind = 'unknown';
export const coeffects = { requiredServices: [], requiredCapabilities: [] };

export function mount(card, host, fiber, ctx = {}) {
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
  fiber.disposables.add(() => { if (el?.remove) el.remove(); ctx.onDispose?.(); });
  return d;
}
