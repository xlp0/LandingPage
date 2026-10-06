/**
 * The fiber registry and dispatcher (CDO-11).
 *
 * Theoretical grounding — *A Programming Paradigm for Spatiotemporal
 * Composability* (arXiv:2608.25512):
 *
 *   - A fiber adapter is a **component** in the paper's sense: it declares a
 *     **coeffect specification** (the services and capabilities it needs) as
 *     data, and the runtime drives its activation and deactivation from that
 *     declaration. This is what makes extensibility spatial rather than a
 *     convention.
 *   - Mounting is a **revertible effect**: the adapter registers its inverse
 *     with the fiber and the runtime holds it, so disposal is guaranteed rather
 *     than remembered.
 *   - Dispatch is **configuration reconciliation** against the registry's
 *     `fibers[]`, never a per-kind branch in this file.
 *
 * Kernel detail this depends on: `FiberLifecycle` has two disposable lists.
 * `fiber.disposables` (active phase) is unwound by `unload()`. The `load`
 * callback's `guard.disposables` is the *savepoint rollback* list and is NOT
 * unwound by a successful unload — registering there leaks silently.
 */
import { FiberLifecycle } from 'clm-kernel';
// the module namespace is itself an adapter (kind, coeffects, mount)
import * as fallbackAdapter from './adapters/fallback.js';

const ADAPTERS = {
  'scalar/value': () => import('./adapters/scalar-value.js'),
  'text/plain': () => import('./adapters/text-plain.js'),
  'text/markup': () => import('./adapters/text-markup.js'),
  'text/markdown': () => import('./adapters/text-markdown.js'),
  'text/script': () => import('./adapters/text-script.js'),
  'text/style': () => import('./adapters/text-style.js'),
  'text/data': () => import('./adapters/text-data.js'),
  'structured/data': () => import('./adapters/structured-data.js'),
  'structured/triad': () => import('./adapters/structured-triad.js'),
  'binary/image': () => import('./adapters/binary-image.js'),
  'binary/audio': () => import('./adapters/binary-audio.js'),
  'binary/3d': () => import('./adapters/binary-3d.js'),
  'binary/octet': () => import('./adapters/binary-octet.js'),
  'satori/message': () => import('./adapters/satori-message.js'),
  'executable/pcard': () => import('./adapters/executable-pcard.js'),
};

/** The adapter loader is a lookup keyed by kind. It contains no kind branch. */
export function adapterLoaderFor(kind) {
  return ADAPTERS[kind] ?? null;
}

/**
 * The scoped effect handle handed to an adapter.
 *
 * This is the fix for the two-disposable-list hazard. `FiberLifecycle` exposes
 * `fiber.disposables` (unwound by `unload`) and a `load`-time `guard.disposables`
 * (the savepoint rollback list, *not* unwound by a successful unload). Registering
 * in the wrong one leaked silently — no error, the cleanup simply never ran.
 *
 * Rather than document a convention, the adapter is no longer given either list.
 * It declares inverses through `onDispose`, and the runtime registers them on the
 * correct list itself. An adapter *cannot* leak, because there is only one place
 * to register and the runtime owns it.
 */
export function makeEffectScope(kind, meta, inverses) {
  return Object.freeze({
    kind,
    fallback: meta.fallback,
    /** Read-only view of the fiber. The lifecycle itself is not exposed. */
    fiber: Object.freeze({ id: `fiber:${kind}`, kind }),
    /** Declare an inverse. The runtime will hold it and run it on unload. */
    onDispose(fn) {
      if (typeof fn !== 'function') throw new TypeError('onDispose expects a function');
      inverses.push(fn);
    },
    /** How many inverses have been declared so far. */
    get inverseCount() { return inverses.length; },
  });
}

export class FiberRegistry {
  /**
   * @param {object} registry the parsed `clm-registry.yaml`
   * @param {object} options  `{ mount }` — the host mount function
   */
  /**
   * @param {object} registry the parsed `clm-registry.yaml`
   * @param {object} options  `{ ctx }` — the Cordis Context that resolves
   *   declared coeffects. A component that declares a coeffect the context
   *   cannot satisfy must not activate; that is the paper's spatial
   *   composability, enforced by the kernel rather than by convention.
   */
  constructor(registry, options = {}) {
    this.fibers = registry.fibers ?? [];
    this.islands = registry.islands ?? [];
    this.ctx = options.ctx ?? null;
    this.mounted = new Map(); // kind -> FiberLifecycle
    this.scopes = new Map();  // kind -> scoped effect handle
    this.exercised = new Set(); // kinds that have rendered at least once
    this.mountCounts = new Map(); // kind -> mounts observed
  }

  /** The declared fiber for a kind, or undefined. Pure data lookup. */
  fiberFor(kind) {
    return this.fibers.find((f) => f.kind === kind);
  }

  /** Resolves a card's kind to a fiber, falling back when undeclared. */
  /** Kinds whose declared coeffects are not satisfied by the current context. */
  unresolvedKinds() {
    const out = [];
    for (const f of this.fibers) {
      const loader = adapterLoaderFor(f.kind);
      if (!loader) continue;
      const needed = COEFFECT_SERVICES[f.kind] ?? [];
      if (needed.length && !this.ctx) out.push(f.kind);
    }
    return out;
  }

