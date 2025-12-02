# Library Comparison: Vendored vs TikZJax

## 📊 Quick Comparison Table

| Feature | Marked.js | KaTeX | Mermaid | Highlight.js | **TikZJax** |
|---------|-----------|-------|---------|--------------|-------------|
| **Type** | Parser | Renderer | Generator | Tokenizer | **Compiler** |
| **Language** | Pure JS | Pure JS | Pure JS | Pure JS | **WebAssembly** |
| **Speed** | ⚡ 1ms | ⚡ 5ms | ⚡ 100ms | ⚡ 10ms | 🐌 **2000ms** |
| **Size** | 40 KB | 300 KB | 1 MB | 80 KB | **459 KB + 2 MB** |
| **Vendored?** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ **CDN Only** |
| **Offline?** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ **No** |
| **Dependencies** | None | Fonts | None | None | **WASM + Fonts + Core** |

---

## 🔍 How Each Library Works

### **1. Marked.js - Markdown Parser**

```
Input:  # Hello **World**
        ↓
Parse:  [H1, Text, Bold]
        ↓
Output: <h1>Hello <strong>World</strong></h1>
```

**Technology:** Pure JavaScript regex and string manipulation

**Speed:** ~1ms (instant)

**Why Fast:**
- Simple text transformation
- No compilation needed
- No external resources
- Synchronous operation

---

### **2. KaTeX - Math Renderer**

```
Input:  E = mc^2
        ↓
Parse:  [Variable, Operator, Variable, Superscript]
        ↓
Lookup: Pre-built font glyphs for each character
        ↓
Output: <span class="katex">
          <span class="mord">E</span>
          <span class="mrel">=</span>
          <span class="mord">m</span>
          <span class="mord">c</span>
          <span class="msupsub">
            <span class="mord">2</span>
          </span>
        </span>
```

**Technology:** 
- Pure JavaScript parser
- Pre-rendered font glyphs (no compilation)
- CSS positioning

**Speed:** ~5ms (very fast)

**Why Fast:**
- No compilation - just lookup
- Fonts are pre-built
- CSS handles layout
- Synchronous operation

---

### **3. Mermaid - Diagram Generator**

```
Input:  graph LR
        A --> B
        ↓
Parse:  AST (Abstract Syntax Tree)
        {
          type: 'graph',
          direction: 'LR',
          nodes: ['A', 'B'],
          edges: [{ from: 'A', to: 'B' }]
        }
        ↓
Layout: Calculate positions using graph algorithms
        ↓
Output: <svg>
          <rect x="0" y="0" width="50" height="30">A</rect>
          <rect x="100" y="0" width="50" height="30">B</rect>
          <path d="M50,15 L100,15" />
        </svg>
```

**Technology:**
- Pure JavaScript parser
- Graph layout algorithms (Dagre)
- Direct SVG generation

**Speed:** ~100ms (fast)

**Why Fast:**
- No compilation - direct generation
- Algorithms are optimized
- Single-pass rendering
- Synchronous operation

---

### **4. Highlight.js - Syntax Highlighter**

```
Input:  function hello() {
          console.log("Hi");
        }
        ↓
Tokenize: [Keyword, Identifier, Punctuation, ...]
        ↓
Output: <pre><code>
          <span class="keyword">function</span>
          <span class="function">hello</span>
          <span class="punctuation">()</span>
          ...
        </code></pre>
```

**Technology:**
- Pure JavaScript regex patterns
- Language-specific grammars
- CSS for colors

**Speed:** ~10ms (very fast)

**Why Fast:**
- Simple tokenization
- No compilation
- Regex-based matching
- Synchronous operation

---

### **5. TikZJax - TeX Compiler** ⚠️

```
Input:  \draw (0,0) circle (1);
        ↓
Initialize: Load WebAssembly TeX engine (~500ms)
        ↓
Load:   Load core.dump.gz (~2 MB) (~300ms)
        ↓
Compile: Run TeX compiler on TikZ code (~1000ms)
        - Parse TikZ macros
        - Expand LaTeX commands
        - Calculate Bézier curves
        - Generate DVI (Device Independent format)
        ↓
Convert: DVI → SVG conversion (~500ms)
        - Parse DVI boxes
        - Convert to SVG paths
        - Handle fonts and positioning
        ↓
Output: <svg>
          <path d="M 0,0 m -28.45,0 c 0,-15.71 12.74,-28.45 28.45,-28.45 ..." />
        </svg>
```

**Technology:**
- **WebAssembly** (compiled from C)
- Full TeX engine (same as LaTeX on server)
- Binary format (DVI)
- Complex conversion pipeline

**Speed:** ~2000ms (very slow)

**Why Slow:**
1. **WebAssembly initialization** (~500ms)
   - Load and compile WASM binary
   - Initialize runtime environment
   - Set up memory

2. **TeX compilation** (~1000ms)
   - Parse complex macro language
   - Expand recursive macros
   - Calculate mathematical coordinates
   - Generate DVI output

3. **DVI → SVG conversion** (~500ms)
   - Parse binary DVI format
   - Convert TeX boxes to SVG
   - Handle font metrics
   - Generate final SVG

4. **Font loading** (~100-300ms)
   - Load BaKoMa fonts
   - CORS issues with local fonts
   - Multiple HTTP requests

---

## 🎯 The Fundamental Difference

### **Other Libraries: Parsers & Renderers**

```
┌─────────────┐
│ Input Text  │
└──────┬──────┘
       │ Parse (simple)
       ▼
┌─────────────┐
│ Data Model  │
└──────┬──────┘
       │ Render (direct)
       ▼
┌─────────────┐
│ HTML/SVG    │
└─────────────┘

Time: ~1-100ms
```

