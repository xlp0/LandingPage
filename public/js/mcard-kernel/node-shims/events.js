/** Browser shim for Node's `events` — a minimal EventEmitter. */
export class EventEmitter {
  constructor() { this._listeners = new Map(); }
  on(name, fn) { (this._listeners.get(name) ?? this._listeners.set(name, []).get(name)).push(fn); return this; }
  addListener(name, fn) { return this.on(name, fn); }
  once(name, fn) {
    const wrap = (...a) => { this.off(name, wrap); fn(...a); };
    return this.on(name, wrap);
  }
  off(name, fn) {
    const list = this._listeners.get(name);
    if (list) this._listeners.set(name, list.filter((f) => f !== fn));
    return this;
  }
  removeListener(name, fn) { return this.off(name, fn); }
  removeAllListeners(name) { if (name) this._listeners.delete(name); else this._listeners.clear(); return this; }
  emit(name, ...args) {
    for (const fn of this._listeners.get(name) ?? []) fn(...args);
    return (this._listeners.get(name) ?? []).length > 0;
  }
  listeners(name) { return [...(this._listeners.get(name) ?? [])]; }
}
export default EventEmitter;
