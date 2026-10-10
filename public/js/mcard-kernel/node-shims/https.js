/** Browser shim for Node's `https` — networking is unavailable in the browser. */
const unavailable = (name) => () => {
  throw new Error(`https shim: '${name}' is a Node-only API and is unavailable in the browser`);
};
export const createServer = unavailable('createServer');
export const request = unavailable('request');
export const get = unavailable('get');
export default { createServer, request, get };
