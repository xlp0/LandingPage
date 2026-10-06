/**
 * Browser shim for Node's `fs`, aliased in at bundle time.
 *
 * The published clm-kernel ESM entry pulls in Node file-system code paths. None
 * of them belong to the browser code path, so every member throws with a clear
 * message instead of failing obscurely or silently returning a wrong value.
 */
const unavailable = (name) => () => {
  throw new Error(`fs shim: '${name}' is a Node-only API and is unavailable in the browser`);
};

export const readFileSync = unavailable('readFileSync');
export const writeFileSync = unavailable('writeFileSync');
export const existsSync = () => false;
export const mkdirSync = unavailable('mkdirSync');
export const readdirSync = () => [];
export const statSync = unavailable('statSync');
export const rmSync = unavailable('rmSync');
export const promises = new Proxy({}, { get: (_t, p) => unavailable(String(p)) });
export default { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, promises };
