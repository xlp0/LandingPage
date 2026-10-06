/** Browser shim for Node's `dgram` — UDP sockets are unavailable in the browser. */
const unavailable = (name) => () => {
  throw new Error(`dgram shim: '${name}' is a Node-only API and is unavailable in the browser`);
};
export const createSocket = unavailable('createSocket');
export default { createSocket };
