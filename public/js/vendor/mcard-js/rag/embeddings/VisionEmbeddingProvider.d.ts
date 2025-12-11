/**
 * Vision Embedding Provider
 *
 * Multimodal embedding provider that uses vision models to describe images,
 * then embeds the descriptions for vector search.
 *
 * Mirrors Python: mcard/rag/embeddings/vision.py
 */
import { EmbeddingProvider } from '../../storage/VectorStore';
export interface VisionProviderConfig {
    visionModel?: string;
    embeddingModel?: string;
    ollamaBaseUrl?: string;
    descriptionPrompt?: string;
}
export declare const VISION_MODELS: {
    moondream: {
        description: string;
        size: string;
    };
    'llama3.2-vision': {
        description: string;
        size: string;
    };
    llava: {
        description: string;
        size: string;
    };
    'minicpm-v': {
        description: string;
        size: string;
    };
};
/**
 * Multimodal embedding provider for images.
 *
 * Uses a two-stage approach:
 * 1. Vision model generates a text description of the image
 * 2. Text embedding model converts description to vector
 *
 * This enables semantic search over images using existing vector infrastructure.
 *
 * Usage:
 *     const provider = new VisionEmbeddingProvider();
 *
 *     // Embed an image (path, bytes, or base64)
 *     const embedding = await provider.embedImage("path/to/image.jpg");
 */
export declare class VisionEmbeddingProvider implements EmbeddingProvider {
    private visionModel;
    private baseUrl;
    private descriptionPrompt;
    private textEmbedder;
    constructor(config?: VisionProviderConfig);
    get modelName(): string;
    get providerName(): string;
    get dimensions(): number;
    /**
     * Generate text description of an image.
     *
     * @param imageData - Image as base64 string or Uint8Array
     * @param prompt - Optional custom prompt
     */
    describeImage(imageData: string | Uint8Array, prompt?: string): Promise<string>;
    /**
     * Generate embedding for an image.
     */
    embedImage(imageData: string | Uint8Array, prompt?: string): Promise<number[]>;
    /**
     * Generate embedding and return description.
     */
    embedImageWithDescription(imageData: string | Uint8Array, prompt?: string): Promise<{
        embedding: number[];
        description: string;
    }>;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    /**
     * Convert Uint8Array to base64 string
     */
    private arrayBufferToBase64;
    /**
     * Get provider information
     */
    getInfo(): any;
}
//# sourceMappingURL=VisionEmbeddingProvider.d.ts.map