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

$$
E = mc^2
$$

The quadratic formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

A more complex example with matrices:

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
\begin{bmatrix}
x \\
y
\end{bmatrix}
=
\begin{bmatrix}
ax + by \\
cx + dy
\end{bmatrix}
$$

## Attention Mechanism (from LLM docs)

The Transformer attention mechanism:

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) \times V
$$

## Fractions and Greek Letters

Inline fraction: $\frac{1}{2}$ and inline Greek: $\alpha, \beta, \gamma, \delta$

Display mode with Greek letters:

$$
\alpha + \beta = \gamma
$$

$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

## Subscripts and Superscripts

Inline: $x_1, x_2, ..., x_n$ and $2^n$ grows exponentially.

Display:

$$
\lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n = e
$$

## Combined Example

Consider the probability distribution $p(x)$ where:

$$
p(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}
$$

This is the normal distribution with mean $\mu$ and standard deviation $\sigma$.

## Testing Edge Cases

Empty inline: $$ (should show error)

Multiple on one line: $x + y = z$ and $a \times b = c$ both inline.

**Bold with math**: The value $x = 5$ is **important**.

*Italic with math*: We define $f(x) = x^2$ as our function.