  resolve(cardKind) {
    const declared = this.fiberFor(cardKind);
    if (declared) return { fiber: declared, fallback: false };
    return { fiber: this.fiberFor('unknown') ?? FALLBACK_FIBER, fallback: true };
  }

  /**
   * Mounts a card. The fiber's declared lifecycle is honoured: the adapter is
   * activated inside `FiberLifecycle`, and its inverse is registered on
   * `fiber.disposables` so `unmount` is guaranteed to unwind it.
   */
  async mountCard(card, host, kind) {
    const { fiber, fallback } = this.resolve(kind);
    const loader = fallback ? null : adapterLoaderFor(kind);
    // the module namespace *is* the adapter: it exports kind, coeffects and mount
    const adapter = loader ? await loader() : fallbackAdapter;

    const lifecycle = new FiberLifecycle(`fiber:${kind}`, {
      requiredServices: adapter.coeffects?.requiredServices ?? [],
      requiredCapabilities: adapter.coeffects?.requiredCapabilities ?? [],
    });

    const trace = [];
    lifecycle.onTransition((e) => trace.push(`${e.from}->${e.to}`));

    // Coeffects are resolved against the Cordis Context here. With no context,
    // only zero-coeffect fibers can activate — the kernel enforces this.
    await lifecycle.load(async () => {}, this.ctx ? { ctx: this.ctx } : undefined);
    // The runtime holds the inverse, per the paper: the adapter is given a
    // scoped handle that records inverses, never a disposable list. It is
    // therefore *impossible* for an adapter to register in the wrong place —
    // there is only one place, and the runtime owns it.
    const inverses = [];
    const scope = makeEffectScope(kind, { fallback, fiber }, inverses);

    await lifecycle.activate(async () => {
      adapter.mount(card, host, scope, { fallback, fiber });
      // registered inside the active phase, so unload() unwinds it
      lifecycle.disposables.add(() => {
        for (const fn of inverses.splice(0).reverse()) {
          try { fn(); } catch (e) { /* one failing inverse must not strand the rest */ }
        }
      });
    });

    this.mounted.set(kind, lifecycle);
    this.scopes.set(kind, scope);
    this.exercised.add(kind);
    this.mountCounts.set(kind, (this.mountCounts.get(kind) ?? 0) + 1);
    return { lifecycle, adapter, trace, fallback, scope };
  }

  /** Unloads a fiber; the runtime unwinds whatever the adapter registered. */
  async unmountCard(kind) {
    const lifecycle = this.mounted.get(kind);
    if (!lifecycle) return null;
    await lifecycle.unload();
    this.mounted.delete(kind);
    this.scopes.delete(kind);
    return lifecycle.state;
  }

  /**
   * The fiber inspector's data (DV-11-06).
   *
   * Everything here is read from the registry and the runtime's own records —
   * there is no second list of fibers to drift out of step. A fiber that has
   * never rendered is marked `exercised: false` rather than shown as healthy,
   * because "declared" and "working" are different claims.
   */
  inspectorReport() {
    const exercised = this.exercised;
    return {
      fibers: this.fibers.map((f) => ({
        kind: f.kind,
        payload_shape: f.payload_shape,
        renderer: f.renderer,
        isolation: f.isolation,
        budget: f.budget,
        exercised: exercised.has(f.kind),
        mountCount: this.mountCounts.get(f.kind) ?? 0,
        coeffectsSatisfied: !(COEFFECT_SERVICES[f.kind] ?? []).length || Boolean(this.ctx),
        currentlyMounted: this.mounted.has(f.kind),
      })),
      totals: {
        declared: this.fibers.length,
        exercised: exercised.size,
        neverExercised: this.fibers.filter((f) => !exercised.has(f.kind)).map((f) => f.kind),
        unresolvedCoeffects: this.unresolvedKinds(),
      },
    };
  }

  /** Observation of the whole fiber set: used for observational equivalence. */
  observe() {
    return {
      mounted: [...this.mounted.keys()].sort(),
      disposables: Object.fromEntries(
        [...this.mounted.entries()].map(([k, f]) => [k, f.disposables?.size ?? 0]),
      ),
      declaredInverses: Object.fromEntries(
        [...this.scopes.entries()].map(([k, s]) => [k, s.inverseCount]),
      ),
    };
  }
}

/**
 * The services each adapter declares. Kept here so the registry can report which
 * fibers are unsatisfiable without importing every adapter.
 */
export const COEFFECT_SERVICES = {
  'text/script': ['highlighter'],
  'binary/audio': ['media'],
  'binary/3d': ['renderer'],
};

/** The fallback fiber is itself a declared fiber, subject to the same rules. */
export const FALLBACK_FIBER = {
  kind: 'unknown',
  payload_shape: 'unknown',
  content_class: 'unknown',
  renderer: 'fibers/adapters/fallback.js',
  isolation: 'inline',
  budget: { archetype: 'wearable', max_bytes: 0 },
  mount_points: [],
};
