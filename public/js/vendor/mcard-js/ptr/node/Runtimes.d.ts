import { Runtime } from './RuntimeInterface.js';
import { CardCollection } from '../../model/CardCollection.js';
export declare class JavaScriptRuntime implements Runtime {
    execute(code: string, context: unknown, config: any): Promise<unknown>;
    executeSubprocess(code: string, context: unknown): Promise<unknown>;
}
export declare class CollectionLoaderRuntime implements Runtime {
    /**
     * Collection loader runtime: ingest files into a CardCollection and return a normalized ingest report.
     */
    execute(_code: string, context: unknown, config: any): Promise<unknown>;
}
export declare class PythonRuntime implements Runtime {
    execute(code: string, context: unknown, config: any): Promise<unknown>;
}
export declare class BinaryRuntime implements Runtime {
    execute(binaryPath: string, context: unknown, config: any, chapterDir: string): Promise<unknown>;
}
export declare class WasmRuntime implements Runtime {
    execute(wasmPath: string, context: unknown, config: any, chapterDir: string): Promise<unknown>;
}
export declare class LeanRuntime implements Runtime {
    execute(code: string, context: unknown, config: any): Promise<unknown>;
}
export declare class LoaderRuntime implements Runtime {
    /**
     * Loader runtime: load files using the standardized loadFileToCollection utility.
     * Returns unified metrics and results matching Python's loader builtin.
     */
    execute(_code: string, context: unknown, config: any): Promise<unknown>;
}
export declare class RuntimeFactory {
    static getAvailableRuntimes(): Promise<Record<string, boolean>>;
    static getRuntime(runtimeName: string, options?: RuntimeOptions): Runtime;
}
/**
 * Options for runtime creation
 */
export interface RuntimeOptions {
    collection?: CardCollection;
}
//# sourceMappingURL=Runtimes.d.ts.map