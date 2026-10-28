# 📋 Project Management, Epics & Sprint Coordination

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers working in this documentation tier |
| BMAD Owner | Scrum Master and Product Manager (`bmad-agent-pm`) |
| Source of Truth | [`docs/sprints/INDEX.md`](../sprints/INDEX.md) and [`docs/sprints/_active/INDEX.md`](../sprints/_active/INDEX.md) |
This directory documents the project management framework, historical epics, user stories, and agile methodology used in `LandingPage`, guided by the BMAD agent framework and pstack principles.

---

## 🎯 Agile Organization & Sprint Architecture

In `LandingPage`, project management follows a multi-tiered structure coordinated with the broader `MCard_TDD` monorepo:

1. **Sprint Specifications (`docs/sprints/`)**:
   - Master sprint directory tracking execution programs.
   - **Graduated Programs**: [**`docs/sprints/08-testing/`**](../sprints/08-testing/INDEX.md) archives the completed 7-sprint **Program ERB: Device-Sensitive Testing Infrastructure** (ERB-00 through ERB-06).
   - **Active Sprints**: [**`docs/sprints/_active/`**](../sprints/_active/INDEX.md) tracks currently in-flight work.
2. **Cross-Estate Epics**:
   - `EPIC-COL`: Functional lineage and Git tree SSOT across `clm`, `mcard-studio`, and `LandingPage`.
   - `EPIC-RVP`: Physical 2D orientation model and layout-box containment.
   - `EPIC-STY`: Unified token palette (`tokens.css`) and strict style audit gates.
   - `EPIC-SMR`: Single-page MCard distillation (`SMR-09`) and portal sample corpus.
3. **BMAD Agent Framework Roles**:
   - 🏛️ **Winston (System Architect)**: Technical design leader, estate boundaries, and invariant enforcement.
   - 💻 **Amelia (Software Engineer)**: Code execution, TDD implementation, and verification passes.
   - 📋 **John (Product Manager)**: Requirements discovery, sprint planning, and acceptance criteria.
   - 📊 **Mary (Strategic Business Analyst)**: Gap analysis, requirements synthesis, and risk profiling.
   - 🎨 **Sally (UX Designer)**: Viewport stage ergonomics, touch target compliance, and responsive layouts.
   - ✍️ **Paige (Technical Writer)**: Knowledge curation, Diátaxis documentation, and API references.

---

## 📚 Documents in This Section

### Implementation Guides & Migration
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Comprehensive architecture and implementation guide.
- **[LIBRARY_ONLY_MIGRATION.md](LIBRARY_ONLY_MIGRATION.md)** - Migration strategy to zero-dependency client logic and library consumption.
- **[REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)** - Major refactoring milestones and module extractions.
- **[PHASE1_COMPLETE.md](PHASE1_COMPLETE.md)** - Phase 1 completion milestone and foundation stabilization.
- **[bmm-brainstorming-session-2025-11-07.md](bmm-brainstorming-session-2025-11-07.md)** - Brainstorming session notes on modularization and P2P communication.

### Historical Epics & Stories
- **[epics/](epics/)** - Feature epic documents:
  - `README.md` - Epic formatting and lifecycle rules.
  - `EPIC-001-WebRTC-Reconnection-Stability.md` - WebRTC stability and auto-reconnection.
- **[stories/](stories/)** - User stories for historical feature development (STORY-001..008).

---

## 🧭 Related Functional Tiers

- [**08-testing/**](../08-testing/README.md) - Testing infrastructure and Program ERB sprint specifications.
- [**00-getting-started/**](../00-getting-started/README.md) - Developer setup and onboarding.
- [**11-standards/**](../11-standards/README.md) - Coding conventions and architectural invariants.
