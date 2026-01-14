# Chapter 09: CLM Language Semantics and Meta-Circular Programming

This chapter is the **formal bootstrap** for the Cubical Logic Model (CLM) language. It explores the implementation of Domain Specific Languages (DSLs) and the bootstrapping of the **CLM Meta-Language** using the principles of **Meta-Circular Programming**.

## 1. The Architecture of Coherence

The CLM language is built upon **The Architecture of Coherence**, a synthesis of **Petri Nets**, **Category Theory**, and **Lambda Calculus**. This synthesis follows the **Curry-Howard-Lambek (CHL) correspondence**, which establishes a 1:1 mapping between Logic, Category, and Computation.

In this chapter, we map the **Cubical Triad** directly to this computational trinity:

| CLM Dimension | Trinitarian Aspect | Temporal Role | Logical Role | Mathematical Foundation |
| :--- | :--- | :--- | :--- | :--- |
| **abstract_spec** | **Category (Future)** | **Potential** | Structure / Pattern | Category Theory |
| **concrete_impl** | **Computation (Present)** | **Action** | Execution / Firing | Petri Nets |
| **balanced_exp** | **Logic (Past)** | **Fact** | Accountability / Proof | **Lambda Calculus** |

## 2. Why the Meta-Language starts with Lambda

We begin our meta-language bootstrap with **Lambda Calculus** because it represents the **root dimension of Accountability (Past/Fact)**. 

Before a system can define complex structures (Category) or orchestrate resource flows (Petri Nets), it must establish a **"Ground Truth"**—a logical engine capable of producing immutable certificates of identity. Lambda Calculus provides the **Logic of Expression** and the **Engine of Truth** through **Normalization**.

1.  **Normalization as Evidence**: Beta-reduction allows us to find the "canonical form" of any expression. This is the synthesis of "Synthesis" (Balanced Expectation).
2.  **The Triple Point**: By verified lambda normalization, we bridge the gap between "What was intended" (Abstract) and "What was executed" (Concrete).
3.  **Bootstrap Integrity**: Starting with Lambda ensures that the very language we use to verify subsequent DSLs is itself logically sound and self-verifying.

## 3. Key Inspirations and Sources

The design of the MCard meta-language is heavily inspired by the history of self-referential systems and meta-circular evaluators:

*   **SICP (Structure and Interpretation of Computer Programs)**:
    -   Abelson and Sussman's foundational work popularized the **Meta-Circular Evaluator (MCE)** as a tool for "meta-linguistic abstraction."
    -   The core idea: "the evaluator, which determines the meaning of expressions in a programming language, is just another program."

*   **McCarthy's Lisp (1958)**:
    -   John McCarthy introduced the universal `eval` function in Lisp, creating the first practical implementation of a language that could define itself.

*   **Object-Process Network (OPN) / Object-Process Methodology (OPM)**:
    -   OPM (standardized as ISO 19450) provides a minimal ontology of **stateful objects** (MCards) and **processes** (PCards).
    -   OPN treats objects and processes as peer entities, allowing for the mapping of complex, concurrent interactions to a Petri Net transition system.

*   **Algebra of Systems (AoS)**:
    -   Developed by Koo, Simmons, and Crawley (2007), AoS represents system models as **algebraic entities**.
    -   It formalizes model synthesis and evaluation as algebraic operations across properties (P), boolean logic (B), and composition (C).

*   **Applied Category Theory**:
    -   **David Spivak (OLogs)**: Ontology Logs provide a mathematical foundation for knowledge representation. In the CLM, the `abstract_spec` acts as an OLog, defining the schema of relationships.
    -   **Brendan Fong (Algebra of Open Systems)**: Formalizes the compositionality of network-style languages, providing the "glue" for understanding how interconnected components behave as a unified whole.

## 4. The CLM as a Meta-Evaluator

In this project, the **CLM** acts as the meta-evaluator for all other DSLs. By defining the CLM meta-language using CLM itself, we achieve:
-   **Self-Sovereign Semantics**: The rules of the system are stored in the system's own database as content-addressed MCards.
-   **VCard Sandwiching**: Every domain-specific implementation is wrapped in pre/post conditions (VCards), ensuring every "firing" is mathematically consistent with the specification.
-   **The Turing Tape Analogy**: Viewing the database as an "Infinitely Long Tape" where every state transition is a recorded, immutable MCard.

## 5. The Cubical Language Spec (v1.1)

