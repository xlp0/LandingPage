# MCard Chapters & Samples

This directory contains the executable content for the MCard project, organized into narrative chapters and atomic samples.

## Directory Structure

### 📖 Narrative Chapters
These chapters follow the "Prologue of Spacetime" meta-narrative, demonstrating the progressive capabilities of the MCard system.

*   **`chapter_00_prologue/`**: **The Value of Counting**
    *   Establishes the MVP Card (The Counter).
    *   Demonstrates how observation (IO) creates discrete identity (State).
    *   Key file: `specification.yaml`

*   **`chapter_01_arithmetic/`**: **Resource-Aware Computation**
    *   Demonstrates polyglot consensus across Python, JS, Rust, C, WASM, R, and Julia.
    *   Implements the Cubical Logic Model through arithmetic operations.
    *   Includes 6 standalone Lean CLMs: addition, multiplication, factorial, GCD, primality, propositional logic.
    *   **`sine/`** subfolder: Benchmarks `math.sin` vs Taylor Series vs Chebyshev Series (Py/C/Rust).
    *   Key files: `advanced_comparison.yaml`, `sine/sine_comparison.yaml`

*   **`chapter_02_handle/`**: **Content Addressing**
    *   Introduces the Content Handle system (Human-readable names -> Content Hash).
    *   Demonstrates dual retrieval and UTF-8 handle validation.
    *   Key file: `dual_retrieval.clm`

*   **`chapter_03_llm/`**: **LLM Integration**
    *   LLM runtime integration and file summarization.
    *   Uses mock implementations for test stability.
    *   Key file: `file_summarizer.clm`

*   **`chapter_05_reflection/`**: **Meta-Execution**
    *   Meta-echo and recursive CLM demonstration.
    *   Module syntax testing.
    *   Key files: `meta_echo.clm`, `recursive_demo.clm`

*   **`chapter_06_lambda/`**: **Lambda Calculus**
    *   Beta reduction and Church numerals implementation.
    *   Pure λ-calculus interpreter in JavaScript.
    *   Key files: `beta_reduction.yaml`, `church_numerals.yaml`

*   **`chapter_07_network/`**: **Network IO**
    *   HTTP fetch, MCard send/receive, sync server/client.
    *   Network runtime demonstrations.
    *   Key files: `http_fetch.yaml`, `sync_server.yaml`

*   **`chapter_08_P2P/`**: **Peer-to-Peer Sessions**
    *   Long session simulation with checkpointing.
    *   Multi-agent orchestration.
    *   Key files: `long_session_simulation.yaml`, `orchestrate_long_session_db.yaml`

### 🧪 Atomic Samples
*   **`samples/`**: **PCard Sandbox**
    *   Contains individual, atomic PCards for testing specific features or runtimes.
    *   Examples:
        *   `python_complex_arithmetic.clm`: Advanced math operations.
        *   `trig_sine.clm`: Trigonometry verification.
        *   `runtime_status_check.clm`: System diagnostics.

## 🚀 Running Chapters

Use the **Polynomial Type Runtime (PTR) CLI** to execute any chapter or sample:

```bash
# Python PTR CLI
uv run python -m mcard.ptr.cli run chapters/chapter_00_prologue/specification.yaml
uv run python -m mcard.ptr.cli run chapters/chapter_01_arithmetic/advanced_comparison.yaml

# JavaScript PTR CLI
cd mcard-js
npx tsx examples/run-all-clms.ts                      # Run all CLMs
npx tsx examples/run-all-clms.ts chapter_01_arithmetic  # Run specific chapter
npx tsx examples/run-all-clms.ts --verbose beta_reduction  # Run with verbose output
```

## ⏱️ CLM Status (December 2025)

| Chapter | CLMs | Status |
|---------|------|--------|
| chapter_00_prologue | 2 | ✅ All passing |
| chapter_01_arithmetic | 32 | ✅ All passing |
| chapter_02_handle | 1 | ✅ All passing |
| chapter_03_llm | 1 | ✅ All passing (mock) |
| chapter_05_reflection | 3 | ✅ All passing |
| chapter_06_lambda | 2 | ✅ All passing |
| chapter_07_network | 5 | ✅ All passing |
| chapter_08_P2P | 16 | ✅ All passing |

