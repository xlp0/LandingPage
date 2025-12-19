<!-- CONTENT-TYPE: latex -->
LaTeX Math Examples

Inline Math

You can write inline math like this: $E = mc^2$ or $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

Display Math

Display equations are centered and larger:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\frac{d}{dx}\left(\int_{a}^{x} f(t)dt\right) = f(x)
$$

Complex Equations

Maxwell's Equations:

$$
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} = \frac{4\pi}{c}\vec{\mathbf{j}}
$$

$$
\nabla \cdot \vec{\mathbf{E}} = 4 \pi \rho
$$

Schrödinger Equation:

$$
i\hbar\frac{\partial}{\partial t}\Psi(\mathbf{r},t) = \left[-\frac{\hbar^2}{2m}\nabla^2 + V(\mathbf{r},t)\right]\Psi(\mathbf{r},t)
$$

Matrix Notation:

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$

Summations and Products:

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\prod_{i=1}^{n} x_i = x_1 \cdot x_2 \cdot \ldots \cdot x_n
$$

Calculus:

The derivative of $f(x) = x^n$ is $f'(x) = nx^{n-1}$

$$
\lim_{x \to 0} \frac{\sin x}{x} = 1
$$

$$
\int_0^\pi \sin(x) dx = 2
$$

Statistics:

Normal distribution: $f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}$

$$
\mathbb{E}[X] = \sum_{i=1}^{n} x_i P(x_i)
$$

Related Cards:
- @welcome - Introduction
- @quick-guide - Getting started
- @example-markdown - Markdown examples
- @advanced-examples - LaTeX + Mermaid + TikZ
