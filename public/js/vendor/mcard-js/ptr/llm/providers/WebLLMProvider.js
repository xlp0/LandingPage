/**
 * WebLLM Provider Implementation
 *
 * Provider for the WebLLM (MLC LLM) in-browser execution.
 * See: https://github.com/mlc-ai/web-llm
 */
import { BaseLLMProvider } from './LLMProvider.js';
import { Either } from '../../../monads/Either.js';
import { LLM_PROVIDERS } from '../Config.js';
export class WebLLMProvider extends BaseLLMProvider {
    provider_name = 'webllm';
    config;
    engine = null;
    current_model = null;
    initialization_promise = null;
    constructor() {
        super();
        this.config = LLM_PROVIDERS['webllm'];
    }
    async _get_engine(model_id) {
        // If engine exists and model is same, return it.
        // WebLLM typically requires reloading for different models.
        if (this.engine && this.current_model === model_id) {
            return Either.right(this.engine);
        }
        // Avoid concurrent initializations
        if (this.initialization_promise) {
            await this.initialization_promise;
            if (this.engine && this.current_model === model_id) {
                return Either.right(this.engine);
            }
        }
        // Start initialization
        this.initialization_promise = (async () => {
            try {
                // Check if running in browser
                if (typeof window === 'undefined') {
                    throw new Error("WebLLM only supports browser environments.");
                }
                // Try to get webllm from window (script tag) or dynamic import
                let webllm = window.webllm;
                if (!webllm) {
                    try {
                        // Try dynamic import (might fail if not bundled)
                        webllm = await import('@mlc-ai/web-llm');
                    }
                    catch (e) {
                        // Ignore
                    }
                }
                if (!webllm) {
                    throw new Error("WebLLM library not found. Please include @mlc-ai/web-llm or add script tag.");
                }
                // Create engine
                // We use CreateMLCEngine
                if (!this.engine) {
                    // Initial creation
                    this.engine = await webllm.CreateMLCEngine(model_id, {
                        initProgressCallback: (report) => {
                            console.debug(`[WebLLM] ${report.text}`);
                        }
                    });
                }
                else {
                    // Reload if existing engine
                    await this.engine.reload(model_id);
                }
                this.current_model = model_id;
            }
            catch (e) {
                this.engine = null;
                this.current_model = null;
                throw e;
            }
        })();
        try {
            await this.initialization_promise;
            return Either.right(this.engine);
        }
        catch (e) {
            this.initialization_promise = null;
            return Either.left(`WebLLM init failed: ${e.message || e}`);
        }
    }
    async complete(prompt, params) {
        const model = params.model || this.config.default_model;
        const engineResult = await this._get_engine(model);
        if (engineResult.isLeft)
            return Either.left(engineResult.left);
        const engine = engineResult.right;
        try {
            const completion = await engine.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                temperature: params.temperature,
                max_tokens: params.max_tokens,
                top_p: params.top_p,
                stream: false
            });
            const content = completion.choices[0]?.message?.content || "";
            return Either.right(content);
        }
        catch (e) {
            return Either.left(`WebLLM completion error: ${e.message || e}`);
        }
    }
    async chat(messages, params) {
        const model = params.model || this.config.default_model;
        const engineResult = await this._get_engine(model);
        if (engineResult.isLeft)
            return Either.left(engineResult.left);
        const engine = engineResult.right;
        try {
            const completion = await engine.chat.completions.create({
                messages: messages,
                temperature: params.temperature,
                max_tokens: params.max_tokens,
                top_p: params.top_p,
                stream: false
            });
            const choice = completion.choices[0];
            return Either.right({
                content: choice?.message?.content || '',
                role: choice?.message?.role || 'assistant',
                model: model,
                usage: completion.usage
            });
        }
        catch (e) {
            return Either.left(`WebLLM chat error: ${e.message || e}`);
        }
    }
    async validate_connection() {
        if (typeof window === 'undefined')
            return false;
        if (window.webllm)
            return true;
        try {
            // Try dynamic import check
            await import('@mlc-ai/web-llm');
            return true;
        }
        catch {
            return false;
        }
    }
    async list_models() {
        // Return static list from config
        return Either.right(this.config.available_models);
    }
}
//# sourceMappingURL=WebLLMProvider.js.map