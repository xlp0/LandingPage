# 🔍 Testing

Testing strategies, verification checklists, and quality assurance.

## Documents in This Section

- **VERIFICATION_CHECKLIST.md** - Pre-release verification checklist

## Testing Categories

### Unit Testing
- Component-level tests
- Redux slice tests
- Utility function tests

### Integration Testing
- Redux middleware tests
- WebRTC connection tests
- OAuth flow tests

### E2E Testing
- User workflow tests
- Multi-user scenarios
- Cross-browser testing

## Related Testing Documentation

### CLM Testing
See [06-components/](../06-components/) for:
- CLM_TESTING_SYSTEM.md
- CLM_TESTING_QUICK_REFERENCE.md
- CLM_MULTI_COMPONENT_TESTING.md

### Redux Testing
See [05-state-management/](../05-state-management/) for:
- REDUX_AUTH_TESTING.md

### P2P Testing
See [04-networking/](../04-networking/) for:
- p2p-testing-guide.md

## Quick Testing Guide

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
npm test -- --grep "Auth"
npm test -- --grep "WebRTC"
npm test -- --grep "CLM"
```

### Pre-Deployment Checklist
Follow [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) before any deployment.

## Related Sections

- [06-components/](../06-components/) - Component testing
- [05-state-management/](../05-state-management/) - Redux testing
- [04-networking/](../04-networking/) - P2P testing
