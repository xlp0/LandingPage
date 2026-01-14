# Chapter 00: Prologue - The First Steps

This chapter introduces the fundamental concepts of Cubical Logic Models (CLM) through simple, self-contained examples.

## Getting Started

If you are new to CLM, start with these "One-Liner" examples:

1.  **[Hello World](hello_world.yaml)**
    *   **Concept**: The Identity Function (I).
    *   **Goal**: Return the input unchanged.
    *   **Key Feature**: Observed by the IO Monad.

2.  **[Boolean Choice](boolean_choice.yaml)**
    *   **Concept**: Logic as Selection.
    *   **Goal**: `TRUE` selects the first option, `FALSE` selects the second.

3.  **[Simple Math](simple_math.yaml)**
    *   **Concept**: Church Arithmetic.
    *   **Goal**: Compute `1 + 1 = 2` and decode the result to a readable integer.

4.  **[Println Demo](println_demo.yaml)**
    *   **Concept**: IO Verbosity Control.
    *   **Goal**: Toggle between Verbose, Minimal, and Silent output modes.

## Advanced Examples

Once you grasp the basics, explore these deeper concepts:

*   **[IO Monad Demo](io_monad_demo.yaml)**: Detailed look at side-effects in pure functional programming.
*   **[Logic Gates](logic_gates.yaml)**: Building AND, OR, NOT gates from Boolean selectors.
*   **[Church Counting](church_counting.yaml)**: Counting with functions.
*   **[Action Logic](action_logic.yaml)**: Combining state actions (Monads) with Logic.

## Running the Examples

You can run any CLM using the CLI:

```bash
# Python
uv run scripts/run_clms.py chapters/chapter_00_prologue/hello_world.yaml

# JavaScript
npm --prefix mcard-js run clm:run -- chapters/chapter_00_prologue/hello_world.yaml
```
