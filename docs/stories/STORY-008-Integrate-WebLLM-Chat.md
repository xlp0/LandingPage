# STORY-008: Integrate Web LLM into Agentic Workflow Chat

**Epic:** EPIC-002 - AI-Powered Agentic Workflow  
**Status:** 🔄 IN PROGRESS  
**Priority:** P1 - High  
**Points:** 8  
**Assignee:** Development Team  
**Created:** 2025-12-06  

## User Story

**As a** user of the landing page  
**I want** the Agentic Workflow chat to use a local Web LLM  
**So that** I can have intelligent AI conversations without requiring a backend server

## Acceptance Criteria

- [ ] Web LLM library integrated into the project
- [ ] LLM model loads in the browser (e.g., Llama-2-7B, Phi-2, or similar)
- [ ] Chat messages are processed by the local LLM
- [ ] Loading indicator shows while model is initializing
- [ ] Model selection UI allows choosing different models
- [ ] Responses stream in real-time as they're generated
- [ ] Context from previous messages is maintained
- [ ] Performance is acceptable (< 5s response time)
- [ ] Memory usage is reasonable (< 2GB)
- [ ] Graceful fallback if WebGPU is not available

## Technical Details

### Technology Stack

**Web LLM Options:**
1. **@mlc-ai/web-llm** - Recommended
   - Supports multiple models (Llama, Phi, Mistral)
   - WebGPU acceleration
   - Streaming responses
   - Good documentation

2. **Transformers.js** - Alternative
   - Hugging Face integration
   - Broader model support
   - WASM fallback

### Architecture

