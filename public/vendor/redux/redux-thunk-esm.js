/**
 * Redux Thunk ESM Wrapper
 * Loads UMD build and exports as ESM
 */

import './redux-thunk.umd.js';

// Export from global ReduxThunk object
const thunk = window.ReduxThunk.default;

export default thunk;
export { thunk };
