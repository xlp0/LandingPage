import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as child_process from 'child_process';
import * as util from 'util';
import { LLMRuntime } from '../llm/LLMRuntime.js';
import { OllamaProvider } from '../llm/providers/OllamaProvider.js';
import { SqliteNodeEngine } from '../../storage/SqliteNodeEngine.js';
import { CardCollection } from '../../model/CardCollection.js';
import { MCard } from '../../model/MCard.js';
import { NetworkRuntime } from './NetworkRuntime.js';
import { LambdaRuntime } from '../lambda/LambdaRuntime.js';
import { computeTimingMetrics, extractLoaderParams, findProjectRoot, listFiles } from './FileSystemUtils.js';
const execFile = util.promisify(child_process.execFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
export class JavaScriptRuntime {
    async execute(code, context, config) {
        // Detect if code needs Node.js features not available in VM sandbox
        if (code.includes('require(') || code.includes('import(') || code.includes('import ') || code.includes('export ')) {
            return this.executeSubprocess(code, context);
        }
        const sandbox = {
            context,
            target: context,
            result: undefined,
            console: {
                log: (...args) => console.log('[JS]', ...args),
                error: (...args) => console.error('[JS]', ...args),
                warn: (...args) => console.warn('[JS]', ...args),
            },
            Math,
            JSON,
            Date,
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            process: process, // Expose process for PID management
            spawn: child_process.spawn, // Expose spawn for background agents
            exec: child_process.exec, // Expose exec for commands
            // Network capabilities
            fetch: global.fetch ? global.fetch.bind(global) : undefined,
            Headers: global.Headers,
            Request: global.Request,
            Response: global.Response,
            URL: global.URL,
            URLSearchParams: global.URLSearchParams,
        };
        const codeRunnable = code + '\nresult;';
        const script = new vm.Script(codeRunnable);
        const vmContext = vm.createContext(sandbox);
        const executionResult = script.runInContext(vmContext, { timeout: 5000 });
        return sandbox.result !== undefined ? sandbox.result : executionResult;
    }
    async executeSubprocess(code, context) {
        const contextStr = JSON.stringify(context);
        const projectRoot = findProjectRoot(); // Use existing utility
        // Wrapper script to inject context and capture result
        const wrapper = `
const process = require('process');
const context = JSON.parse(process.argv[2]);
// Expose context and result to user code scope
global.context = context;
let result;

(async () => {
    try {
        ${code}
        console.log(JSON.stringify(result));
    } catch (e) {
        console.error(JSON.stringify({ error: e.message, stack: e.stack }));
        process.exit(1);
    }
})();
`;
        const tmpFile = path.resolve(projectRoot, `tmp_js_${Date.now()}.js`);
        await writeFile(tmpFile, wrapper);
        try {
            // Use 'node' directly. 'tsx' is preferred if we were using TS features, 
            // but we are generating JS. 
            // We rely on standard Node.js support for imports/requires.
            const { stdout, stderr } = await execFile('node', [tmpFile, contextStr], {
                cwd: projectRoot,
                env: { ...process.env }
            });
            if (stderr && stderr.trim()) {
                // Check if stderr is JSON error from our wrapper
                try {
                    const errObj = JSON.parse(stderr.trim());
                    if (errObj.error)
                        throw new Error(errObj.error);
                }
                catch (e) {
                    // Not JSON, just log if verbose or ignore if just warnings
                    // console.error('[JS Subprocess Stderr]', stderr);
                }
            }
            try {
                return JSON.parse(stdout.trim());
            }
            catch (e) {
                return stdout.trim();
            }
        }
        catch (error) {
            const stderr = error.stderr ? `\nStderr: ${error.stderr.toString()}` : '';
            // Try to parse error from stderr if it matches our wrapper format
            try {
                const errObj = JSON.parse(error.stderr.toString().trim());
                if (errObj.error)
                    throw new Error(errObj.error);
            }
            catch { }
            throw new Error(`JavaScript execution failed: ${error.message}${stderr}`);
        }
        finally {
            await unlink(tmpFile);
        }
    }
}
export class CollectionLoaderRuntime {
    /**
     * Collection loader runtime: ingest files into a CardCollection and return a normalized ingest report.
     */
    async execute(_code, context, config) {
        const crypto = await import('crypto');
        const ctx = context;
        const loaderParams = extractLoaderParams(ctx, {
            sourceDir: 'chapters/chapter_04_load_dir/test_data',
            dbPath: 'data/loader_clm.db',
        });
        const { sourceDir, recursive, dbPath = 'data/loader_clm.db' } = loaderParams;
        // Find project root (same heuristic as LoaderRuntime)
        const projectRoot = findProjectRoot();
        const sourcePath = path.isAbsolute(sourceDir) ? sourceDir : path.join(projectRoot, sourceDir);
        if (!fs.existsSync(sourcePath)) {
            return { success: false, error: `Source directory not found: ${sourceDir}` };
        }
        const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(projectRoot, dbPath);
        try {
            const engine = new SqliteNodeEngine(resolvedDbPath);
            const collection = new CardCollection(engine);
            const files = listFiles(sourcePath, recursive);
            let ingested = 0;
            let skipped = 0;
            const errors = [];
            const startTime = Date.now();
            for (const filePath of files) {
                try {
                    const content = fs.readFileSync(filePath);
                    const card = await MCard.create(new Uint8Array(content));
                    await collection.add(card);
                    ingested += 1;
                }
                catch (err) {
                    skipped += 1;
                    errors.push(`${filePath}: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            const metrics = computeTimingMetrics(startTime, ingested);
            return {
                success: true,
                report: {
                    total_files: files.length,
                    ingested,
                    skipped,
                    errors,
                },
                ingest_metrics: {
                    db_path: resolvedDbPath,
                    time_s: metrics.time_s,
                    files_per_sec: metrics.files_per_sec,
                },
            };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    }
}
export class PythonRuntime {
    async execute(code, context, config) {
        const entryPoint = config.entry_point || 'add';
        const contextStr = JSON.stringify(context);
        const projectRoot = findProjectRoot();
        // Create wrapper script
        const wrapper = `
import sys
import json

try:
    context = json.loads(sys.argv[1])
    target = context
    
    # Compatibility: If input is string but code expects bytes (calls .decode),
    # ensure target acts like bytes or is bytes.
    # The safest is to encode strictly if it's a string, so .decode works.
    if isinstance(target, str):
        target = target.encode('utf-8')
except:
    context = {}
    target = {}
    # If using empty dict, it doesn't have .decode.
    # We might need a dummy bytes object if context fails?
    pass

# User logic
${code}

# Entry point invocation
def _is_arg_error(e):
    """Check if TypeError is about function arguments"""
    msg = str(e).lower()
    return 'positional argument' in msg or 'required argument' in msg or 'takes' in msg and 'argument' in msg

try:
    fn = None
    if '${entryPoint}' in dir():
        fn = ${entryPoint}
    elif '${entryPoint}' in globals():
        fn = globals()['${entryPoint}']
        
    if fn is not None:
        # Try with context first (most common for reflection/transform functions)
        try:
            res = fn(context)
        except TypeError as e:
            if not _is_arg_error(e):
                raise  # Re-raise if not an argument count error
            # Try with target content
            try:
                res = fn(target)
            except TypeError as e2:
                if not _is_arg_error(e2):
                    raise
                # Try with no args
                res = fn()
        print(json.dumps(res))
    else:
        # Maybe result is set globally?
        if 'result' in dir() or 'result' in globals():
            print(json.dumps(result if 'result' in dir() else globals().get('result')))
        else:
            print(json.dumps(None))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`;
        const tmpFile = path.resolve(process.cwd(), `tmp_${Date.now()}.py`);
        await writeFile(tmpFile, wrapper);
        try {
            // Execute from project root to ensure relative paths in CLMs (like 'chapters/...') work correctly
            const { stdout, stderr } = await execFile('python3', [tmpFile, contextStr], {
                cwd: projectRoot,
                env: {
                    ...process.env,
                    // Ensure project root is in PYTHONPATH
                    PYTHONPATH: `${projectRoot}${path.delimiter}${process.env.PYTHONPATH || ''}`
                }
            });
            if (stderr)
                console.error('[Python Stderr]', stderr);
            try {
                return JSON.parse(stdout.trim());
            }
            catch (e) {
                return stdout.trim();
            }
        }
        catch (error) {
            // Include stdout/stderr in the error message for better debugging
            const stderr = error.stderr ? `\nStderr: ${error.stderr.toString()}` : '';
            const stdout = error.stdout ? `\nStdout: ${error.stdout.toString()}` : '';
            throw new Error(`Python execution failed: ${error.message}${stderr}${stdout}`);
        }
        finally {
            await unlink(tmpFile);
        }
    }
}
export class BinaryRuntime {
    async execute(binaryPath, context, config, chapterDir) {
        // Resolve binary path inside chapterDir
        // If binaryPath is relative, join with chapterDir.
        const fullPath = path.resolve(chapterDir, binaryPath);
        const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
        const { stdout } = await execFile(fullPath, [contextStr]);
        try {
            return JSON.parse(stdout.trim());
        }
        catch {
            return stdout.trim();
        }
    }
}
export class WasmRuntime {
    async execute(wasmPath, context, config, chapterDir) {
        const fullPath = path.resolve(chapterDir, wasmPath);
        const contextStr = typeof context === 'string' ? context : JSON.stringify(context ?? {});
        // For this project, WASM modules are WASI command-style programs that
        // read the JSON context from argv and print the result to stdout,
        // just like the Rust/C binaries. We mirror the Python RustRuntime
        // behavior by delegating to the wasmtime CLI and capturing stdout.
        return await new Promise((resolve, reject) => {
            const proc = child_process.spawn('wasmtime', [fullPath, contextStr]);
            // Close stdin immediately - WASM programs don't read from stdin
            // and the process will hang waiting for EOF if we don't close it
            proc.stdin.end();
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data) => {
                stdout += data.toString('utf-8');
            });
            proc.stderr.on('data', (data) => {
                stderr += data.toString('utf-8');
            });
            proc.on('error', (err) => {
                reject(err);
            });
            proc.on('close', (code) => {
                if (code !== 0) {
                    // If wasmtime is missing, surface a clear message
                    if (stderr.includes('command not found') || stderr.includes('wasmtime: not found')) {
                        return reject(new Error('WASM runtime requires wasmtime CLI. Install it, e.g. with: brew install wasmtime'));
                    }
                    return reject(new Error(`wasmtime exited with code ${code}: ${stderr || stdout}`));
                }
                const out = stdout.trim();
                if (!out) {
                    return resolve(undefined);
                }
                // 1) If it looks numeric, return a number (matches arithmetic chapters)
                const numeric = out.trim();
                if (numeric && !Number.isNaN(Number(numeric))) {
                    return resolve(Number(numeric));
                }
                // 2) Otherwise, try JSON
                try {
                    return resolve(JSON.parse(out));
                }
                catch {
                    // 3) Fallback: raw string
                    return resolve(out);
                }
            });
        });
    }
}
let leanCacheDir = null;
const leanSourceCache = new Map();
function ensureLeanCacheDir() {
    if (!leanCacheDir) {
        leanCacheDir = path.resolve(process.cwd(), '.lean_cache');
        if (!fs.existsSync(leanCacheDir)) {
            fs.mkdirSync(leanCacheDir, { recursive: true });
        }
    }
    return leanCacheDir;
}
async function getCachedLeanSource(code) {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    if (leanSourceCache.has(hash)) {
        return leanSourceCache.get(hash);
    }
    const cacheDir = ensureLeanCacheDir();
    const filePath = path.join(cacheDir, `${hash}.lean`);
    if (!fs.existsSync(filePath)) {
        await writeFile(filePath, code);
    }
    leanSourceCache.set(hash, filePath);
    return filePath;
}
export class LeanRuntime {
    async execute(code, context, config) {
        const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
        const sourcePath = await getCachedLeanSource(code);
        const { stdout } = await execFile('lean', ['--run', sourcePath, contextStr]);
        try {
            return JSON.parse(stdout.trim());
        }
        catch {
            return stdout.trim();
        }
    }
}
export class LoaderRuntime {
    /**
     * Loader runtime: load files using the standardized loadFileToCollection utility.
     * Returns unified metrics and results matching Python's loader builtin.
     */
    async execute(_code, context, config) {
        // Dynamic import to avoid circular dep issues if any, or just standard import usage
        const { loadFileToCollection } = await import('../../util/Loader.js');
        const { CardCollection } = await import('../../model/CardCollection.js');
        const { SqliteNodeEngine } = await import('../../storage/SqliteNodeEngine.js');
        const ctx = context;
        // Extract dbPath from context or config
        const loaderParams = extractLoaderParams(ctx, { sourceDir: 'test_data', dbPath: ':memory:' });
        const { sourceDir, recursive, dbPath } = loaderParams;
        // Find project root
        const projectRoot = findProjectRoot();
        const sourcePath = path.isAbsolute(sourceDir) ? sourceDir : path.join(projectRoot, sourceDir);
        if (!fs.existsSync(sourcePath)) {
            return { success: false, error: `Source directory not found: ${sourceDir}` };
        }
        try {
            // Use persistent engine if dbPath is provided and not :memory:
            let resolvedDbPath = dbPath;
            if (dbPath && dbPath !== ':memory:' && !path.isAbsolute(dbPath)) {
                resolvedDbPath = path.join(projectRoot, dbPath);
                // Ensure directory exists
                const dbDir = path.dirname(resolvedDbPath);
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                }
            }
            const engine = new SqliteNodeEngine(resolvedDbPath);
            const collection = new CardCollection(engine);
            const loaderResult = await loadFileToCollection(sourcePath, collection, {
                recursive,
                includeProblematic: false
            });
            // Map results to match expected output structure
            // Python output: { metrics: {...}, files: [...] }
            // JS output from loadFileToCollection: { metrics: {...}, results: [...] }
            // We'll map 'results' to 'files' and ensure casing matches where possible.
            // Python: total_files, total_directories, directory_levels, total_size_bytes, duration_ms
            // JS: filesCount, directoriesCount, directoryLevels
            // We construct a response compatible with the filesystem_load_files.clm expectation (snake_case metrics)
            const response = {
                success: true,
                metrics: {
                    total_files: loaderResult.metrics.filesCount,
                    total_directories: loaderResult.metrics.directoriesCount,
                    directory_levels: loaderResult.metrics.directoryLevels,
                    // Estimate size/duration if not directly in metrics, or use what's available
                    // JS Loader currently doesn't return duration/size in metrics object,
                    // but we can compute total_size from results.
                    total_size_bytes: loaderResult.results.reduce((acc, r) => acc + (r.size || 0), 0),
                    duration_ms: 0 // We might need to wrap in timer if not provided
                },
                files: loaderResult.results.map(r => ({
                    hash: r.hash,
                    filename: r.filename,
                    content_type: r.contentType,
                    size_bytes: r.size,
                    path: r.filePath // Ensure path is included for comparison
                }))
            };
            await engine.close();
            return response;
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    }
}
async function checkCommand(cmd, args = ['--version']) {
    try {
        await execFile(cmd, args);
        return true;
    }
    catch {
        return false;
    }
}
export class RuntimeFactory {
    static async getAvailableRuntimes() {
        const runtimes = ['javascript', 'python', 'rust', 'c', 'wasm', 'lean', 'llm'];
        const status = {};
        for (const r of runtimes) {
            try {
                // Basic checks
                if (r === 'javascript') {
                    status[r] = true;
                }
                else if (r === 'python') {
                    status[r] = await checkCommand('python3');
                }
                else if (r === 'rust') {
                    status[r] = await checkCommand('cargo');
                }
                else if (r === 'c') {
                    const gccOk = await checkCommand('gcc');
                    if (gccOk)
                        status[r] = true;
                    else
                        status[r] = await checkCommand('clang');
                }
                else if (r === 'lean') {
                    status[r] = await checkCommand('lean');
                }
                else if (r === 'wasm') {
                    // Node.js has built-in WASM support
                    status[r] = typeof WebAssembly !== 'undefined';
                }
                else if (r === 'llm') {
                    const provider = new OllamaProvider(null, 5); // short timeout
                    status[r] = await provider.validate_connection();
                }
                else {
                    status[r] = false;
                }
            }
            catch (e) {
                status[r] = false;
            }
        }
        return status;
    }
    static getRuntime(runtimeName, options) {
        switch (runtimeName) {
            case 'javascript': return new JavaScriptRuntime();
            case 'python': return new PythonRuntime();
            case 'rust':
            case 'c':
                return new BinaryRuntime();
            case 'wasm': return new WasmRuntime();
            case 'lean': return new LeanRuntime();
            case 'llm': return new LLMRuntime();
            case 'loader': return new LoaderRuntime();
            case 'collection_loader': return new CollectionLoaderRuntime();
            case 'lambda':
                if (!options?.collection) {
                    throw new Error('Lambda runtime requires a CardCollection in options');
                }
                return new LambdaRuntime(options.collection);
            case 'network':
                return new NetworkRuntime(options?.collection);
            default: throw new Error(`Unknown runtime: ${runtimeName}`);
        }
    }
}
//# sourceMappingURL=Runtimes.js.map