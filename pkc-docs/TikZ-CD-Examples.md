---
Title: TikZ-CD Examples
Description: Category Theory diagrams using LaTeX TikZ-CD rendered locally in the browser
---

# TikZ-CD Examples

This document demonstrates Category Theory diagrams written in LaTeX and rendered using **pre-rendered professional-quality SVGs** for authentic LaTeX output.

## Rendering Technology

**Pre-rendered SVGs + MathJax 4** - Professional LaTeX quality with instant loading:
- **Pre-rendered SVGs**: Generated offline using real LaTeX (pdflatex + pdf2svg)
- **MathJax 4**: Comprehensive LaTeX math support with professional typography
- **Output quality**: Identical to desktop LaTeX compilers (because it IS desktop LaTeX!)
- **Performance**: Instant loading, works completely offline

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

### **Pre-Rendered SVG Diagrams** (Real LaTeX Output)
- ✅ **Full TikZ support** - Complete TikZ and TikZ-CD syntax
- ✅ **Authentic output** - Generated using actual desktop LaTeX (pdflatex)
- ✅ **Professional quality** - Identical to desktop LaTeX output (because it IS)
- ✅ **Fast & Reliable** - Pre-rendered, instant loading, works offline
- ✅ **Perfect arrows** - All TikZ elements preserved using pdf2svg conversion

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

**How It Works:**
1. TikZ diagrams are written in LaTeX `.tex` files
2. Converted to SVG using `pdflatex` + `pdf2svg` (offline, one-time)
3. SVG files loaded instantly in browser (no compilation needed)
4. System automatically matches TikZ code to pre-rendered SVG
5. Falls back to custom renderer for diagrams not pre-rendered

**Adding New Diagrams:**
See `assets/tikz-diagrams/README.md` for instructions on:
- Creating new `.tex` files
- Running `convert-to-svg.sh` to generate SVGs
- Updating the manifest for automatic matching

This **pre-rendering approach** produces **publication-quality diagrams** identical to desktop LaTeX output, with the added benefits of instant loading and offline support.