**Characteristics:**
- ✅ Simple transformation
- ✅ Direct output generation
- ✅ No intermediate formats
- ✅ Pure JavaScript
- ✅ Synchronous

---

### **TikZJax: Full Compiler**

```
┌─────────────┐
│ TikZ Code   │
└──────┬──────┘
       │ Initialize WASM (~500ms)
       ▼
┌─────────────┐
│ TeX Engine  │
└──────┬──────┘
       │ Compile (~1000ms)
       ▼
┌─────────────┐
│ DVI Binary  │
└──────┬──────┘
       │ Convert (~500ms)
       ▼
┌─────────────┐
│ SVG Output  │
└─────────────┘

Time: ~2000ms
```

**Characteristics:**
- ❌ Complex compilation
- ❌ Multiple intermediate formats
- ❌ Binary processing
- ❌ WebAssembly overhead
- ❌ Asynchronous

---

## 🔬 WebAssembly Explained

### **What is WebAssembly?**

WebAssembly (WASM) is a **binary instruction format** that allows running compiled code (C, C++, Rust) in the browser at near-native speed.

### **Why TikZJax Uses WASM**

```
TeX (written in C)
       ↓
Compile to WebAssembly
       ↓
Run in Browser
```

**TeX is a complex program:**
- Written in C (1970s-1980s)
- ~50,000 lines of code
- Complex macro expansion
- Mathematical typesetting algorithms
- Font rendering

**Can't rewrite in JavaScript:**
- Too complex to port
- Would lose compatibility
- Performance would be worse

**Solution: Compile to WASM**
- Keep original C code
- Compile to WASM binary
- Run in browser

---

## 📈 Performance Breakdown

### **TikZJax Initialization (First Render)**

```
┌─────────────────────────────────────────┐
│ Download tikzjax.js (459 KB)      200ms │
├─────────────────────────────────────────┤
│ Parse & compile WASM binary       300ms │
├─────────────────────────────────────────┤
│ Download core.dump.gz (2 MB)      400ms │
├─────────────────────────────────────────┤
│ Decompress core.dump              100ms │
├─────────────────────────────────────────┤
│ Initialize TeX engine             200ms │
├─────────────────────────────────────────┤
│ Compile TikZ code                1000ms │
├─────────────────────────────────────────┤
│ Convert DVI to SVG                500ms │
├─────────────────────────────────────────┤
│ Download fonts                    200ms │
└─────────────────────────────────────────┘
Total: ~2900ms (first diagram)
```

### **TikZJax Subsequent Renders**

```
┌─────────────────────────────────────────┐
│ Compile TikZ code                1000ms │
├─────────────────────────────────────────┤
│ Convert DVI to SVG                500ms │
└─────────────────────────────────────────┘
Total: ~1500ms (cached WASM & fonts)
```

---

## 🚀 Why Other Libraries Don't Need WASM

### **They're Simpler!**

**Marked.js:**
```javascript
// Simplified example
function parseMarkdown(text) {
  return text
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
```
**No compilation needed!**

**KaTeX:**
```javascript
// Simplified example
function renderMath(latex) {
  const tokens = tokenize(latex);  // Parse
  const html = tokens.map(token => {
    return `<span class="${token.type}">${token.value}</span>`;
  });
  return html.join('');
}
```
**Just lookup and HTML generation!**

**Mermaid:**
```javascript
// Simplified example
function renderGraph(code) {
  const ast = parse(code);           // Parse to AST
  const layout = calculateLayout(ast); // Graph algorithm
  return generateSVG(layout);         // Direct SVG
}
```
**No intermediate binary format!**

---

## 💡 When to Use Each

### **Use Marked.js when:**
- ✅ Rendering Markdown documents
- ✅ Simple text formatting
- ✅ Speed is critical
- ✅ Offline support needed

### **Use KaTeX when:**
- ✅ Rendering math equations
- ✅ Inline or display math
- ✅ Speed is critical
- ✅ Offline support needed

### **Use Mermaid when:**
- ✅ Simple diagrams (flowcharts, sequences)
- ✅ Speed is important
- ✅ Offline support needed
- ✅ Easy syntax preferred

### **Use Highlight.js when:**
- ✅ Syntax highlighting code
- ✅ Multiple languages
- ✅ Speed is critical
- ✅ Offline support needed

### **Use TikZJax when:**
- ✅ Complex mathematical diagrams
- ✅ Category theory diagrams
- ✅ Commutative diagrams
- ✅ Precision is critical
- ⚠️ Speed is NOT critical
- ⚠️ Internet connection available

---

## 🎯 Recommendation

**For your PKC Viewer:**

1. **Keep all vendored libraries** (Marked, KaTeX, Mermaid, Highlight)
   - Fast, reliable, offline-capable

2. **Keep TikZJax for complex diagrams**
   - Accept the slowness as trade-off for power
   - Use iframe isolation to prevent blocking

3. **Consider server-side rendering for production**
   - Pre-render TikZ diagrams
   - Cache as SVG files
   - Instant loading

4. **Use Mermaid when possible**
   - 20x faster than TikZJax
   - Good enough for most diagrams

---

## 📚 Summary

| Aspect | Vendored Libraries | TikZJax |
|--------|-------------------|---------|
| **Technology** | Pure JavaScript | WebAssembly + TeX |
| **Process** | Parse → Render | Compile → Convert → Render |
| **Speed** | ⚡ 1-100ms | 🐌 2000ms |
| **Complexity** | Simple | Very complex |
| **Offline** | ✅ Yes | ❌ No |
| **Power** | Limited | Unlimited |

**The trade-off is clear:**
- **Fast but limited** (vendored libraries)
- **Slow but powerful** (TikZJax)

Choose based on your needs! 🎯
