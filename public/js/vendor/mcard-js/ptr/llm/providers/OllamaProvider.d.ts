/**
 * Ollama Provider Implementation
 *
 * Provider for the Ollama local LLM service.
 * Replicates mcard.ptr.core.llm.providers.ollama.OllamaProvider
 */
import { BaseLLMProvider, ChatMessage } from './LLMProvider.js';
import { Either } from '../../../monads/Either.js';
export declare class OllamaProvider extends BaseLLMProvider {
    provider_name: string;
    private base_url;
    private timeout;
    private config;
    constructor(base_url?: string | null, timeout?: number);
    private _make_request;
    complete(prompt: string, params: Record<string, any>): Promise<Either<string, string>>;
    chat(messages: ChatMessage[], params: Record<string, any>): Promise<Either<string, Record<string, any>>>;
    validate_connection(): Promise<boolean>;
    list_models(): Promise<Either<string, string[]>>;
}
//# sourceMappingURL=OllamaProvider.d.ts.map