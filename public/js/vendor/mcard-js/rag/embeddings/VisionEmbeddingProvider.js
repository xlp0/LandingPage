/**
 * Vision Embedding Provider
 *
 * Multimodal embedding provider that uses vision models to describe images,
 * then embeds the descriptions for vector search.
 *
 * Mirrors Python: mcard/rag/embeddings/vision.py
 */
import { OllamaEmbeddingProvider } from '../../ptr/llm/providers/OllamaEmbeddingProvider';
export const VISION_MODELS = {
    'moondream': {
        description: 'Moondream - Tiny, high-performance vision language model',
        size: '1.7GB',
    },
    'llama3.2-vision': {
        description: 'Llama 3.2 Vision - 11B multimodal model',
        size: '7.9GB',
    },
    'llava': {
        description: 'LLaVA - Large Language and Vision Assistant',
        size: '4.7GB',
    },
    'minicpm-v': {
        description: 'MiniCPM-V - Efficient vision-language model',
        size: '5.6GB',
    },
};
const DEFAULT_VISION_MODEL = 'moondream';
const DEFAULT_DESCRIPTION_PROMPT = `Describe this image in detail for semantic search. 
Include:
- Main subject and objects visible
- Colors, textures, and visual elements
- Any text visible in the image
- Context, setting, or environment
- Actions or relationships between elements

Be comprehensive but concise. Focus on searchable details.`;
// ─────────────────────────────────────────────────────────────────────────────
// VisionEmbeddingProvider Class
// ─────────────────────────────────────────────────────────────────────────────
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
export class VisionEmbeddingProvider {
    visionModel;
    baseUrl;
    descriptionPrompt;
    textEmbedder;
    constructor(config = {}) {
        this.visionModel = config.visionModel || DEFAULT_VISION_MODEL;
        this.baseUrl = (config.ollamaBaseUrl || 'http://localhost:11434').replace(/\/$/, '');
        this.descriptionPrompt = config.descriptionPrompt || DEFAULT_DESCRIPTION_PROMPT;
        this.textEmbedder = new OllamaEmbeddingProvider(config.embeddingModel || 'nomic-embed-text', this.baseUrl);
    }
    get modelName() {
        return `vision:${this.visionModel}+${this.textEmbedder.modelName}`;
    }
    get providerName() {
        return 'ollama-vision';
    }
    get dimensions() {
        return 768; // TODO: Should get this dynamically from textEmbedder, but interface assumes sync access
    }
    /**
     * Generate text description of an image.
     *
     * @param imageData - Image as base64 string or Uint8Array
     * @param prompt - Optional custom prompt
     */
    async describeImage(imageData, prompt) {
        let imageB64;
        if (imageData instanceof Uint8Array) {
            imageB64 = this.arrayBufferToBase64(imageData);
        }
        else {
            // Assume it's base64 string or file path
            // Note: In Node.js we might check for file path, but kept abstract here
            imageB64 = imageData;
        }
        const url = `${this.baseUrl}/api/generate`;
        const payload = {
            model: this.visionModel,
            prompt: prompt || this.descriptionPrompt,
            images: [imageB64],
            stream: false
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`Vision model call failed: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return result.response || '';
    }
    /**
     * Generate embedding for an image.
     */
    async embedImage(imageData, prompt) {
        const description = await this.describeImage(imageData, prompt);
        if (!description) {
            throw new Error('Vision model returned empty description');
        }
        console.debug(`Image description: ${description.slice(0, 100)}...`);
        return this.textEmbedder.embed(description);
    }
    /**
     * Generate embedding and return description.
     */
    async embedImageWithDescription(imageData, prompt) {
        const description = await this.describeImage(imageData, prompt);
        const embedding = await this.textEmbedder.embed(description);
        return { embedding, description };
    }
    // ─────────────────────────────────────────────────────────────────────────
    // EmbeddingProvider Implementation
    // ─────────────────────────────────────────────────────────────────────────
    async embed(text) {
        return this.textEmbedder.embed(text);
    }
    async embedBatch(texts) {
        return this.textEmbedder.embedBatch(texts);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Convert Uint8Array to base64 string
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }
    /**
     * Get provider information
     */
    getInfo() {
        return {
            provider: this.providerName,
            visionModel: this.visionModel,
            embeddingModel: this.textEmbedder.modelName,
            availableModels: Object.keys(VISION_MODELS)
        };
    }
}
//# sourceMappingURL=VisionEmbeddingProvider.js.map