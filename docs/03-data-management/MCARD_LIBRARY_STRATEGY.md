# MCard Library Strategy & Monorepo Consensus

This document details the library integration strategy for MCard processing in `LandingPage` and its alignment with the `MCard_TDD` monorepo.

---

## 🏛️ Monorepo Kernel Consensus (`ULR-05`, `ULR-06`)

Historically, multiple submodules maintained divergent local forks or wrapper packages for MCard logic. Under the unified `MCard_TDD` framework:

1. **Published Kernel Dependency**:
   - `LandingPage` consumes the published `clm-kernel@0.0.9` package directly from npm.
   - Both `LandingPage` and `mcard-studio` are pinned to the exact same version, enforced by the monorepo consensus manifest:
     `mcard-studio/scripts/config/kernel-version-consensus.json`
   - Monorepo CI (`scripts/ci/check_landingpage_retirement.py`) fails if either consumer drifts from the consensus pin.

2. **Zero Duplicate Hash Providers**:
   - `LandingPage` does **not** define local Blake3 or SHA-256 hash implementations.
   - All cryptographic content addressing (`urn:mcard:hash:blake3:...`) delegates exclusively to `clm-kernel`.

---

## 🗄️ Canonical Triad SQLite Schema

All MCard persistence in `LandingPage` (including the 6-sample portal corpus and test run records) adheres to the canonical 3-table Triad schema:

```sql
-- 1. Cards Table: Content-addressed card metadata and payload
CREATE TABLE IF NOT EXISTS cards (
    hash TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT
);

-- 2. Handles Table: Mutable pointers to immutable card hashes
CREATE TABLE IF NOT EXISTS handles (
    handle TEXT PRIMARY KEY,
    target_hash TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(target_hash) REFERENCES cards(hash)
);

-- 3. Blobs Table: Binary data storage
CREATE TABLE IF NOT EXISTS blobs (
    hash TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
```

---

## 🧪 Test Run Persistence via Triad (`INV-ERB-04`)

When the Responsive UI Lab seals a test run, it writes a card of type `test_run`:
- The JSON payload is canonically sorted and serialized without whitespace.
- The card hash is derived via `blake3(canonicalJson)`.
- It is saved to `data/mcard-api.db` via `POST /api/test-runs`.
- Revision history for a given target, device, and orientation is maintained through handle pointers.