```
┌─────────────────────────────────────┐
│   Agentic Workflow Chat Panel      │
├─────────────────────────────────────┤
│  User Input                         │
│         ↓                           │
│  Chat Manager                       │
│         ↓                           │
│  Web LLM Engine ← Model Cache      │
│         ↓                           │
│  Streaming Response                 │
│         ↓                           │
│  Display in Chat                    │
└─────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Setup & Integration
1. Install Web LLM library
   ```bash
   npm install @mlc-ai/web-llm
   ```

2. Create LLM manager module
   ```javascript
   // js/modules/web-llm/llm-manager.js
   class LLMManager {
     async initialize(modelName)
     async generateResponse(prompt, onStream)
     async unload()
   }
   ```

3. Integrate with chat panel
   - Replace simulated responses
   - Add loading states
   - Handle streaming

#### Phase 2: Model Loading
1. Add model selection UI
   - Dropdown in chat header
   - Available models list
   - Model info (size, speed)

2. Implement model caching
   - Cache in IndexedDB
   - Progress indicator
   - Resume interrupted downloads

3. Loading states
   - Initial model download
   - Model initialization
   - Ready state

#### Phase 3: Chat Integration
1. Update `sendMessage()` function
   ```javascript
   async function sendMessage() {
     const message = chatInput.value.trim();
     addMessage(message, true);
     
     // Show typing indicator
     showTypingIndicator();
     
     // Generate response with streaming
     await llmManager.generateResponse(
       buildPrompt(message),
       (token) => updateStreamingMessage(token)
     );
   }
   ```

2. Context management
   - Maintain conversation history
   - Token limit management
   - Context window optimization

3. Streaming UI
   - Real-time token display
   - Smooth text animation
   - Stop generation button

#### Phase 4: Optimization
1. Performance tuning
   - Batch size optimization
   - Temperature/top-p settings
   - Max tokens configuration

2. Memory management
   - Model unloading when inactive
   - Cache size limits
   - Garbage collection

3. Error handling
   - WebGPU not available
   - Model loading failures
   - Generation errors

### Recommended Models

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| **Phi-2** | 1.3GB | Fast | Good | Quick responses |
| **Llama-2-7B** | 4GB | Medium | Better | Balanced |
| **Mistral-7B** | 4GB | Medium | Best | High quality |
| **TinyLlama** | 600MB | Very Fast | Basic | Testing |

**Recommendation:** Start with **Phi-2** for best balance of size/speed/quality.

### File Structure

```
js/modules/web-llm/
├── llm-manager.js          # Main LLM engine
├── model-loader.js         # Model download/cache
├── prompt-builder.js       # Prompt formatting
├── streaming-handler.js    # Token streaming
└── config.js              # Model configurations
```

### Dependencies

```json
{
  "dependencies": {
    "@mlc-ai/web-llm": "^0.2.0"
  }
}
```

### Configuration

```javascript
// js/modules/web-llm/config.js
export const LLM_CONFIG = {
  defaultModel: 'Phi-2-q4f16_1',
  models: [
    {
      id: 'Phi-2-q4f16_1',
      name: 'Phi-2 (Fast)',
      size: '1.3GB',
      description: 'Quick responses, good quality'
    },
    {
      id: 'Llama-2-7b-chat-hf-q4f16_1',
      name: 'Llama-2 7B (Balanced)',
      size: '4GB',
      description: 'Better quality, moderate speed'
    }
  ],
  generation: {
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 512,
    stream: true
  }
};
```

## Implementation Tasks

### Task 1: Setup Web LLM
- [ ] Install @mlc-ai/web-llm package
- [ ] Create llm-manager.js module
- [ ] Add model configuration
- [ ] Test basic initialization

### Task 2: Model Loading UI
- [ ] Add model selector to chat header
- [ ] Implement loading progress bar
- [ ] Show model status (downloading/loading/ready)
- [ ] Handle WebGPU availability check

### Task 3: Chat Integration
- [ ] Replace simulated responses with LLM
- [ ] Implement streaming response display
- [ ] Add typing indicator
- [ ] Maintain conversation context

### Task 4: Optimization
- [ ] Implement model caching
- [ ] Add stop generation button
- [ ] Optimize token generation speed
- [ ] Add error handling

### Task 5: Testing
- [ ] Test with different models
- [ ] Test on different browsers (Chrome, Edge)
- [ ] Test WebGPU fallback
- [ ] Performance benchmarking

## Testing Strategy

### Unit Tests
```javascript
describe('LLMManager', () => {
  test('initializes model successfully', async () => {
    const llm = new LLMManager();
    await llm.initialize('Phi-2-q4f16_1');
    expect(llm.isReady()).toBe(true);
  });
  
  test('generates response with streaming', async () => {
    const tokens = [];
    await llm.generateResponse('Hello', (token) => {
      tokens.push(token);
    });
    expect(tokens.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests
- Test full chat flow with LLM
- Test model switching
- Test context management
- Test error scenarios

### Performance Tests
- Measure model loading time
- Measure response generation time
- Monitor memory usage
- Test with long conversations

## Success Metrics

- ✅ Model loads in < 30 seconds
- ✅ First token in < 2 seconds
- ✅ Full response in < 5 seconds
- ✅ Memory usage < 2GB
- ✅ Works in Chrome/Edge with WebGPU
- ✅ Graceful degradation without WebGPU

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large model size | High | Start with Phi-2 (1.3GB) |
| Slow generation | Medium | Use quantized models, optimize settings |
| Browser compatibility | High | Check WebGPU, provide fallback message |
| Memory issues | Medium | Implement model unloading, cache limits |

## References

- [Web LLM Documentation](https://github.com/mlc-ai/web-llm)
- [WebGPU Support](https://caniuse.com/webgpu)
- [Model Zoo](https://huggingface.co/mlc-ai)

## Notes

- WebGPU is required for good performance
- Supported browsers: Chrome 113+, Edge 113+
- Models are cached in browser storage
- First load requires downloading model (~1-4GB)
- Subsequent loads are instant from cache

---

**Next Steps:**
1. Install @mlc-ai/web-llm
2. Create LLMManager class
3. Add model selector UI
4. Integrate with chat panel
5. Test and optimize
