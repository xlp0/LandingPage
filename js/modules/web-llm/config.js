/**
 * Web LLM Configuration
 * Defines available models and generation settings for the Agentic Workflow chat
 */

export const LLM_CONFIG = {
  // Default model to load
  defaultModel: 'Phi-2-q4f16_1',
  
  // Available models
  models: [
    {
      id: 'Phi-2-q4f16_1',
      name: 'Phi-2 (Fast)',
      size: '1.3GB',
      speed: 'Fast',
      quality: 'Good',
      description: 'Quick responses with good quality. Best for general chat.',
      recommended: true
    },
    {
      id: 'Llama-2-7b-chat-hf-q4f16_1',
      name: 'Llama-2 7B (Balanced)',
      size: '4GB',
      speed: 'Medium',
      quality: 'Better',
      description: 'Higher quality responses, moderate speed. Good for detailed conversations.',
      recommended: false
    },
    {
      id: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1',
      name: 'TinyLlama (Ultra Fast)',
      size: '600MB',
      speed: 'Very Fast',
      quality: 'Basic',
      description: 'Fastest responses, basic quality. Good for testing.',
      recommended: false
    }
  ],
  
  // Generation parameters
  generation: {
    temperature: 0.7,        // Creativity (0.0 = deterministic, 1.0 = creative)
    top_p: 0.9,             // Nucleus sampling
    max_tokens: 512,        // Maximum response length
    stream: true,           // Enable streaming responses
    stop: ['\n\nUser:', '\n\nAssistant:']  // Stop sequences
  },
  
  // System prompt for the assistant
  systemPrompt: `You are an intelligent AI assistant integrated into the THK Mesh Landing Page's Agentic Workflow chat.

Your role is to help users with:
- Understanding CLM (Cubical Logic Model) components and MCards
- Navigating the dashboard and its features
- Explaining technical concepts clearly
- Providing workflow guidance and best practices
- Troubleshooting issues

Be concise, helpful, and friendly. Format responses clearly with bullet points or numbered lists when appropriate.`,
  
  // Chat settings
  chat: {
    maxHistoryLength: 10,   // Maximum conversation history to maintain
    contextWindow: 2048,    // Maximum tokens for context
    typingDelay: 50,        // Delay between tokens for streaming effect (ms)
  },
  
  // Performance settings
  performance: {
    cacheEnabled: true,
    maxCacheSize: 5 * 1024 * 1024 * 1024,  // 5GB max cache
    unloadTimeout: 5 * 60 * 1000,          // Unload model after 5 min inactive
  }
};

// Model status enum
export const ModelStatus = {
  UNLOADED: 'unloaded',
  DOWNLOADING: 'downloading',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error'
};

// Error types
export const LLMError = {
  WEBGPU_NOT_AVAILABLE: 'webgpu_not_available',
  MODEL_LOAD_FAILED: 'model_load_failed',
  GENERATION_FAILED: 'generation_failed',
  NETWORK_ERROR: 'network_error'
};
