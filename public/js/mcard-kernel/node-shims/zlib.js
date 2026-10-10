/**
 * Browser shim for Node's `zlib`, aliased in at bundle time.
 *
 * The kernel's ZIP archive reader/writer (INV-CDO-08) uses the raw-deflate
 * synchronous helpers, which have no synchronous browser equivalent. None of
 * them belong to the browser code path, so each throws with a clear message
 * instead of failing obscurely.
 */
const unavailable = (name) => () => {
  throw new Error(`zlib shim: '${name}' is a Node-only API and is unavailable in the browser`);
};

export const inflateRawSync = unavailable('inflateRawSync');
export const deflateRawSync = unavailable('deflateRawSync');
export const inflateSync = unavailable('inflateSync');
export const deflateSync = unavailable('deflateSync');
// `crc32` is deliberately absent. The kernel guards it as `zlib.crc32 ? ... : 0`,
// so an undefined member takes the same fallback path it does on Node versions
// that do not expose it.
export default { inflateRawSync, deflateRawSync, inflateSync, deflateSync };
