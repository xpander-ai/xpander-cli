# Xpander CLI - Claude Workflow Configuration

## 🎯 MANDATORY WORKFLOW PATTERN

### Before Starting ANY Work

**CRITICAL: You MUST follow this workflow for ALL tasks.**

1. **ASK FOR NOTION TICKET ID FIRST**
   - Use AskUserQuestion: "What is the Notion ticket ID for this task?"
   - Format: PRD-1234, FEAT-5678, etc.

2. **CREATE FEATURE BRANCH**
   - Format: `{initials}-{date}-{notion-ticket-id}`
   - Example: `dt-20251210-prd-1234`
   - Push immediately: `git push -u origin {branch-name}`

3. **COMMIT FORMAT**
   - Format: `{type}: [{NOTION-TICKET-ID}] {description}`
   - Examples:
     - `feat: [PRD-1234] add agent deployment retry logic`
     - `fix: [BUG-5678] resolve authentication timeout`
   - Types: feat, fix, docs, style, refactor, test, chore

4. **PR FORMAT**
   - Title: `{type}: [{NOTION-TICKET-ID}] {description}`
   - Body must include:
     - Notion Ticket ID
     - Summary (bulleted)
     - Test Plan
     - Screenshots (if applicable)

**Enforcement:**
- STOP if you don't have a Notion ticket ID
- Ask user using AskUserQuestion
- Do NOT proceed without it

---

## 🔧 BUILD, TEST, AND VERIFICATION

### Quick Build & Test

```bash
# Install dependencies
npm install

# Full build (compile + test + lint + package)
npm run build

# Test CLI
node lib/index.js --version
node lib/index.js --help
```

### Expected Results

✅ **Build Output:**
- TypeScript → JavaScript (170 files in `lib/`)
- 24 tests pass, 96.78% coverage
- ESLint passes (no errors)
- Package: `dist/js/xpander-cli-0.0.0.tgz`

✅ **CLI Works:**
- Shows version and banner
- All commands available
- Agent subcommands work

### Development Workflow

```bash
# 1. Make changes in src/
# 2. Run tests in watch mode
npm run test:watch

# 3. Check linting
npm run eslint

# 4. Full build before commit
npm run build

# 5. Test CLI
node lib/index.js [command]

# 6. Commit with Notion ticket
git commit -m "feat: [TICKET-ID] description"
```

### Verification Checklist

Before committing:
- [ ] `npm run build` completes successfully
- [ ] All 24 tests pass
- [ ] ESLint passes
- [ ] CLI commands work: `node lib/index.js --help`
- [ ] Commit message includes Notion ticket ID

**Troubleshooting:**
- Build fails? `rm -rf node_modules lib/ && npm install && npm run build`
- Tests fail? `npm run test:watch` to debug
- Lint fails? `npm run eslint` (auto-fixes most issues)

---

## 💻 CODE STYLE REQUIREMENTS

**Non-negotiable:**
- 2-space indentation (NO tabs)
- Single quotes in TypeScript/JavaScript
- async/await only (no callbacks)
- camelCase for variables/functions
- Conventional Commits format
- All tests must pass before commits
- ESLint must pass (no workarounds)

---

## 📚 CODEBASE OVERVIEW

### Project Info
- **Language**: TypeScript, Node.js >= 20.18.1
- **Package**: `xpander-cli` on npm
- **Binaries**: `xpander` and `x`
- **Build System**: Projen + TypeScript + Jest

### Key Structure

```
src/
├── index.ts              # CLI entry point
├── commands/             # All CLI commands (48 files)
│   ├── agent/            # Agent management
│   ├── login.ts          # Authentication
│   ├── deploy.ts         # Deployment
│   └── ...
├── utils/                # Utilities (19 files)
│   ├── client.ts         # XpanderClient (Axios API)
│   ├── config.ts         # Config management
│   ├── auth.ts           # Auth flow
│   └── ...
└── types/                # TypeScript types (12 files)
```

### Key Commands

```
xpander (alias: x)
├── agent             # Manage agents (list, new, init, deploy, dev, logs, etc.)
├── login             # Authenticate
├── configure         # Setup credentials
├── deploy [agent]    # Deploy to cloud
├── dev [agent]       # Run locally
└── logs [agent]      # View logs
```

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point |
| `src/commands/agent/index.ts` | Agent command router |
| `src/utils/client.ts` | XpanderClient (API) |
| `src/utils/config.ts` | Config/credentials |
| `src/types/agents.ts` | Agent data types |

### Dependencies

**Core:** Commander.js (CLI), Projen (build), Axios (API)
**UI:** Chalk (colors), Inquirer (prompts), Ora (spinners)
**Dev:** TypeScript, Jest, ESLint, Prettier

### Testing

- 24 tests (96.78% coverage)
- Jest + ts-jest
- Coverage reports in `coverage/`
- Run: `npm test` or `npm run test:watch`

---

## 🚫 NEVER / ✅ ALWAYS

**NEVER:**
- Start work without Notion ticket ID
- Commit to main directly
- Skip tests or linting
- Use tabs or double quotes
- Ignore ESLint errors

**ALWAYS:**
- Ask for Notion ticket ID first
- Create feature branch with proper naming
- Reference ticket in ALL commits/PRs
- Run `npm run build` before committing
- Follow Conventional Commits format

---

## 🎬 QUICK EXAMPLE

**User:** "Add retry logic for deployments"

**Your workflow:**
1. Ask: "What is the Notion ticket ID?"
2. User: "PRD-1234"
3. `git checkout -b dt-20251210-prd-1234 && git push -u origin dt-20251210-prd-1234`
4. Implement feature + tests
5. `npm run build` (verify tests pass)
6. `git commit -m "feat: [PRD-1234] add deployment retry with exponential backoff"`
7. `gh pr create --title "feat: [PRD-1234] add deployment retry logic"`

---

This configuration ensures all work is traceable to Notion tickets and follows consistent standards.
