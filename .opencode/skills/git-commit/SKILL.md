---
name: git-commit
description: Git commit workflow that follows project conventions. Use when user asks to commit changes, prepare commits, or manage git history. Handles git status checking, diff review, commit message generation, and ensures all tracked files are staged before committing.
---

# Git Commit

Manage git commits following project conventions.

## Commit Workflow

When asked to commit changes:

1. **Check git status** - Gather information using shell commands:

   ```bash
   git status
   git diff HEAD
   git log -n 3
   ```

2. **Stage files** - Use `git add` to stage all relevant changes:

   ```bash
   git add <files>
   ```

3. **Review changes** - Confirm staged changes are correct:

   ```bash
   git diff --staged
   ```

4. **Generate commit message** - Create a clear, concise message:
   - Focus on "why" more than "what"
   - Keep it clear and concise
   - Follow existing commit message style from `git log`

5. **Commit** - Execute the commit:

   ```bash
   git commit -m "<message>"
   ```

6. **Verify** - Confirm commit succeeded:
   ```bash
   git status
   ```

## Commit Message Guidelines

**Good commit messages:**

- Focus on the purpose: "Add user authentication flow" not "Add auth files"
- Explain the change: "Fix memory leak in useEffect" not "Fix bug"
- Be concise: "Update TypeScript types" not "Update TypeScript types for better type safety"

**Examples:**

```
feat: Add user authentication with JWT tokens
fix: Resolve memory leak in useEffect cleanup
docs: Update API documentation with new endpoints
refactor: Extract common logic into shared utilities
chore: Update dependencies to latest versions
```

## Using the Helper Script

The `scripts/git_commit.py` script provides utilities for commit workflow:

```bash
# Check git status
python scripts/git_commit.py status

# View unstaged changes
python scripts/git_commit.py diff

# View staged changes
python scripts/git_commit.py diff-staged

# View recent commits
python scripts/git_commit.py recent 5

# Get commit message suggestion
python scripts/git_commit.py suggest
```

## Important Notes

- **NEVER push** changes to remote repository unless explicitly asked
- **ALWAYS verify** changes before committing
- **Stage ALL relevant files** before committing
- If commit fails, **NEVER** work around issues without being asked

## Resources

### scripts/git_commit.py

Python helper script for git operations and commit message suggestions. Can be executed directly or read for context.
