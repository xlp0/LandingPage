/**
 * LLM Configuration Module
 *
 * Centralized configuration for LLM providers and execution parameters.
 * Replicates mcard.ptr.core.llm.config
 */
export declare const DEFAULT_PROVIDER = "ollama";
export interface ProviderConfig {
    base_url: string;
    api_path: string;
    chat_path: string;
    models_path: string | null;
    default_model: string;
    available_models: string[];
}
export declare const LLM_PROVIDERS: Record<string, ProviderConfig>;
export declare const DEFAULT_LLM_CONFIG: {
    temperature: number;
    max_tokens: number;
    top_p: number;
    top_k: number;
    timeout: number;
    stream: boolean;
    response_format: string;
    retry_count: number;
    retry_delay: number;
};
export type ResponseFormat = 'text' | 'json' | 'structured' | 'markdown';
export declare const RESPONSE_FORMATS: ResponseFormat[];
export declare class LLMConfig {
    provider: string;
    model: string | null;
    endpoint_url: string | null;
    api_key: string | null;
    system_prompt: string;
    assistant_instruction: string;
    temperature: number;
    max_tokens: number;
    top_p: number;
    top_k: number | null;
    frequency_penalty: number;
    presence_penalty: number;
    stop_sequences: string[];
    response_format: string;
    json_schema: Record<string, any> | null;
    timeout: number;
    retry_count: number;
    retry_delay: number;
    stream: boolean;
    constructor(data?: Partial<LLMConfig>);
    validate(): void;
    get effective_model(): string;
    get effective_base_url(): string;
    to_provider_params(): Record<string, any>;
    static from_concrete(concrete: any, context?: any): LLMConfig;
}
//# sourceMappingURL=Config.d.ts.map