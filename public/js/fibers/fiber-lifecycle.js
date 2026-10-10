/**
 * Neutral FiberLifecycle implementation for LandingPage (INV-PKG-10, INV-PKG-11).
 *
 * Implements the component activation lifecycle and revertible effect management
 * without external dependency on clm-kernel.
 */

export class DisposableList {
  constructor() {
    this._disposables = [];
  }

  push(fn) {
    if (typeof fn !== 'function' && (!fn || typeof fn.dispose !== 'function')) {
      throw new TypeError('Disposable must be a function or an object with a dispose() method');
    }
    this._disposables.push(fn);
  }

  async unwind() {
    while (this._disposables.length > 0) {
      const d = this._disposables.pop();
      try {
        if (typeof d === 'function') {
          await d();
        } else if (typeof d.dispose === 'function') {
          await d.dispose();
        }
      } catch (e) {
        console.warn('[FiberLifecycle] Error during disposable unwind:', e);
      }
    }
  }

  get length() {
    return this._disposables.length;
  }
}

export class FiberLifecycle {
  constructor(id, options = {}) {
    this.id = id;
    this.coeffects = {
      requiredServices: options.requiredServices ?? [],
      requiredCapabilities: options.requiredCapabilities ?? [],
    };
    this.state = 'pending';
    this.listeners = [];
    this._disposables = new DisposableList();
    this.guard = { disposables: new DisposableList() };
  }

  get disposables() {
    return this._disposables;
  }

  onTransition(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
  }

  _transition(to) {
    const from = this.state;
    this.state = to;
    for (const fn of this.listeners) {
      try {
        fn({ from, to, timestamp: Date.now() });
      } catch (e) {
        console.warn('[FiberLifecycle] Transition listener error:', e);
      }
    }
  }

  async load(fn, opts = {}) {
    this._transition('loading');
    try {
      if (fn) await fn(this.guard);
      this._transition('loaded');
    } catch (err) {
      this._transition('error');
      await this.guard.disposables.unwind();
      throw err;
    }
  }

  async activate(fn) {
    this._transition('active');
    try {
      if (fn) await fn();
    } catch (err) {
      this._transition('error');
      await this._disposables.unwind();
      throw err;
    }
  }

  async unload() {
    this._transition('unloading');
    await this._disposables.unwind();
    this._transition('unloaded');
  }
}
