---
Title: TikZ-CD Examples
Description: Category Theory diagrams using LaTeX TikZ-CD rendered locally in the browser
---

# TikZ-CD Examples

This document demonstrates Category Theory diagrams written in LaTeX and rendered locally in the browser using a custom JavaScript renderer.

## Simple Commutative Square

```tikzcd
A \arrow[r, "f"] \arrow[d, "g"'] & B \arrow[d, "h"] \\
C \arrow[r, "k"'] & D
```

## Pullback Square

```tikzcd
P \arrow[r] \arrow[d] & X \arrow[d, "p"] \\
Y \arrow[r, "q"'] & Z
```

## Triangle with Natural Transformation

```tikzcd
F(A) \arrow[rr, "F(f)"] \arrow[dr, "\eta_A"'] & & F(B) \\
& G(A) \arrow[ur, "G(f)"'] &
```

---

## Implementation Notes

**Rendering Method:** Local JavaScript renderer (no external dependencies)

**Supported:**
- TikZ-CD commutative diagrams via `tikzcd` fenced blocks
- Basic arrow directions: `r` (right), `l` (left), `d` (down), `u` (up)
- Simple node labels
- Grid-based layout

**Not Supported Yet:**
- Full TikZ (tikzpicture) - only TikZ-CD syntax
- Complex arrow styling and labels
- Custom node shapes and positioning

**Usage:**
````
```tikzcd
A \arrow[r, "f"] & B
```
````

This renderer works entirely client-side with no external network calls required.
