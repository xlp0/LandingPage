/**
 * Browser-only bundle entry point for mcard-js
 * Excludes Node.js-specific modules
 */

// Core models (browser-safe)
export { MCard } from './node_modules/mcard-js/dist/model/MCard.js';
export { CardCollection } from './node_modules/mcard-js/dist/model/CardCollection.js';
export { ContentHandle, validateHandle, HandleValidationError } from './node_modules/mcard-js/dist/model/Handle.js';
export { GTime } from './node_modules/mcard-js/dist/model/GTime.js';
export { ContentTypeInterpreter } from './node_modules/mcard-js/dist/model/detectors/ContentTypeInterpreter.js';

// Browser storage (IndexedDB only)
export { IndexedDBEngine } from './node_modules/mcard-js/dist/storage/IndexedDBEngine.js';

// Hash utilities
export { HashValidator } from './node_modules/mcard-js/dist/hash/HashValidator.js';

// Monads (browser-safe)
export { Maybe } from './node_modules/mcard-js/dist/monads/Maybe.js';
export { Either } from './node_modules/mcard-js/dist/monads/Either.js';
export { IO } from './node_modules/mcard-js/dist/monads/IO.js';
export { Reader } from './node_modules/mcard-js/dist/monads/Reader.js';
export { Writer } from './node_modules/mcard-js/dist/monads/Writer.js';
export { State } from './node_modules/mcard-js/dist/monads/State.js';
