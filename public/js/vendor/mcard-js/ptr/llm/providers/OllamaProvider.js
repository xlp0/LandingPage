/**
 * Ollama Provider Implementation
 *
 * Provider for the Ollama local LLM service.
 * Replicates mcard.ptr.core.llm.providers.ollama.OllamaProvider
 */
import { BaseLLMProvider } from './LLMProvider.js';
import { Either } from '../../../monads/Either.js';
import { LLM_PROVIDERS } from '../Config.js';
import * as http from 'http';
import * as https from 'https';
export class OllamaProvider extends BaseLLMProvider {
    provider_name = 'ollama';
    base_url;
    timeout;
    config;
    constructor(base_url = null, timeout = 180) {
        super();
        this.config = LLM_PROVIDERS['ollama'];
        this.base_url = (base_url || this.config.base_url).replace(/\/$/, '');
        this.timeout = timeout * 1000;
    }
    async _make_request(endpoint, data = null, method = 'POST') {
        const urlStr = `${this.base_url}${endpoint}`;
        const url = new URL(urlStr);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: this.timeout,
        };
        return new Promise((resolve) => {
            const req = client.request(url, options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            if (body.includes('\n') && !body.trim().startsWith('{')) {
                                resolve(Either.right(JSON.parse(body)));
                            }
                            else {
                                resolve(Either.right(JSON.parse(body)));
                            }
                        }
                        catch (e) {
                            const lines = body.trim().split('\n').filter(l => l);
                            if (lines.length > 0) {
                                try {
                                    resolve(Either.right(JSON.parse(lines[lines.length - 1])));
                                }
                                catch (parseErr) {
                                    resolve(Either.left(`Ollama response parse error: ${parseErr}`));
                                }
                            }
                            else {
                                resolve(Either.left(`Ollama response parse error: ${e}`));
                            }
                        }
                    }
                    else {
                        resolve(Either.left(`Ollama HTTP error ${res.statusCode}: ${body}`));
                    }
                });
            });
            req.on('error', (e) => {
                resolve(Either.left(`Ollama connection error: ${e.message}`));
            });
            req.on('timeout', () => {
                req.destroy();
                resolve(Either.left(`Ollama request timed out after ${this.timeout}ms`));
            });
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }
    async complete(prompt, params) {
        const data = {
            model: params.model || this.config.default_model,
            prompt: prompt,
            stream: false,
        };
        if (params.options) {
            data.options = params.options;
        }
        const result = await this._make_request(this.config.api_path, data);
        if (result.isLeft) {
            return Either.left(result.left);
        }
        const response = result.right;
        if (response.response !== undefined) {
            return Either.right(response.response);
        }
        else if (response.error) {
            return Either.left(`Ollama error: ${response.error}`);
        }
        else {
            return Either.left(`Unexpected Ollama response format: ${JSON.stringify(response)}`);
        }
    }
    async chat(messages, params) {
        const data = {
            model: params.model || this.config.default_model,
            messages: messages,
            stream: false,
        };
        if (params.options) {
            data.options = params.options;
        }
        const result = await this._make_request(this.config.chat_path, data);
        if (result.isLeft) {
            return Either.left(result.left);
        }
        const response = result.right;
        if (response.message) {
            return Either.right({
                content: response.message.content || '',
                role: response.message.role || 'assistant',
                model: response.model || data.model,
                done: response.done ?? true,
                total_duration: response.total_duration,
                eval_count: response.eval_count,
            });
        }
        else if (response.error) {
            return Either.left(`Ollama error: ${response.error}`);
        }
        else {
            return Either.left(`Unexpected Ollama chat response format: ${JSON.stringify(response)}`);
        }
    }
    async validate_connection() {
        const result = await this._make_request(this.config.models_path, null, 'GET');
        return result.isRight;
    }
    async list_models() {
        const result = await this._make_request(this.config.models_path, null, 'GET');
        if (result.isLeft) {
            return Either.left(result.left);
        }
        const response = result.right;
        if (response.models) {
            const models = response.models.map((m) => m.name || m.model || 'unknown');
            return Either.right(models);
        }
        else {
            return Either.left(`Unexpected models response: ${JSON.stringify(response)}`);
        }
    }
}
//# sourceMappingURL=OllamaProvider.js.map