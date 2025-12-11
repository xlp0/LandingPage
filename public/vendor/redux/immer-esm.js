/**
 * Immer ESM Wrapper
 * Loads UMD build and exports as ESM
 */

import './immer.umd.js';

// Export from global immer object
const immer = window.immer;

export default immer.produce;
export const produce = immer.produce;
export const enableES5 = immer.enableES5;
export const enableMapSet = immer.enableMapSet;
export const enablePatches = immer.enablePatches;
export const enableAllPlugins = immer.enableAllPlugins;
export const setAutoFreeze = immer.setAutoFreeze;
export const setUseProxies = immer.setUseProxies;
export const applyPatches = immer.applyPatches;
export const castDraft = immer.castDraft;
export const castImmutable = immer.castImmutable;
export const createDraft = immer.createDraft;
export const current = immer.current;
export const finishDraft = immer.finishDraft;
export const freeze = immer.freeze;
export const immerable = immer.immerable;
export const isDraft = immer.isDraft;
export const isDraftable = immer.isDraftable;
export const nothing = immer.nothing;
export const original = immer.original;
export const produceWithPatches = immer.produceWithPatches;
