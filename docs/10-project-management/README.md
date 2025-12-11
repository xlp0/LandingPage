# 📋 Project Management

Epics, user stories, workflows, and project documentation.

## Documents in This Section

### Epics & Stories
- **epics/** - Large features and initiatives
  - **README.md** - Epic guidelines
  - **EPIC-001-WebRTC-Reconnection-Stability.md**
- **stories/** - User stories and small features
  - **STORY-001-Fix-Duplicate-Offer-Processing.md**
  - **STORY-002-Prevent-Stale-Timeout-Callbacks.md**
  - **STORY-003-Fix-Duplicate-Answer-Processing.md**
  - **STORY-004-Configure-Public-STUN-Servers.md**
  - **STORY-005-Implement-Connection-Health-Monitoring.md**
  - **STORY-006-Add-ICE-Restart-Capability.md**
  - **STORY-007-Fix-Signaling-Service-Destruction.md**
  - **STORY-008-Integrate-WebLLM-Chat.md**

### Implementation Guides
- **IMPLEMENTATION_GUIDE.md** - General implementation guide
- **LIBRARY_ONLY_MIGRATION.md** - Library migration strategy
- **REFACTORING_SUMMARY.md** - Refactoring documentation
- **PHASE1_COMPLETE.md** - Phase 1 completion summary

### Workflow
- **bmm-brainstorming-session-2025-11-07.md** - Brainstorming notes
- **bmm-workflow-status.yaml** - Workflow status

## Epic/Story Format

### Epic Format
```markdown
# EPIC-XXX: Epic Title

## Overview
Brief description of the epic.

## Goals
- Goal 1
- Goal 2

## Stories
- STORY-XXX
- STORY-YYY

## Success Criteria
- Criteria 1
- Criteria 2
```

### Story Format
```markdown
# STORY-XXX: Story Title

## User Story
As a [user type], I want [goal] so that [benefit].

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Technical Details
Implementation notes.

## Testing
Test scenarios.
```

## Workflow

1. **Epic Creation** - Define large feature
2. **Story Breakdown** - Split into user stories
3. **Implementation** - Develop features
4. **Testing** - Verify functionality
5. **Documentation** - Update docs
6. **Deployment** - Release to production

## Related Sections

- [08-testing/](../08-testing/) - Testing strategies
- [07-deployment/](../07-deployment/) - Deployment process
- [00-getting-started/](../00-getting-started/) - Project status
