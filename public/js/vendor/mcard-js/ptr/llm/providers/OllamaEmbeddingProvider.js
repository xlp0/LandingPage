/**
 * Ollama Embedding Provider
 *
 * Generates embeddings using Ollama models (e.g., nomic-embed-text).
 */
export class OllamaEmbeddingProvider {
    modelName;
    baseUrl;
    constructor(modelName = 'nomic-embed-text', baseUrl = 'http://localhost:11434') {
        this.modelName = modelName;
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    /**
     * Generate embedding for a single text string
     */
    async embed(text) {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.modelName,
                prompt: text,
            }),
        });
        if (!response.ok) {
            throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.embedding;
    }
    /**
     * Generate embeddings for a batch of texts
     */
    async embedBatch(texts) {
        const embeddings = [];
        for (const text of texts) {
            embeddings.push(await this.embed(text));
        }
        return embeddings;
    }
}
//# sourceMappingURL=OllamaEmbeddingProvider.js.map