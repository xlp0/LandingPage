/**
 * Redux Thunk ESM Wrapper
 * Loads UMD build and exports as ESM
 */

import './redux-thunk.umd.js';

// Export from global ReduxThunk object (UMD exports the function directly)
const thunk = window.ReduxThunk;

export default thunk;
export { thunk };
