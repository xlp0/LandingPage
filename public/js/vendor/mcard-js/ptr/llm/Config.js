/**
 * LLM Configuration Module
 *
 * Centralized configuration for LLM providers and execution parameters.
 * Replicates mcard.ptr.core.llm.config
 */
export const DEFAULT_PROVIDER = 'ollama';
export const LLM_PROVIDERS = {
    'ollama': {
        base_url: 'http://localhost:11434',
        api_path: '/api/generate',
        chat_path: '/api/chat',
        models_path: '/api/tags',
        default_model: 'gemma3:latest',
        available_models: ['gemma3:latest', 'llama3:latest', 'qwen3:latest'],
    },
    'webllm': {
        base_url: '', // running in-browser
        api_path: '',
        chat_path: '',
        models_path: null,
        default_model: 'Llama-3-8B-Instruct-q4f32_1-MLC',
        available_models: ['Llama-3-8B-Instruct-q4f32_1-MLC', 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC', 'Phi-3-Mini-4k-Instruct-q4f16_1-MLC'],
    },
    'mlc-llm': {
        base_url: 'http://localhost:8000',
        api_path: '/v1/completions',
        chat_path: '/v1/chat/completions',
        models_path: '/v1/models',
        default_model: 'Llama-3-8B-Instruct-q4f16_1-MLC',
        available_models: [],
    },
    'lmstudio': {
        base_url: 'http://localhost:1234',
        api_path: '/v1/completions',
        chat_path: '/v1/chat/completions',
        models_path: '/v1/models',
        default_model: 'local-model',
        available_models: [],
    },
    'openai': {
        base_url: 'https://api.openai.com',
        api_path: '/v1/completions',
        chat_path: '/v1/chat/completions',
        models_path: '/v1/models',
        default_model: 'gpt-4',
        available_models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    },
    'anthropic': {
        base_url: 'https://api.anthropic.com',
        api_path: '/v1/messages',
        chat_path: '/v1/messages',
        models_path: null,
        default_model: 'claude-3-sonnet-20240229',
        available_models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    },
};
export const DEFAULT_LLM_CONFIG = {
    temperature: 0.7,
    max_tokens: 2048,
    top_p: 1.0,
    top_k: 40,
    timeout: 120,
    stream: false,
    response_format: 'text',
    retry_count: 3,
    retry_delay: 1.0,
};
export const RESPONSE_FORMATS = ['text', 'json', 'structured', 'markdown'];
export class LLMConfig {
    provider;
    model;
    endpoint_url;
    api_key;
    system_prompt;
    assistant_instruction;
    temperature;
    max_tokens;
    top_p;
    top_k;
    frequency_penalty;
    presence_penalty;
    stop_sequences;
    response_format;
    json_schema;
    timeout;
    retry_count;
    retry_delay;
    stream;
    constructor(data = {}) {
        this.provider = data.provider || DEFAULT_PROVIDER;
        this.model = data.model || null;
        this.endpoint_url = data.endpoint_url || null;
        this.api_key = data.api_key || null;
        this.system_prompt = data.system_prompt || "";
        this.assistant_instruction = data.assistant_instruction || "";
        this.temperature = data.temperature ?? DEFAULT_LLM_CONFIG.temperature;
        this.max_tokens = data.max_tokens ?? DEFAULT_LLM_CONFIG.max_tokens;
        this.top_p = data.top_p ?? DEFAULT_LLM_CONFIG.top_p;
        this.top_k = data.top_k ?? DEFAULT_LLM_CONFIG.top_k;
        this.frequency_penalty = data.frequency_penalty || 0.0;
        this.presence_penalty = data.presence_penalty || 0.0;
        this.stop_sequences = data.stop_sequences || [];
        this.response_format = data.response_format || DEFAULT_LLM_CONFIG.response_format;
        this.json_schema = data.json_schema || null;
        this.timeout = data.timeout ?? DEFAULT_LLM_CONFIG.timeout;
        this.retry_count = data.retry_count ?? DEFAULT_LLM_CONFIG.retry_count;
        this.retry_delay = data.retry_delay ?? DEFAULT_LLM_CONFIG.retry_delay;
        this.stream = data.stream ?? DEFAULT_LLM_CONFIG.stream;
        this.validate();
    }
    validate() {
        if (!LLM_PROVIDERS[this.provider]) {
            throw new Error(`Unknown provider: ${this.provider}. Available: ${Object.keys(LLM_PROVIDERS).join(', ')}`);
        }
        if (!RESPONSE_FORMATS.includes(this.response_format)) {
            throw new Error(`Unknown response format: ${this.response_format}. Available: ${RESPONSE_FORMATS.join(', ')}`);
        }
    }
    get effective_model() {
        return this.model || LLM_PROVIDERS[this.provider].default_model;
    }
    get effective_base_url() {
        if (this.endpoint_url) {
            return this.endpoint_url.replace(/\/$/, '');
        }
        return LLM_PROVIDERS[this.provider].base_url;
    }
    to_provider_params() {
        const params = {
            model: this.effective_model,
            temperature: this.temperature,
        };
        if (this.provider === 'ollama') {
            params.options = {
                num_predict: this.max_tokens,
                top_p: this.top_p,
                top_k: this.top_k,
                temperature: this.temperature,
            };
            if (this.stop_sequences.length > 0) {
                params.options.stop = this.stop_sequences;
            }
        }
        else {
            // OpenAI compatible
            params.max_tokens = this.max_tokens;
            params.top_p = this.top_p;
            if (this.stop_sequences.length > 0) {
                params.stop = this.stop_sequences;
            }
            if (this.frequency_penalty)
                params.frequency_penalty = this.frequency_penalty;
            if (this.presence_penalty)
                params.presence_penalty = this.presence_penalty;
        }
        return params;
    }
    static from_concrete(concrete, context = {}) {
        // Start with defaults from concrete's llm_config
        const configData = { ...(concrete.llm_config || {}) };
        // Override with top-level concrete fields
        ['provider', 'model', 'system_prompt', 'temperature', 'max_tokens'].forEach(key => {
            if (key in concrete) {
                configData[key] = concrete[key];
            }
        });
        // Override with context
        const contextKeys = [
            'provider', 'model', 'endpoint_url', 'api_key',
            'system_prompt', 'assistant_instruction',
            'temperature', 'max_tokens', 'top_p', 'top_k',
            'response_format', 'timeout'
        ];
        contextKeys.forEach(key => {
            if (key in context) {
                configData[key] = context[key];
            }
        });
        return new LLMConfig(configData);
    }
}
//# sourceMappingURL=Config.js.map