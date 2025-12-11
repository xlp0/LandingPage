/**
 * LLM Runtime Module
 *
 * Provides LLMRuntime for executing LLM prompts as part of the PTR polyglot runtime system.
 * Replicates mcard.ptr.core.llm.runtime.LLMRuntime
 */
import { LLMConfig, DEFAULT_PROVIDER } from './Config.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { WebLLMProvider } from './providers/WebLLMProvider.js';
import { MLCLLMProvider } from './providers/MLCLLMProvider.js';
import { IO } from '../../monads/IO.js';
import { Either } from '../../monads/Either.js';
export function get_provider(provider_name = DEFAULT_PROVIDER, base_url = null, timeout = 120) {
    if (provider_name === 'ollama') {
        return new OllamaProvider(base_url, timeout);
    }
    if (provider_name === 'webllm') {
        return new WebLLMProvider();
    }
    if (provider_name === 'mlc-llm') {
        return new MLCLLMProvider(base_url, timeout);
    }
    // Future: lmstudio, openai
    throw new Error(`Unknown provider: ${provider_name}`);
}
export class LLMRuntime {
    provider_name;
    _provider = null;
    constructor(provider_name = DEFAULT_PROVIDER) {
        this.provider_name = provider_name;
    }
    get provider() {
        if (!this._provider) {
            this._provider = get_provider(this.provider_name);
        }
        return this._provider;
    }
    async execute(codeOrPath, context, config, chapterDir) {
        // In Python, execute signature is (concrete_impl, target, context)
        // In JS, it is (codeOrPath, context, config, chapterDir)
        // If context is a string, it's the prompt, not config overrides.
        let configCtx = {};
        if (typeof context === 'object' && context !== null) {
            configCtx = context;
        }
        const concrete = config;
        // Build configuration
        const llmConfig = LLMConfig.from_concrete(concrete, configCtx);
        // Update provider if different
        if (llmConfig.provider !== this.provider_name) {
            this._provider = get_provider(llmConfig.provider, llmConfig.endpoint_url, llmConfig.timeout);
        }
        // Get prompt from target (context/input)
        let prompt = '';
        if (typeof context === 'string') {
            prompt = context;
        }
        else {
            // If it's an object, we use it as JSON
            // Future: support extracting specific field like 'question' or 'prompt' if defined in CLM inputs?
            // For now, just dump it.
            prompt = JSON.stringify(context);
        }
        // Execute
        let result;
        if (llmConfig.system_prompt) {
            result = await this._execute_chat(prompt, llmConfig);
        }
        else {
            result = await this._execute_completion(prompt, llmConfig);
        }
        if (result.isLeft) {
            return `Error: ${result.left}`;
        }
        return this._format_response(result.right, llmConfig);
    }
    async _execute_completion(prompt, config) {
        const params = config.to_provider_params();
        return this.provider.complete(prompt, params);
    }
    async _execute_chat(prompt, config) {
        const messages = [];
        if (config.system_prompt) {
            messages.push({ role: 'system', content: config.system_prompt });
        }
        messages.push({ role: 'user', content: prompt });
        if (config.assistant_instruction) {
            messages.push({ role: 'assistant', content: config.assistant_instruction });
        }
        const params = config.to_provider_params();
        return this.provider.chat(messages, params);
    }
    _format_response(response, config) {
        let content = response;
        if (response && typeof response === 'object' && 'content' in response) {
            content = response.content;
        }
        if (config.response_format === 'json') {
            try {
                if (typeof content === 'string') {
                    const start = content.indexOf('{');
                    const end = content.lastIndexOf('}') + 1;
                    if (start >= 0 && end > start) {
                        return JSON.parse(content.substring(start, end));
                    }
                }
                return content;
            }
            catch (e) {
                return content;
            }
        }
        return content;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Monadic Interface Functions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Create a monadic LLM completion execution.
 *
 * Returns IO<Either<string, any>> for functional composition.
 */
export function promptMonad(prompt, config = {}) {
    return IO.of(async () => {
        try {
            // Instantiate config to get provider and defaults
            // We cast config to any because LLMConfig constructor expects Partial<LLMConfig> 
            // but our partial might miss some index signature stuff if any.
            // Actually config is Partial<LLMConfig> so it's fine.
            const llmConfig = new LLMConfig(config);
            const runtime = new LLMRuntime(llmConfig.provider);
            const params = llmConfig.to_provider_params();
            return runtime.provider.complete(prompt, params);
        }
        catch (e) {
            return Either.left(`LLM execution failed: ${e}`);
        }
    });
}
/**
 * Create a monadic LLM chat execution.
 *
 * Returns IO<Either<string, any>> for functional composition.
 */
export function chatMonad(messages = null, prompt = null, system_prompt = "", config = {}) {
    return IO.of(async () => {
        try {
            // Merge system prompt into config if provided
            const configData = { ...config };
            if (system_prompt)
                configData.system_prompt = system_prompt;
            const llmConfig = new LLMConfig(configData);
            const runtime = new LLMRuntime(llmConfig.provider);
            // Build messages if not provided
            const msgs = messages ? [...messages] : [];
            if (msgs.length === 0) {
                if (llmConfig.system_prompt) {
                    msgs.push({ role: 'system', content: llmConfig.system_prompt });
                }
                if (prompt) {
                    msgs.push({ role: 'user', content: prompt });
                }
                if (llmConfig.assistant_instruction) {
                    msgs.push({ role: 'assistant', content: llmConfig.assistant_instruction });
                }
            }
            const params = llmConfig.to_provider_params();
            return runtime.provider.chat(msgs, params);
        }
        catch (e) {
            return Either.left(`LLM chat failed: ${e}`);
        }
    });
}
//# sourceMappingURL=LLMRuntime.js.map