---
title: LaTeX Rendering Test
author: Test Document
created: 2025-11-05
---

# LaTeX Math Rendering Test

This document tests both inline and display LaTeX math rendering.

## Inline Math Examples

Here's an inline equation: $E = mc^2$ which is Einstein's famous equation.

The Pythagorean theorem states that $a^2 + b^2 = c^2$ for right triangles.

We can also write summations inline like $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$.

## Display Math Examples

Here's Einstein's equation in display mode:

```math
E = mc^2
```

The quadratic formula:

```math
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```

A more complex example with matrices featuring Singular Value Decomposition (SVD) and block matrix operations:

```math
\mathbf{A} = \mathbf{U}\boldsymbol{\Sigma}\mathbf{V}^* = 
\begin{bmatrix}
| & | & & | \\
\mathbf{u}_1 & \mathbf{u}_2 & \cdots & \mathbf{u}_r \\
| & | & & |
\end{bmatrix}
\begin{bmatrix}
\sigma_1 & 0 & \cdots & 0 \\
0 & \sigma_2 & \cdots & 0 \\
\vdots & \vdots & \ddots & \vdots \\
0 & 0 & \cdots & \sigma_r
\end{bmatrix}
\begin{bmatrix}
— & \mathbf{v}_1^* & — \\
— & \mathbf{v}_2^* & — \\
& \vdots & \\
— & \mathbf{v}_r^* & —
\end{bmatrix}
```

For a partitioned system with block Kronecker structure:

```math
\left[\begin{array}{c|c}
\mathbf{A}_{11} \otimes \mathbf{I}_n & \mathbf{A}_{12} \otimes \mathbf{B} \\
\hline
\mathbf{A}_{21} \otimes \mathbf{B}^T & \mathbf{A}_{22} \otimes \mathbf{I}_m
\end{array}\right]
\begin{bmatrix}
\text{vec}(\mathbf{X}_1) \\
\text{vec}(\mathbf{X}_2)
\end{bmatrix}
=
\begin{bmatrix}
\text{vec}(\mathbf{C}_1) \\
\text{vec}(\mathbf{C}_2)
\end{bmatrix}
```

where the matrix derivative satisfies:

```math
\frac{\partial}{\partial \mathbf{X}} \text{tr}\left(\mathbf{A}\mathbf{X}\mathbf{B}\mathbf{X}^T\mathbf{C}\right) = \mathbf{A}^T\mathbf{C}^T\mathbf{X}\mathbf{B}^T + \mathbf{C}\mathbf{A}\mathbf{X}\mathbf{B}
```

## Attention Mechanism (from LLM docs)

The Transformer attention mechanism:

```math
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) \times V
```

## Fractions and Greek Letters

Inline fraction: $\frac{1}{2}$ and inline Greek: $\alpha, \beta, \gamma, \delta$

Display mode with Greek letters:

```math
\alpha + \beta = \gamma
```

```math
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
```

## Subscripts and Superscripts

Inline: $x_1, x_2, ..., x_n$ and $2^n$ grows exponentially.

Display:

```math
\lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n = e
```

## Combined Example

Consider the time-evolution operator for a perturbed quantum harmonic oscillator with second-order correction:

```math
\hat{U}(t) = e^{-\frac{i}{\hbar}\hat{H}t} = \exp\left[-\frac{i}{\hbar}t\left(\hat{H}_0 + \lambda\hat{V} + \lambda^2\sum_{n=1}^{\infty}\frac{(-1)^n}{(n+1)!}\int_0^t dt_1 \int_0^{t_1} dt_2 \cdots \int_0^{t_{n-1}} dt_n [\hat{V}(t_1), [\hat{V}(t_2), \cdots [\hat{V}(t_n), \hat{H}_0]\cdots]]\right)\right]
```

where the perturbed energy eigenvalues satisfy the coupled differential equations:

```math
E_n^{(k)} = \langle n^{(0)} | \hat{V} | n^{(k-1)} \rangle + \sum_{\substack{m=0 \\ m \neq n}}^{\infty} \frac{\langle n^{(0)} | \hat{V} | m^{(0)} \rangle \langle m^{(0)} | \hat{V} | n^{(k-2)} \rangle}{E_n^{(0)} - E_m^{(0)}} - \sum_{l=1}^{k-1} E_n^{(l)} \langle n^{(0)} | n^{(k-l)} \rangle
```

and the wavefunctions are normalized such that:

```math
\Psi_n(x,t) = \sum_{k=0}^{\infty} \lambda^k \psi_n^{(k)}(x) e^{-\frac{i}{\hbar}E_n t} \quad \text{where} \quad \int_{-\infty}^{\infty} \left|\Psi_n(x,t)\right|^2 dx = 1
```

This describes a quantum harmonic oscillator perturbed by potential $\hat{V}$ with coupling constant $\lambda$, using time-dependent perturbation theory with degenerate state corrections.

## Testing Edge Cases

Empty inline: $$ (should show error)

Multiple on one line: $x + y = z$ and $a \times b = c$ both inline.

**Bold with math**: The value $x = 5$ is **important**.

*Italic with math*: We define $f(x) = x^2$ as our function.
