/**
 * MLC LLM Provider Implementation
 *
 * Provider for the MLC LLM REST API (OpenAI compatible).
 * Typically running via `mlc_llm serve`.
 */
import { BaseLLMProvider, ChatMessage } from './LLMProvider.js';
import { Either } from '../../../monads/Either.js';
export declare class MLCLLMProvider extends BaseLLMProvider {
    provider_name: string;
    private base_url;
    private timeout;
    private config;
    constructor(base_url?: string | null, timeout?: number);
    private _fetch_json;
    private _node_request;
    complete(prompt: string, params: Record<string, any>): Promise<Either<string, string>>;
    chat(messages: ChatMessage[], params: Record<string, any>): Promise<Either<string, Record<string, any>>>;
    validate_connection(): Promise<boolean>;
    list_models(): Promise<Either<string, string[]>>;
}
//# sourceMappingURL=MLCLLMProvider.d.ts.map