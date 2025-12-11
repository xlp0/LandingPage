/**
 * Reselect ESM Wrapper
 * Loads UMD build and exports as ESM
 */

import './reselect.umd.js';

// Export from global Reselect object
const Reselect = window.Reselect;

export const createSelector = Reselect.createSelector;
export const createSelectorCreator = Reselect.createSelectorCreator;
export const createStructuredSelector = Reselect.createStructuredSelector;
export const defaultMemoize = Reselect.defaultMemoize;

export default Reselect;
