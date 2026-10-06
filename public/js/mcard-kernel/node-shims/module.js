/**
 * Browser shim for Node's `module`, aliased in at bundle time.
 *
 * `createRequire` exists in the kernel only to resolve Node-only packages. In
 * the browser there is nothing to require, so it throws rather than returning a
 * stub that would mask a real mistake.
 */
export function createRequire() {
  return () => {
    throw new Error('module shim: createRequire() is unavailable in the browser');
  };
}
export default { createRequire };
