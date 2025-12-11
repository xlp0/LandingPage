# 📏 Standards

Coding standards, style guides, and development rules.

## Documents in This Section

### Coding Standards
- **rules/** - Development rules
  - **css.md** - CSS guidelines and standards

### Feature Documentation
- **features/** - Feature specifications
  - **nested-sidebar.md** - Nested sidebar feature

## Coding Standards

### CSS Guidelines
Follow [rules/css.md](rules/css.md) for:
- Naming conventions
- File organization
- Self-hosted resources
- Auto-detection patterns
- No external CDN dependencies

### JavaScript Standards
- **ES Modules** - Use ES6 module syntax
- **Async/Await** - Prefer over promises
- **Error Handling** - Always use try-catch
- **Comments** - Document complex logic
- **Naming** - Use camelCase for variables, PascalCase for classes

### File Naming
- **Documents:** kebab-case (e.g., `my-document.md`)
- **JavaScript:** camelCase (e.g., `myModule.js`)
- **Components:** PascalCase (e.g., `MyComponent.js`)
- **CSS:** kebab-case (e.g., `my-styles.css`)

### Git Commit Messages
```
type(scope): subject

body

footer
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Testing
- `chore` - Maintenance

## Documentation Standards

### Document Structure
```markdown
# Title

## Overview
Brief description.

## Content
Main content sections.

## Related Documents
- Links to related docs

## Status
Current status and last update.
```

### Code Examples
- Include complete, runnable examples
- Add comments for clarity
- Show both correct and incorrect usage
- Provide output examples

## Related Sections

- [00-getting-started/](../00-getting-started/) - Setup standards
- [06-components/](../06-components/) - Component standards
- [05-state-management/](../05-state-management/) - Redux patterns
