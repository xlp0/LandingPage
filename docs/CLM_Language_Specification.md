# The Cubical Logic Model (CLM) Language Specification

## 1. Introduction

The **Cubical Logic Model (CLM)** is a domain-specific language (DSL) based on YAML, designed to define **Polynomial Cards (PCards)**—verifiable, executable units of logic. It treats logic not as a black box, but as a three-dimensional construct with clear separation between **Specification (Abstract)**, **Implementation (Concrete)**, and **Verification (Balanced)**.

This language is the foundation of the MCard system's **Polynomial Type Runtime (PTR)**, enabling verifiable execution, polyglot interoperability, and rigorous auditing.

## 2. File Structure & Syntax

A CLM file is a valid YAML document that describes either a **Narrative Chapter** or a **Raw PCard**.

### 2.1. File Extensions
*   **.clm**: Preferred extension for individual PCard definitions.
*   **.yaml / .yml**: Standard extensions, often used for Chapters or configuration files.

### 2.2. Root Structure Variations

#### A. The Narrative Chapter (Standard)
Used for defining logic within the "Prologue of Spacetime" narrative framework.
```yaml
chapter:
  id: 1
  title: "Arithmetic Logic"
  mvp_card: "The Calculator"
  pkc_task: "Computation"

clm:
  abstract: { ... }
  concrete: { ... }
  balanced: { ... }
```

#### B. The Raw PCard (Simplified)
Used for atomic, reusable components (e.g., in `chapters/samples/`).
```yaml
type: PCard
metadata:
  name: "Sine Function"
  version: "1.0.0"

# Dimensions defined at the root
abstract: { ... }
concrete: { ... }
balanced: { ... }
```

## 3. The Three Dimensions (Grammar & Semantics)

### 3.1. Abstract Dimension (Thesis / WHAT)
Defines the **Concept**. This is the functional specification.

*   **`purpose`** / **`concept`**: (String) A human-readable description of what the logic does.
*   **`inputs`**: (Dict) Schema of accepted inputs.
    *   Keys are parameter names.
    *   Values describe types (`float`, `string`, `dict`) and constraints.
*   **`outputs`**: (Dict) Schema of expected results.
*   **`preconditions`**: (List[String]) Logical assertions that must be true before execution.
*   **`postconditions`**: (List[String]) Logical assertions guaranteed to be true after successful execution.

**Example:**
```yaml
abstract:
  purpose: "Calculate the sine of an angle."
  inputs:
    angle: { type: "float", description: "Angle in radians" }
  outputs:
    result: { type: "float", range: [-1.0, 1.0] }
```

### 3.2. Concrete Dimension (Antithesis / HOW)
Defines the **Manifestation**. This section binds the abstract requirements to a specific implementation.

*   **`runtime`**: (Required) Execution environment (e.g., `python`, `javascript`, `rust`, `c`, `wasm`, `lean`).
*   **`code_source`**: (One of the following is required):
    *   **`code_file`**: Path to source file (relative or `module://`).
    *   **`binary_path`**: Path to compiled executable.
    *   **`wasm_module`**: Path to .wasm file.
    *   **`code_hash`**: MCard hash of the implementation (CAS retrieval).
*   **`entry_point`**: (Optional) Specific function or symbol to invoke (e.g., `main`, `run_benchmark`).
*   **Process Definition** (Standardized Keywords):
    *   **`input_type`**: Type of input data (e.g., `directory`, `file`, `mcard`, `void`).
    *   **`process_type`**: Nature of the operation. Common values:
        *   `transform`: stateless data conversion.
        *   `benchmark`: performance analysis.
        *   `passthrough`: identity operation.
        *   `custom`: implementation-specific logic.
    *   **`output_type`**: Type of output artifact (e.g., `sqlite`, `json`, `report`, `mcard`).

**Example:**
```yaml
concrete:
  runtime: "python"
  code_file: "loader_logic.py"
  entry_point: "run_loader_benchmark"
  input_type: "directory"
  process_type: "benchmark"
  entry_point: "run_loader_benchmark"
  input_type: "directory"
  process_type: "benchmark"
  output_type: "sqlite"

### 2.3. Specialized Reserved Words (Standardized Operations)
To ensure consistent implementation of common I/O patterns, specific `builtin` reserved words are defined. Runtimes SHOULD implement these natively or via standardized libraries (like `mcard.file_io`).

*   **`builtin: load_content`**: Standardized file ingestion.
    *   **Behavior**: Recursively or non-recursively loads files from a directory or path.
    *   **Features**: Pathological content detection, soft-wrapping for minified text, binary detection, MIME type inference.
    *   **Config**: `recursive`, `include_problematic`, `soft_wrap`.

*   **`builtin: load_url`**: Standardized network ingestion.
    *   **Behavior**: Fetches content from a URL.
    *   **Features**: Timeout handling, User-Agent rotation (optional), content type detection.
    *   **Config**: `timeout`, `headers`.
```

### 3.3. Balanced Dimension (Synthesis / WHY)
Defines the **Expectation** and **Configuration**. This dimension provides the specific parameters for execution and verification.

*   **`input_arguments`**: (Dict) Static default parameters for inputs.
*   **`output_arguments`**: (Dict) Static default parameters for outputs.
*   **`expected_results`**: (Dict) General success criteria.
*   **`test_cases`**: (List) Table-driven verification scenarios.

**Test Case Structure:**
*   **`given`**: Input description or content.
*   **`when`**: Execution Context.
    *   **`params`**: Direct argument overrides for the entry point.
    *   **`context`**: Deep context overrides (e.g., swapping `output_arguments` for a test run).
