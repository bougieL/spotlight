---
name: code-review
description: Code review workflow for merge requests and branch comparisons. Use when user asks to review code, review merge requests, review pull requests, compare branches, or analyze code changes before merging to main/master branch.
---

# Code Review

Review code changes for merge requests and branch comparisons.

## Review Workflow

When asked to review code:

1. **Identify target branch** - Determine main branch (main/master):

   ```bash
   git branch --show-current
   git rev-parse --abbrev-ref HEAD
   ```

2. **Get branch diff** - Compare changes:

   ```bash
   # Compare feature branch with main
   git diff main..HEAD --stat
   git diff main..HEAD

   # Or specify branches explicitly
   git diff <base-branch>..<compare-branch> --stat
   git diff <base-branch>..<compare-branch>
   ```

3. **List changed files** - Understand scope:

   ```bash
   git diff main..HEAD --name-only
   git diff main..HEAD --name-status
   ```

4. **Review commit history** - Check commit quality:
   ```bash
   git log main..HEAD --oneline
   git log main..HEAD -n 10
   ```

## Review Checklist

### Code Quality

- [ ] Code follows TypeScript best practices (NO `any` types)
- [ ] No hardcoded strings - use i18n keys from `zh-CN.json` / `en-US.json`
- [ ] Proper error handling exists
- [ ] No console logs in production code (or use proper logger)
- [ ] Code is readable and well-organized

### Project Standards

- [ ] Follows AGENTS.md rules (internationalization, type safety, etc.)
- [ ] Cross-platform compatibility (Windows/macOS/Linux)
- [ ] Uses existing patterns and utilities in codebase

### Security

- [ ] No exposed secrets, keys, or credentials
- [ ] No hardcoded API keys or passwords
- [ ] Input validation exists

### Best Practices

- [ ] Proper TypeScript types (no `unknown` abuse)
- [ ] Reusable components follow existing patterns
- [ ] No code duplication

## Architectural Analysis

Analyze code from architecture, modularity, and design perspectives:

### 1. Code Architecture

- [ ] **Layer separation**: Is there clear separation between UI/Business Logic/Data layers?
- [ ] **Dependency direction**: Do modules depend on abstractions, not concretions?
- [ ] **Single responsibility**: Does each module/function have one clear purpose?
- [ ] **Coupling**: Are modules loosely coupled? Check for excessive interdependencies
- [ ] **File organization**: Are related files grouped logically (e.g., component + types + utils)?

### 2. Modularity

- [ ] **Function size**: Are functions focused and reasonably sized (<50 lines)?
- [ ] **Component size**: Are Vue/React components focused on single responsibility?
- [ ] **File cohesion**: Do files contain related functionality, not mixed concerns?
- [ ] **Export clarity**: Are exports well-organized with clear public APIs?

### 3. Reusability

- [ ] **Duplicate code**: Is there repeated logic that could be extracted?
- [ ] **Utility functions**: Can common operations be moved to `utils/`?
- [ ] **Custom hooks/composables**: Can reusable logic become hooks?
- [ ] **Shared types**: Are common types defined in shared location?

### 4. Over-Engineering Detection

Watch for signs of over-design:

- [ ] **Premature abstraction**: Is abstraction created before it's needed?
- [ ] **Excessive interfaces**: Are there interfaces used only once?
- [ ] **Unnecessary patterns**: Is Factory/Builder/etc. used when simpler solution exists?
- [ ] **Over-generalization**: Are types more generic than needed?

**Simple is better**: If a direct solution works, don't add abstraction layers.

### 5. Extractability

- [ ] **Self-contained**: Could this code work as a standalone module?
- [ ] **Clear boundaries**: Are dependencies explicitly imported?
- [ ] **No implicit globals**: No hidden dependencies on global state

## Analyze Existing Codebase First

Before suggesting refactoring:

1. **Search for existing utilities**:

   ```bash
   # Find similar utilities
   grep -r "function" src/renderer/utils/
   grep -r "composable" src/renderer/

   # Check existing patterns
   ls src/renderer/components/
   ls src/renderer/utils/
   ls src/renderer/stores/
   ```

2. **Check for reusable patterns**:
   - Look at `src/renderer/utils/` for shared utilities
   - Look at `src/renderer/composables/` for reusable logic
   - Look at `src/renderer/stores/` for state management patterns
   - Look at `src/shared/` for cross-process shared code

3. **Review similar components**:
   - Use existing component patterns
   - Follow established naming conventions
   - Match existing code style

## Running Static Analysis

Run lint and typecheck as required by AGENTS.md:

```bash
# TypeScript type checking
npm run typecheck

# ESLint
npm run lint
```

## Output Format

Provide review in structured format:

```
## Code Review Summary

### Files Changed
- <list of changed files>

### Issues Found

#### Critical
- <issue>: <location>
- <issue>: <location>

#### Warnings
- <issue>: <location>

#### Suggestions
- <issue>: <location>

### Architectural Analysis

#### Architecture ✓/✗
- <assessment>

#### Modularity ✓/✗
- <assessment>

#### Reusability ✓/✗
- <assessment>

#### Over-Engineering ✓/✗
- <assessment>

#### Extractability ✓/✗
- <assessment>

### Refactoring Suggestions
1. <specific suggestion with file location>
2. <specific suggestion with file location>

### Static Analysis Results
- TypeScript: <pass/fail>
- ESLint: <pass/fail>
```

## Important Notes

- Focus on **critical issues** that could cause bugs or security issues
- Flag violations of AGENTS.md rules (i18n, no `any` types, etc.)
- Provide constructive suggestions, not just criticism
- Check both **additions** and **deletions**
- Review new files carefully for overall quality
- **Balance**: Don't over-engineer - simple solutions are often better
- **Reuse first**: Always check existing codebase before suggesting new utilities
- **Concrete suggestions**: Provide specific file paths and code examples for refactoring
