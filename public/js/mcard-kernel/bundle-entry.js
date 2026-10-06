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

/**
 * The context paradigm's runtime, re-exported so the browser can resolve it.
 *
 * `clm-kernel`'s FiberLifecycle takes a Cordis `Context` to resolve declared
 * coeffects, so a browser surface that mounts fibers needs the same Context type
 * the kernel expects. Bundling it here keeps the import map to a single entry
 * rather than requiring `cordis` and its own transitive bare specifiers to be
 * mapped individually.
 */
export { Context, Service } from 'cordis';

/**
 * The kernel's fiber lifecycle, re-exported for the same reason: the browser
 * dispatcher mounts every fiber through it, so the bundle must carry the exact
 * class the kernel uses rather than a second copy.
 */
export { FiberLifecycle } from 'clm-kernel';
