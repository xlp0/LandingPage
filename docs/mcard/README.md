# MCard Documentation

This directory contains documentation for the **MCard** (Content-Addressable Storage) system and **CLM** (Cubical Logic Model) language.

## Contents

### Core Documentation

- **[how_to_use_mcard_js.md](./how_to_use_mcard_js.md)** - Complete user guide for MCard-JS v2.1.2
  - Installation and setup
  - Browser and Node.js usage
  - Storage engines (IndexedDB, SQLite)
  - Vector search and RAG
  - Lambda Calculus runtime
  - GraphRAG engine
  - Semantic versioning

- **[CLM_Language_Specification_v2.md](./CLM_Language_Specification_v2.md)** - CLM Language Specification v2.1.0
  - Cubical Type Theory-based DSL
  - Polynomial Cards (PCards)
  - PTR (Polynomial Type Runtime) integration
  - Multi-language runtime support

## What is MCard?

**MCard** is a content-addressable storage system where every piece of data gets a unique SHA-256 hash. It provides:

- **Content addressing** - Immutable, verifiable storage
- **Smart detection** - Automatic content type identification
- **Multiple runtimes** - Browser (IndexedDB/WASM) and Server (SQLite)
- **Handles** - Human-readable names for content
- **AI features** - Vector search, RAG, GraphRAG

## What is CLM?

**CLM (Cubical Logic Model)** is a YAML-based DSL for defining verifiable, executable logic units called **Polynomial Cards (PCards)**. It serves as the declarative frontend to the **PTR (Polynomial Type Runtime)**.

### Key Features:
- **Three-dimensional logic** - Specification, Implementation, Verification
- **Multi-language support** - JavaScript, Python, Rust, C, WASM
- **Verifiable computation** - Cryptographic proofs
- **Composable functions** - Searchable and executable

## Quick Links

- **npm Package**: [mcard-js](https://www.npmjs.com/package/mcard-js)
- **Source Code**: [GitHub - MCard_TDD](https://github.com/xlp0/MCard_TDD)
- **Python Version**: [PyPI - mcard](https://pypi.org/project/mcard/)

## Related Documentation

- [../CLM_Language_Specification.md](../CLM_Language_Specification.md) - Original CLM spec
- [../CUBIC-LOGIC-MODEL.md](../CUBIC-LOGIC-MODEL.md) - Cubic Logic Model overview
- [../CLM-DYNAMIC-LOADING.md](../CLM-DYNAMIC-LOADING.md) - CLM dynamic loading system

---

*Last updated: December 9, 2025*
