/**
 * LLM Manager
 * Manages Web LLM initialization, model loading, and response generation
 */

import * as webllm from "@mlc-ai/web-llm";
import { LLM_CONFIG, ModelStatus, LLMError } from './config.js';

export class LLMManager {
  constructor() {
    this.engine = null;
    this.status = ModelStatus.UNLOADED;
    this.currentModel = null;
    this.conversationHistory = [];
    this.onStatusChange = null;
    this.onProgress = null;
    this.inactivityTimer = null;
  }

  /**
   * Check if WebGPU is available
   */
  async checkWebGPUAvailability() {
    if (!navigator.gpu) {
      console.error('[LLM] WebGPU is not available');
      return false;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.error('[LLM] No WebGPU adapter found');
        return false;
      }
      console.log('[LLM] WebGPU is available');
      return true;
    } catch (error) {
      console.error('[LLM] WebGPU check failed:', error);
      return false;
    }
  }

  /**
   * Initialize and load a model
   */
  async initialize(modelId = LLM_CONFIG.defaultModel) {
    try {
      // Check WebGPU availability
      const hasWebGPU = await this.checkWebGPUAvailability();
      if (!hasWebGPU) {
        this.updateStatus(ModelStatus.ERROR);
        throw new Error(LLMError.WEBGPU_NOT_AVAILABLE);
      }

      this.updateStatus(ModelStatus.LOADING);
      this.currentModel = modelId;

      console.log(`[LLM] Initializing model: ${modelId}`);

      // Create engine with progress callback
      this.engine = await webllm.CreateMLCEngine(
        modelId,
        {
          initProgressCallback: (progress) => {
            console.log(`[LLM] Loading progress: ${progress.text}`);
            if (this.onProgress) {
              this.onProgress(progress);
            }
          }
        }
      );

      this.updateStatus(ModelStatus.READY);
      console.log('[LLM] Model loaded successfully');
      
      // Reset inactivity timer
      this.resetInactivityTimer();
      
      return true;
    } catch (error) {
      console.error('[LLM] Initialization failed:', error);
      this.updateStatus(ModelStatus.ERROR);
      throw error;
    }
  }

  /**
   * Generate a response with streaming
   */
  async generateResponse(userMessage, onStreamToken) {
    if (this.status !== ModelStatus.READY) {
      throw new Error('Model is not ready');
    }

    try {
      // Reset inactivity timer
      this.resetInactivityTimer();

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Trim history if too long
      if (this.conversationHistory.length > LLM_CONFIG.chat.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-LLM_CONFIG.chat.maxHistoryLength * 2);
      }

      // Build messages array with system prompt
      const messages = [
        {
          role: 'system',
          content: LLM_CONFIG.systemPrompt
        },
        ...this.conversationHistory
      ];

      console.log('[LLM] Generating response...');

      let fullResponse = '';

      // Generate with streaming
      const completion = await this.engine.chat.completions.create({
        messages: messages,
        temperature: LLM_CONFIG.generation.temperature,
        top_p: LLM_CONFIG.generation.top_p,
        max_tokens: LLM_CONFIG.generation.max_tokens,
        stream: true,
      });

      // Stream tokens
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;
          if (onStreamToken) {
            onStreamToken(delta);
          }
        }
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      });

      console.log('[LLM] Response generated');
      return fullResponse;

    } catch (error) {
      console.error('[LLM] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a non-streaming response
   */
  async generateResponseSync(userMessage) {
    let fullResponse = '';
    await this.generateResponse(userMessage, (token) => {
      fullResponse += token;
    });
    return fullResponse;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    console.log('[LLM] Conversation history cleared');
  }

  /**
   * Unload the model
   */
  async unload() {
    if (this.engine) {
      console.log('[LLM] Unloading model...');
      this.engine = null;
      this.updateStatus(ModelStatus.UNLOADED);
      this.clearInactivityTimer();
      console.log('[LLM] Model unloaded');
    }
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelId) {
    await this.unload();
    await this.initialize(modelId);
  }

  /**
   * Update status and notify listeners
   */
  updateStatus(newStatus) {
    this.status = newStatus;
    if (this.onStatusChange) {
      this.onStatusChange(newStatus);
    }
  }

  /**
   * Reset inactivity timer
   */
  resetInactivityTimer() {
    this.clearInactivityTimer();
    
    if (LLM_CONFIG.performance.unloadTimeout > 0) {
      this.inactivityTimer = setTimeout(() => {
        console.log('[LLM] Unloading model due to inactivity');
        this.unload();
      }, LLM_CONFIG.performance.unloadTimeout);
    }
  }

  /**
   * Clear inactivity timer
   */
  clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Check if model is ready
   */
  isReady() {
    return this.status === ModelStatus.READY;
  }

  /**
   * Get current model info
   */
  getCurrentModel() {
    return LLM_CONFIG.models.find(m => m.id === this.currentModel);
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return LLM_CONFIG.models;
  }
}

// Singleton instance
let llmManagerInstance = null;

export function getLLMManager() {
  if (!llmManagerInstance) {
    llmManagerInstance = new LLMManager();
  }
  return llmManagerInstance;
}
