/**
 * MLC LLM Provider Implementation
 *
 * Provider for the MLC LLM REST API (OpenAI compatible).
 * Typically running via `mlc_llm serve`.
 */
import { BaseLLMProvider } from './LLMProvider.js';
import { Either } from '../../../monads/Either.js';
import { LLM_PROVIDERS } from '../Config.js';
import * as http from 'http';
import * as https from 'https';
export class MLCLLMProvider extends BaseLLMProvider {
    provider_name = 'mlc-llm';
    base_url;
    timeout;
    config;
    constructor(base_url = null, timeout = 120) {
        super();
        this.config = LLM_PROVIDERS['mlc-llm'];
        this.base_url = (base_url || this.config.base_url).replace(/\/$/, '');
        this.timeout = timeout * 1000;
    }
    async _fetch_json(endpoint, options) {
        // Prefer native fetch if available (Node 18+, Browser)
        if (typeof globalThis.fetch === 'function') {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), this.timeout);
                const response = await fetch(`${this.base_url}${endpoint}`, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(id);
                if (!response.ok) {
                    return Either.left(`HTTP error ${response.status}: ${await response.text()}`);
                }
                const data = await response.json();
                return Either.right(data);
            }
            catch (e) {
                return Either.left(`Connection error: ${e.message}`);
            }
        }
        // Fallback to http/https module for older environments (unlikely given engine constraint but safe)
        return this._node_request(endpoint, options);
    }
    _node_request(endpoint, options) {
        const urlStr = `${this.base_url}${endpoint}`;
        const url = new URL(urlStr);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        const reqOptions = {
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: this.timeout,
        };
        return new Promise((resolve) => {
            const req = client.request(url, reqOptions, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(Either.right(JSON.parse(body)));
                        }
                        catch (e) {
                            resolve(Either.left(`Parse error: ${e}`));
                        }
                    }
                    else {
                        resolve(Either.left(`HTTP Error ${res.statusCode}: ${body}`));
                    }
                });
            });
            req.on('error', (e) => resolve(Either.left(e.message)));
            req.on('timeout', () => {
                req.destroy();
                resolve(Either.left('Request timed out'));
            });
            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }
    async complete(prompt, params) {
        // MLC LLM / OpenAI 'completions' endpoint
        const data = {
            model: params.model || this.config.default_model,
            prompt: prompt,
            max_tokens: params.max_tokens,
            temperature: params.temperature,
            top_p: params.top_p,
            stream: false
        };
        const result = await this._fetch_json(this.config.api_path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (result.isLeft)
            return Either.left(result.left);
        const response = result.right;
        // OpenAI format: choices[0].text
        if (response.choices && response.choices.length > 0) {
            return Either.right(response.choices[0].text || '');
        }
        return Either.left(`Unexpected response format: ${JSON.stringify(response)}`);
    }
    async chat(messages, params) {
        const data = {
            model: params.model || this.config.default_model,
            messages: messages,
            max_tokens: params.max_tokens,
            temperature: params.temperature,
            top_p: params.top_p,
            stream: false
        };
        const result = await this._fetch_json(this.config.chat_path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (result.isLeft)
            return Either.left(result.left);
        const response = result.right;
        // OpenAI format: choices[0].message
        if (response.choices && response.choices.length > 0) {
            const message = response.choices[0].message;
            return Either.right({
                content: message.content,
                role: message.role,
                model: response.model,
                usage: response.usage
            });
        }
        return Either.left(`Unexpected response format: ${JSON.stringify(response)}`);
    }
    async validate_connection() {
        const result = await this._fetch_json(this.config.models_path, { method: 'GET' });
        return result.isRight;
    }
    async list_models() {
        const result = await this._fetch_json(this.config.models_path, { method: 'GET' });
        if (result.isLeft)
            return Either.left(result.left);
        const response = result.right;
        // OpenAI format: { data: [{ id: 'model-id', ... }] }
        if (response.data && Array.isArray(response.data)) {
            return Either.right(response.data.map((m) => m.id));
        }
        return Either.left('Invalid models response');
    }
}
//# sourceMappingURL=MLCLLMProvider.js.map