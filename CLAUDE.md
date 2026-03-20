# Agents Configuration Manager

> This document is for agents and LLMs to follow when working with this project.

## Critical Rules

### 1. Internationalization (Mandatory)

- **ALL user-facing text MUST be internationalized**
- Use translation keys from `zh-CN.json` and `en-US.json`
- NEVER hardcode text strings in components or UI
- Example: `<button>{t('common.save')}</button>` instead of `<button>Save</button>`

### 2. Build & Execution Restrictions

- **NEVER automatically run** `npm run dev`, `npm run build`, `npm run tauri dev`, or `npm run tauri build`
- Only run build commands when explicitly requested by the user
- **Default dev server is already running** and supports hot reload
- **NEVER kill ports or restart the dev server** - Vite's HMR will automatically apply changes

### 4. Type Safety - No `any` Types (Mandatory)

- **NEVER use `any` type** in TypeScript code
- Use proper type definitions or `unknown` instead
- Example: `const editorInstance: IStandaloneCodeEditor = ...`

### 5. Code Comments and Logs

- **ALL code comments and console logs MUST be in English**

### 6. Cross-Platform Support (Mandatory)

- **ALL new features MUST support Windows, macOS, and Linux platforms**
- Use Node.js `os` module or `process.platform` for platform detection
- Test on all supported platforms before marking a task as complete
- Use cross-platform compatible commands and paths (e.g., handle both `/` and `\` separators)
- Example: `const isWindows = process.platform === 'win32'`

### 7. Tauri IPC Updates (Mandatory)

- **MUST update mock implementations** in `src/__mocks__/` when adding or modifying Tauri IPC functions
- Keep mock implementations synchronized with actual API changes
- Ensure mock functions match the signature and behavior of real IPC handlers
- Example: When adding `readConfigFile` to `fileApi.ts`, also add it to `src/__mocks__/fileApi.ts`

### 8. CLAUDE.md Updates (Mandatory)

- **MUST use agents-md-updater skill** when adding or modifying rules in CLAUDE.md
- Use the `Skill` tool with `agents-md-updater` to ensure consistent formatting and structure
- Follow the existing rule format when adding new rules
- Example: Use `Skill` tool with `skill: "agents-md-updater"` before making any changes

### 9. Node.js Static Checking (Mandatory)

- **MUST run static analysis after modifying Node.js files in src/**
- Use `npm run lint` to verify code quality (ESLint)
- Use `npm run typecheck` to verify TypeScript types (vue-tsc)
- Fix all warnings and errors before marking a task as complete
- Example: `npm run lint && npm run typecheck`

### 10. Frontend Verification (Mandatory)

- **MUST run browser testing after modifying frontend files**
- Use Playwright MCP tools to verify the changes work correctly in browser
- This applies to .html/.css/.js/.jsx/.ts/.tsx/.vue/.svelte files
- Use `playwright_browser_navigate` to access http://localhost:1420 for testing

### 11. Architecture Analysis Before Coding (Mandatory)

- **MUST analyze project architecture before writing any code**
- Review existing code structure and identify reusable logic
- **Check for existing code that can be reused BEFORE writing new code**
- Consider refactoring opportunities before implementing new features
- Check for similar patterns or utilities that can be leveraged
- Example: Before creating a new utility function, search for existing helpers in `src/utils/` or similar directories

### 12. Code Review After Writing (Mandatory)

- **MUST reflect on whether the code is reasonable after writing**
- Check if the implementation follows best practices and project conventions
- Verify if there are simpler or more elegant solutions
- **Check for duplicate code that can be extracted for reuse**
- Ensure the code is maintainable and readable
- Consider if the changes could introduce bugs or edge cases

## Project Info

- **Frontend**: TypeScript + Vite
- **Backend**: Tauri (Rust)
- **Platform**: Cross-platform desktop (Windows, macOS, Linux)
- **Dev Server Port**: 1420
