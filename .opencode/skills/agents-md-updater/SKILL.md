---
name: agents-md-updater
description: Update AGENTS.md with new rules following the existing format and structure. Use when adding new rules to AGENTS.md while maintaining consistency with existing format, numbering, and style. Ensures all rules follow the established pattern: number, title, mandatory flag, description, and bullet points with examples.
---

# AGENTS.md Updater

Update AGENTS.md with new rules while maintaining consistent formatting and structure.

## Rule Format

Each rule MUST follow this exact format:

```markdown
### N. Rule Title (Mandatory/Optional)

- **Rule statement in bold**
- Explanation or additional detail
- Example: `code example` or `<example>{t('key')}</example>`
```

**Key patterns:**

- Number sequentially (1, 2, 3...)
- Include "(Mandatory)" in title for critical rules
- Use bold for the main rule statement
- Provide concrete examples where applicable
- Use proper markdown formatting for code blocks

## Adding New Rules

1. Read the current AGENTS.md to understand existing rules
2. Identify the correct insertion point (maintain logical grouping)
3. Follow the exact format shown above
4. Update numbering if inserting in the middle
5. Ensure consistency with existing style and tone

## Common Rule Categories

- **Internationalization**: Text localization rules
- **Build & Execution**: Command execution restrictions
- **Type Safety**: TypeScript coding standards
- **Performance**: Optimization patterns (use usePersistFn)
- **Code Quality**: Comments, logs, naming conventions
- **Design**: UI/UX guidelines and styling rules

## Examples

**Adding a new mandatory rule:**

```markdown
### 8. No Console Logs in Production (Mandatory)

- **NEVER use console.log(), console.error(), or console.warn() in production code**
- Use proper logging service instead
- Remove all console statements before committing
```

**Adding a design rule:**

```markdown
### 8. Component Naming

- **Use PascalCase for all component names**
- Match file names with component names
- Example: `UserProfile.tsx` exports `UserProfile` component
```

## Resources

### scripts/update_agents_md.py

Python script to help parse and validate AGENTS.md structure. Run before making changes to ensure formatting consistency.
