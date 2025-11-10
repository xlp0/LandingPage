---
Title: TikZ-CD Examples
Description: Category Theory diagrams using LaTeX TikZ-CD rendered locally in the browser
---

# TikZ-CD Examples

This document demonstrates Category Theory diagrams written in LaTeX and rendered using **professional-grade libraries** for authentic LaTeX output.

## Rendering Technology

**TikZJax + MathJax 4** - The gold standard for web-based LaTeX rendering:
- **TikZJax**: Real TeX compilation via WebAssembly for authentic TikZ diagrams
- **MathJax 4**: Comprehensive LaTeX math support with professional typography
- **Output quality**: Identical to desktop LaTeX compilers

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

## Complex Commutative Diagram

```tikzcd
A \arrow[r, "f"] \arrow[d, "g"'] & B \arrow[r, "h"] \arrow[d, "i"] & C \arrow[d, "j"] \\
D \arrow[r, "k"'] \arrow[ru, "l"] & E \arrow[r, "m"] & F
```

## Pullback with Mathematical Notation

```tikzcd
X \times_Z Y \arrow[r, "\pi_1"] \arrow[d, "\pi_2"'] & X \arrow[d, "f"] \\
Y \arrow[r, "g"'] & Z
```

## Isomorphism and Identity Arrows

```tikzcd
G \arrow[r, "\cong", shift left] \arrow[r, "\id"', shift right] & H
```

## Full TikZ Example (Beyond TikZ-CD)

```tikz
\begin{tikzpicture}
  \node (M)  at (0,0) {$M$};
  \node (MxM) at (-2,2) {$M \times M$};
  \node (e) at (2,2) {$1$};
  \draw[->] (MxM) -- node[left]{$m$} (M);
  \draw[->] (e) -- node[right]{$u$} (M);
\end{tikzpicture}
```

---

## Implementation Notes

**Professional Rendering Stack:**

### **TikZJax** (Real TeX Compilation)
- ✅ **Full TikZ support** - Not just TikZ-CD, but complete TikZ syntax
- ✅ **Authentic output** - Uses actual TeX compiler compiled to WebAssembly
- ✅ **Professional quality** - Identical to desktop LaTeX output
- ✅ **All TikZ packages** - Supports libraries, custom styles, advanced features

### **MathJax 4** (Comprehensive Math)
- ✅ **Complete LaTeX support** - All math environments, symbols, packages
- ✅ **Professional typography** - Superior to KaTeX for complex equations
- ✅ **Multiple output formats** - SVG, MathML, HTML-CSS
- ✅ **Extensible** - Custom macros, additional packages

**Features Demonstrated:**
- Node positioning and styling
- Cardinal and diagonal arrows with labels
- Mathematical symbols and notation ($\pi_1$, $\pi_2$, $\cong$, $\id$)
- Complex multi-level commutative diagrams
- Full TikZ (tikzpicture) support beyond TikZ-CD

**Usage:**
````
```tikzcd
A \arrow[r, "f"] & B
```

```tikz
\begin{tikzpicture}
  % Full TikZ syntax here
\end{tikzpicture}
```
````

This professional rendering stack produces **publication-quality diagrams** indistinguishable from those created with desktop LaTeX compilers.
