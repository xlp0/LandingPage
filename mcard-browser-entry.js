
// Browser-compatible exports from mcard-js
// Use direct file paths to bypass package.json exports restrictions
export { MCard } from './node_modules/mcard-js/dist/model/MCard.js';
export { GTime } from './node_modules/mcard-js/dist/model/GTime.js';
export { CardCollection } from './node_modules/mcard-js/dist/model/CardCollection.js';
export { ContentHandle, validateHandle, HandleValidationError } from './node_modules/mcard-js/dist/model/Handle.js';
export { IndexedDBEngine } from './node_modules/mcard-js/dist/storage/IndexedDBEngine.js';
export { ContentTypeInterpreter } from './node_modules/mcard-js/dist/model/detectors/ContentTypeInterpreter.js';
export { HashValidator } from './node_modules/mcard-js/dist/hash/HashValidator.js';
export { Maybe } from './node_modules/mcard-js/dist/monads/Maybe.js';
