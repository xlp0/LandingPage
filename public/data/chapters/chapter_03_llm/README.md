# Chapter 3: LLM Integration

This chapter introduces the **LLM Runtime**, enabling Large Language Model execution as a first-class CLM runtime within the PTR system.

## 🎯 Purpose

Demonstrate how LLMs can be integrated into the Cubical Logic Model framework using:
- **Monadic Composition**: `IO[Either[Error, Response]]` pattern
- **Provider Abstraction**: Pluggable LLM backends (Ollama, LMStudio, OpenAI)
- **CLM Verification**: Standard Abstract/Concrete/Balanced structure

## 📁 Files

| File | Description |
|------|-------------|
| `summarize.clm` | Text summarization CLM |
| `question_answer.clm` | Q&A with llama3 |
| `entity_extraction.clm` | JSON entity extraction |
| `file_summarizer.clm` | File summarization CLM |
| `file_summarizer_logic.py` | Logic for reading and summarizing files |

## 🚀 Quick Start

### Prerequisites

1. **Install Ollama**: https://ollama.ai/download
2. **Start Ollama**: `ollama serve`
3. **Pull models**:
   ```bash
   ollama pull gemma3:latest
   ollama pull llama3:latest
   ```

### Run Demos

```bash
# Check Ollama status
uv run python scripts/demo_llm_runtime.py --check

# Run all demos
uv run python scripts/demo_llm_runtime.py

# Interactive chat
uv run python scripts/demo_llm_runtime.py --chat

# Summarize a file
uv run python chapters/chapter_03_llm/file_summarizer_logic.py README.md brief
uv run python chapters/chapter_03_llm/file_summarizer_logic.py mcard/ptr/core/engine.py bullet_points
```

## 💡 Usage Examples

### Monadic Interface

```python
from mcard.ptr.core.llm import chat_monad

result = chat_monad(
    prompt="What is a monad?",
    system_prompt="You are a programming tutor.",
    model="gemma3:latest",
    temperature=0.7
).unsafe_run()

if result.is_right():
    print(result.value['content'])
```

### RuntimeFactory Integration

```python
from mcard.ptr.core.runtime import RuntimeFactory

# LLM is now a first-class runtime
executor = RuntimeFactory.get_executor('llm')
```

### CLM Definition

```yaml
abstract:
  purpose: Summarize text
  inputs:
    text: {type: string}
  outputs:
    summary: {type: string}

concrete:
  runtime: llm
  provider: ollama
  model: gemma3:latest
  llm_config:
    system_prompt: "You are a summarizer."
    temperature: 0.3
    max_tokens: 200
```

## 🏗️ Architecture

```
mcard/ptr/core/llm/
├── __init__.py          # Package exports
├── config.py            # LLMConfig, LLM_PROVIDERS
├── runtime.py           # LLMRuntime, prompt_monad, chat_monad
└── providers/
    ├── base.py          # LLMProvider ABC
    └── ollama.py        # OllamaProvider
```

## 📊 Supported Providers

| Provider | Status | Base URL |
|----------|--------|----------|
| Ollama | ✅ Implemented | `localhost:11434` |
| LMStudio | 🔜 Planned | `localhost:1234` |
| OpenAI | 🔜 Planned | `api.openai.com` |
| Anthropic | 🔜 Planned | `api.anthropic.com` |

## 🔧 Configuration

```python
from mcard.ptr.core.llm import LLMConfig

config = LLMConfig(
    provider='ollama',
    model='gemma3:latest',
    system_prompt="You are helpful.",
    temperature=0.7,
    max_tokens=2048,
    top_p=1.0,
    timeout=120
)
```

## 🧪 Tests

```bash
uv run pytest tests/test_llm_runtime.py -v
```

---

**Next Chapter**: Chapter 4 - Observability (Traces, Metrics, Logs)