A valid CLM document must define a complete **Triadic Identity** using the following core dimensions:

*   **`abstract_spec` (The "Why")**: 
    -   Must contain: `context`, `goal`, `success_criteria`.
    -   Focuses on the **Categorical Pattern** and the structural blueprint (Polynomial Positions $A_i$).

*   **`concrete_impl` (The "How")**: 
    -   Must contain: `inputs`, `process`, `outputs`.
    -   Optional: `runtime` (defaults to `lambda`), `builtin` (manages itself).
    -   Focuses on the **Mechanism** and the **Computational Transition** (Petri Net firing and Polynomial Directions $B_i$).

*   **`balanced_exp` (The "What")**: 
    -   Must contain: `test_cases` (a list of objects using `given`, `when/arguments`, `then`).
    -   The `given`/`when`/`then` structure follows Behavior-Driven Development (BDD) semantics (Gherkin):
        -   `given`: The initial context of the system (preconditions) before the behavior begins.
        -   `when`: The triggering event/action (the behavior being specified).
        -   `then`: The expected outcome that should be observable after the behavior.
    -   In CLM, this maps to:
        -   `given` is primarily the scenario label, and may be either:
            -   a string description, or
            -   an object with `description`/`name` plus optional `condition` (preferred) or `context` (alias) for preconditions.
        -   `given.condition` (preferred) and `given.context` (alias), if present, are merged into the execution context as preconditions (with `condition` overriding `context` on key collisions).
        -   `when.arguments` carries the concrete action input values for the transition fire (applied after `given.context`).
        -   `then` is the observable evidence predicate for correctness (e.g., `result`, `result_contains`).
    -   References:
        -   https://cucumber.io/docs/gherkin/reference/ (Given/When/Then step semantics)
        -   https://martinfowler.com/bliki/GivenWhenThen.html (Given = preconditions, When = behavior, Then = expected change)
    -   Focuses on the **Evidence** and the **Logical Proof** (Lambda normalization).

## 6. Built-in Semantics

The language supports several **Built-in Runtimes** that enable self-sovereign execution. These are automatically managed when `builtin: true` is set (or defaulted).

| Runtime | Description | Default Process |
| :--- | :--- | :--- |
| `lambda` | Pure Lambda Calculus engine for formal logic. | `normalize` |
| `network` | Built-in HTTP/P2P IO operations. | `http_request` |
| `clm` | Recursive evaluation of other CLM documents. | `verify` |

## 7. CLM Files in This Chapter

| File | Purpose | Examples |
| :--- | :--- | :--- |
| `language_validator.yaml` | Ground truth for CLM syntax validation | 4 |
| `builtin_validator.yaml` | Tests system built-ins (readiness, numeric ops) | 4 |
| `clm_meta_vocabulary.yaml` | Validates v1.1 vocabulary and key aliases | 2 |
| `dimension_validator.yaml` | Meta-circular triadic structure validation | 2 |
| `meta_circular_evaluator.yaml` | SICP-style IF-THEN-ELSE via pure lambda | 3 |
| `combinator_library.yaml` | Foundational combinators (I, K, S, B) | 4 |
| `fixed_point_combinator.yaml` | Y combinator and recursion theory | 3 |

**Total: 7 CLMs, 22 examples**

## 8. Meta-Circular Programming Concepts

### 8.1 Dimension Validator
Validates that CLMs contain the complete Cubical Triad. Uses Church booleans to encode presence/absence of dimensions and AND logic to verify completeness.

### 8.2 Meta-Circular Evaluator
Implements the IF-THEN-ELSE combinator: `IF = λp.λa.λb.p a b`. Demonstrates that booleans ARE control structures in lambda calculus.

### 8.3 Combinator Library
Defines the SKI basis that forms a Turing-complete foundation:
- **I** (Identity): `λx.x`
- **K** (Constant): `λx.λy.x`
- **S** (Substitution): `λx.λy.λz.x z (y z)`
- **Theorem**: `S K K = I`

### 8.4 Fixed-Point Combinator
Explores the Y combinator for recursion enablement. The property `Y F = F (Y F)` is the foundation of self-reference.

## 9. Execution History

The execution of these semantic validators is recorded in the `handle_history` table, mapping transitions from **Abstract Intent** to **Balanced Evidence**. Each success generates a `VerificationVCard` token—a cryptographic "Certificate of Truth" born from the convergence of structure (Category), execution (Computation), and logic (Proof).
