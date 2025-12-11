/**
 * Ollama Embedding Provider
 *
 * Generates embeddings using Ollama models (e.g., nomic-embed-text).
 */
import { EmbeddingProvider } from '../../../storage/VectorStore';
export declare class OllamaEmbeddingProvider implements EmbeddingProvider {
    readonly modelName: string;
    private baseUrl;
    constructor(modelName?: string, baseUrl?: string);
    /**
     * Generate embedding for a single text string
     */
    embed(text: string): Promise<number[]>;
    /**
     * Generate embeddings for a batch of texts
     */
    embedBatch(texts: string[]): Promise<number[][]>;
}
//# sourceMappingURL=OllamaEmbeddingProvider.d.ts.map