*   **`then`**: Assertions.
    *   **`success`**: (Boolean) Did it run without error?
    *   **`result`**: (Any) Exact match expectation.
    *   **`epsilon`**: (Float) Tolerance for numeric comparison.

**Example:**
```yaml
balanced:
  # Static Defaults
  input_arguments:
    retrieval_count: 100
    
  test_cases:
    - description: "Benchmark Tech loading"
      given: "Start Benchmark"
      when:
        params:
          # Overrides default retrieval_count
          retrieval_count: 50
        context:
          # Injects specific output config
          output_arguments:
             db_path: "data/tech.db"
      then:
        success: true
```

## 4. Integration Features

### 4.1. MCard Collection & Content Addressing
The CLM language is deeply integrated with MCard's Content Addressable Storage (CAS):
*   **`algorithm`**: Defined properties can be hashed to create a unique **PCard Identity**.
*   **`code_hash`**: Allows the `concrete` dimension to point to an immutable blob in basic storage rather than a mutable file on disk.
*   **Input/Output**: Inputs (`given`) are converted to MCards before being passed to the runtime.

### 4.2. Context & Parameter Passing
The execution context flows through the CLM:
1.  **Global Context**: Provided by the runner/user (e.g., CLI args).
2.  **Balanced Defaults**: `input_arguments` and `output_arguments` from the CLM root are merged.
3.  **Test Case Context**: `when.context` merges and overrides defaults.
4.  **Test Case Params**: `when.params` provide direct function arguments.
5.  **Result**: The final context is available to the runtime logic.

### 4.3. URL & Path Resolution
*   **Relative Paths**: `code_file`, `binary_path`, and `wasm_module` are resolved relative to the referencing YAML file. This allows self-contained "Chapter Bundles".
*   **Future URL Support**: The `code_hash` field suggests a future capability to load code via `mcard://<hash>` URIs.

### 4.4. Recursive CLM Runtimes (Meta-Circular Interpretation)
The `runtime` field can point to another CLM definition (file or content), enabling meta-circular interpretation.
*   **Syntax**: `runtime: "path/to/meta_interpreter.clm"`
*   **Behavior**:
    1.  The PTR executes the target **Meta-CLM**.
    2.  The current PCard's definition is injected into the Meta-CLM's context.
    3.  The current PCard's input (`given`) is passed as the input to the Meta-CLM.
*   **Use Case**: Defining PCards that interpret other PCards, fostering higher-order logic composition (e.g., a "Validator" PCard that runs other PCards).

### 4.5. Language Agnostic Execution
The PTR is designed for **language agnostic execution**, which allows for many different language runtimes to load other language runtimes to run CLM code exactly the same way. This means:
*   **Uniform Interface**: A Python runtime can load a Lean runtime, which can load a Rust runtime, all through the same CLM interface.
*   **Consistent Behavior**: The execution model (Abstract/Concrete/Balanced) remains invariant regardless of the underlying language.
*   **Recursive Composition**: Runtimes can be composed recursively (as described in 4.4), enabling complex, multi-language systems to be built from simple, verifiable components.

## 5. Pragmatics & Execution Flow

1.  **Parsing**: The `CLMChapterLoader` reads the YAML. It detects if it's a Chapter or Raw PCard.
2.  **Assembly**: It constructs a `CLMConfiguration` object.
3.  **Runtime Selection**: Based on `concrete.runtime`, it selects a `SandboxedExecutor`.
4.  **Resource Loading**: Files referenced by `code_file` etc. are loaded into memory or prepared for the sandbox.
5.  **Test Iteration**: If `balanced.test_cases` exist, the `logic_func` wrapper iterates through them, injecting inputs and verifying `then` expectations.
6.  **Monadic Result**: The execution returns a `NarrativeMonad`, encapsulating the specific Result, the internal State change, and the Audit Log.

## 6. Suggestions for Language Improvement

Based on the analysis of the current implementation, the following improvements are recommended:

### A. [Implemented] Unify `logic_source` and `code_*`
(Supported via `code_file: module://...` syntax)

### B. Formalize `given` Inputs
The `given` field allows primitive strings, but MCard is about *Cards*.
*   **Suggestion**: Support structured `given` that clearly distinguishes between *Content Body* (string/bytes) and *Metadata/Header*.
    ```yaml
    given:
      content: "..."
      type: "application/json"
    ```

### C. Explicit Runtime Versioning
`runtime: python` is vague.
*   **Suggestion**: Support `runtime: python@3.9` or `runtime_config: { version: ">=3.9" }` to ensure reproducibility.

### D. Separation of Test Data
Embedding large test suites in YAML can be unwieldy.
*   **Suggestion**: Allow `balanced.test_cases` to point to an external file: `test_cases: "tests/suite_01.yaml"`.

### E. Standardized Error Handling
Currently, errors are often returned as strings like `"Error: ..."`.
*   **Suggestion**: Define a standard `error` schema in `abstract.outputs` so runtimes return structured error objects `{ "code": 500, "message": "..." }`.

### F. Composable Pipelines (Next Step)
While recursive runtimes enable vertical composition (interpreters), horizontal composition (pipelines) is missing.
*   **Suggestion**: Introduce a `pipeline` operation or `Chapter` type that links multiple PCards in a sequence, where the output of `Step N` becomes the input of `Step N+1`.
    ```yaml
    concrete:
      runtime: "pipeline"
      steps:
        - pcard: "step1_transform.clm"
        - pcard: "step2_validate.clm"
    ```
