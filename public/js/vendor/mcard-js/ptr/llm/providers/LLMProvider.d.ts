/**
 * LLM Provider Interface
 *
 * Abstract interface for LLM providers.
 * Replicates mcard.ptr.core.llm.providers.base.LLMProvider
 */
import { Either } from '../../../monads/Either';
export interface ChatMessage {
    role: string;
    content: string;
}
export interface LLMProvider {
    provider_name: string;
    /**
     * Generate text completion for a prompt.
     */
    complete(prompt: string, params: Record<string, any>): Promise<Either<string, string>>;
    /**
     * Generate chat completion from messages.
     */
    chat(messages: ChatMessage[], params: Record<string, any>): Promise<Either<string, Record<string, any>>>;
    /**
     * Check if the provider service is available.
     */
    validate_connection(): Promise<boolean>;
    /**
     * List available models from the provider.
     */
    list_models(): Promise<Either<string, string[]>>;
    /**
     * Get provider status information.
     */
    get_status(): Promise<Record<string, any>>;
}
export declare abstract class BaseLLMProvider implements LLMProvider {
    abstract provider_name: string;
    abstract complete(prompt: string, params: Record<string, any>): Promise<Either<string, string>>;
    abstract chat(messages: ChatMessage[], params: Record<string, any>): Promise<Either<string, Record<string, any>>>;
    abstract validate_connection(): Promise<boolean>;
    abstract list_models(): Promise<Either<string, string[]>>;
    get_status(): Promise<Record<string, any>>;
}
//# sourceMappingURL=LLMProvider.d.ts.map