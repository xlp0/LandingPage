/**
 * Redux ESM Wrapper
 * Loads UMD build and exports as ESM
 * No external dependencies - fully self-contained
 */

import './redux.umd.js';

// Export from global Redux object created by UMD
const Redux = window.Redux;

export const createStore = Redux.createStore;
export const combineReducers = Redux.combineReducers;
export const bindActionCreators = Redux.bindActionCreators;
export const applyMiddleware = Redux.applyMiddleware;
export const compose = Redux.compose;
export const __DO_NOT_USE__ActionTypes = Redux.__DO_NOT_USE__ActionTypes;

export default Redux;
