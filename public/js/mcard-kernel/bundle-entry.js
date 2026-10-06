/**
 * Browser bundle entry — published clm-kernel plus the local compatibility layer.
 *
 * Exports the names the view layer imports, mapped onto the kernel:
 *   MCard, CardCollection, ContentTypeInterpreter, validateHandle,
 *   HandleValidationError, GTime, IndexedDBEngine (→ IndexedDBBackend)
 *
 * Names the kernel provides directly are re-exported as-is; names it does not
 * are supplied by ./compat.js, which adapts to the kernel rather than
 * reimplementing MCard semantics.
 *
 * The former bundle also exported ContentHandle, HashValidator and six monads
 * (Maybe, Either, IO, Reader, Writer, State). A repo-wide search found zero
 * import sites for any of them, so they are not carried forward.
 */
export {
  MCard,
  CardCollection,
  ContentTypeInterpreter,
  validateHandle,
  HandleValidationError,
  GTime,
  MCardCollection,
  ContentHash,
  detectMime,
  classifyClm,
} from './compat.js';

export { IndexedDBBackend as IndexedDBEngine } from './indexeddb-backend.js';
