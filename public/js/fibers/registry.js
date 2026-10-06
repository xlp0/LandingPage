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
    await lifecycle.activate(async () => {
      adapter.mount(card, host, lifecycle, { fallback, fiber });
    });

    this.mounted.set(kind, lifecycle);
    return { lifecycle, adapter, trace, fallback };
  }

  /** Unloads a fiber; the runtime unwinds whatever the adapter registered. */
  async unmountCard(kind) {
    const lifecycle = this.mounted.get(kind);
    if (!lifecycle) return null;
    await lifecycle.unload();
    this.mounted.delete(kind);
    return lifecycle.state;
  }

  /** Observation of the whole fiber set: used for observational equivalence. */
  observe() {
    return {
      mounted: [...this.mounted.keys()].sort(),
      disposables: Object.fromEntries(
        [...this.mounted.entries()].map(([k, f]) => [k, f.disposables?.size ?? 0]),
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
