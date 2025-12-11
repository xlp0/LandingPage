/**
 * WebLLM Provider Implementation
 *
 * Provider for the WebLLM (MLC LLM) in-browser execution.
 * See: https://github.com/mlc-ai/web-llm
 */
import { BaseLLMProvider, ChatMessage } from './LLMProvider.js';
import { Either } from '../../../monads/Either.js';
export declare class WebLLMProvider extends BaseLLMProvider {
    provider_name: string;
    private config;
    private engine;
    private current_model;
    private initialization_promise;
    constructor();
    private _get_engine;
    complete(prompt: string, params: Record<string, any>): Promise<Either<string, string>>;
    chat(messages: ChatMessage[], params: Record<string, any>): Promise<Either<string, Record<string, any>>>;
    validate_connection(): Promise<boolean>;
    list_models(): Promise<Either<string, string[]>>;
}
//# sourceMappingURL=WebLLMProvider.d.ts.map