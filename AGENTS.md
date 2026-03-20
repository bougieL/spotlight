# Agents Configuration Manager

> This document is for agents and LLMs to follow when working with this project.

## Critical Rules

### 1. Internationalization (Mandatory)

- **ALL user-facing text MUST be internationalized**
- Use translation keys from `zh-CN.json` and `en-US.json`
- NEVER hardcode text strings in components or UI
- Example: `<button>{{ t('common.save') }}</button>` instead of `<button>Save</button>`

### 2. Build & Execution Restrictions

- **NEVER automatically run** `npm run dev`, `npm run build`, `npm run tauri dev`, or `npm run tauri build`
- Only run build commands when explicitly requested by the user
- **NEVER kill ports or restart the dev server** - Vite's HMR will automatically apply changes

### 3. Type Safety - No `any` Types (Mandatory)

- **NEVER use `any` type** in TypeScript/JavaScript code
- Use proper type definitions or `unknown` instead
- Example: `const name: string = ...`

### 4. Code Comments and Logs

- **ALL code comments and console logs MUST be in English**

### 5. Cross-Platform Support (Mandatory)

- **ALL new features MUST support Windows, macOS, and Linux platforms**
- Use Rust's `std::env::consts::OS` or Tauri platform detection
- Test on all supported platforms before marking a task as complete
- Use cross-platform compatible paths (handle both `/` and `\` separators)

### 6. Tauri Commands (Mandatory)

- **MUST update Tauri commands** in `src-tauri/src/` when adding or modifying backend functionality
- Keep Rust command handlers synchronized with frontend API calls
- Ensure command signatures match between frontend invoke and backend handler
- Example: When adding `read_config` command in Rust, also add corresponding TypeScript invoke

### 7. AGENTS.md Updates (Mandatory)

- **MUST use agents-md-updater skill** when adding or modifying rules in AGENTS.md
- Use the `Skill` tool with `agents-md-updater` to ensure consistent formatting and structure
- Follow the existing rule format when adding new rules

### 8. Frontend Static Checking (Mandatory)

- **MUST run static analysis after modifying frontend files in src/**
- Use `npm run lint` to verify code quality
- Fix all warnings and errors before marking a task as complete

### 9. Frontend Verification (Mandatory)

- **MUST run type checking and browser testing after modifying frontend files**
- Run `npm run typecheck` to check for type errors
- Use Playwright MCP tools to verify changes work correctly in browser
- This applies to .html/.css/.js/.ts/.vue/.svelte files
- Use `playwright_browser_navigate` to access http://localhost:5173 for testing

### 10. Architecture Analysis Before Coding (Mandatory)

- **MUST analyze project architecture before writing any code**
- Review existing code structure and identify reusable logic
- Consider refactoring opportunities before implementing new features
- Check for similar patterns or utilities that can be leveraged
- Example: Before creating a new utility function, search for existing helpers in `src/utils/` or similar directories

### 11. Code Review After Writing (Mandatory)

- **MUST reflect on whether the code is reasonable after writing**
- Check if the implementation follows best practices and project conventions
- Verify if there are simpler or more elegant solutions
- Ensure the code is maintainable and readable
- Consider if the changes could introduce bugs or edge cases

### 12. Rust Backend (Mandatory)

- **MUST run `cargo check`** after modifying Rust code in src-tauri/
- Use `cargo clippy` for linting Rust code
- Ensure Rust code compiles without warnings before marking a task as complete

## Project Info

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Tauri (Rust)
- **Platform**: Cross-platform desktop (Windows, macOS, Linux)
