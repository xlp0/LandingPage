/**
 * LLM Runtime Module
 *
 * Provides LLMRuntime for executing LLM prompts as part of the PTR polyglot runtime system.
 * Replicates mcard.ptr.core.llm.runtime.LLMRuntime
 */
import { Runtime } from '../node/RuntimeInterface.js';
import { LLMConfig } from './Config.js';
import { LLMProvider } from './providers/LLMProvider.js';
import { IO } from '../../monads/IO.js';
import { Either } from '../../monads/Either.js';
export declare function get_provider(provider_name?: string, base_url?: string | null, timeout?: number): LLMProvider;
export declare class LLMRuntime implements Runtime {
    provider_name: string;
    private _provider;
    constructor(provider_name?: string);
    get provider(): LLMProvider;
    execute(codeOrPath: string, context: unknown, config: any, chapterDir: string): Promise<unknown>;
    private _execute_completion;
    private _execute_chat;
    private _format_response;
}
/**
 * Create a monadic LLM completion execution.
 *
 * Returns IO<Either<string, any>> for functional composition.
 */
export declare function promptMonad(prompt: string, config?: Partial<LLMConfig>): IO<Either<string, any>>;
/**
 * Create a monadic LLM chat execution.
 *
 * Returns IO<Either<string, any>> for functional composition.
 */
export declare function chatMonad(messages?: any[] | null, prompt?: string | null, system_prompt?: string, config?: Partial<LLMConfig>): IO<Either<string, any>>;
//# sourceMappingURL=LLMRuntime.d.ts.map