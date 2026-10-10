/**
 * Browser shim for Node's `url`.
 *
 * The kernel parses instance URLs (`new url.URL(...)`), which is pure string
 * work the browser provides natively. Only the members the kernel uses are
 * implemented; anything else throws rather than returning a wrong value.
 */
export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;
export default { URL, URLSearchParams };
