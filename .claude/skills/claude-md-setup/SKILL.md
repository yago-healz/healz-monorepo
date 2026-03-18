---
name: claude-md-setup
description: Guide for creating and organizing CLAUDE.md files following official best practices. Use when the user asks to create, update, or review a CLAUDE.md file, or says things like "create CLAUDE.md", "setup claude md", "init claude", "configure claude code instructions", "add project instructions". Covers file hierarchy, rules organization, imports, and effective instruction writing.
---

# CLAUDE.md Setup Skill

Create and organize CLAUDE.md files that give Claude Code persistent, effective instructions.

## Core Concepts

CLAUDE.md files are **context, not configuration** — Claude reads them and tries to follow, but specificity and conciseness directly affect adherence. Shorter, clearer instructions work better.

## File Hierarchy (precedence: top → bottom)

| Scope | Location | Purpose | Shared with |
|---|---|---|---|
| Managed policy | Linux: `/etc/claude-code/CLAUDE.md` | Org-wide standards | All org users |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared project instructions | Team (via git) |
| User | `~/.claude/CLAUDE.md` | Personal preferences (all projects) | Only you |

**Loading:** Files in parent dirs load at startup. Files in subdirs load on-demand when Claude reads files there.

## Workflow

### Step 1 — Determine scope and location

Ask the user what type of CLAUDE.md they need:
- **Project-level** (most common): `./CLAUDE.md` or `./.claude/CLAUDE.md`
- **User-level**: `~/.claude/CLAUDE.md`
- **Rules** (modular/scoped): `.claude/rules/*.md`

If unclear, default to project-level `CLAUDE.md` at repo root.

### Step 2 — Gather project context

Before writing, explore the codebase to discover:
- Build/test/lint commands (`package.json`, `Makefile`, `Cargo.toml`, etc.)
- Project structure and architecture patterns
- Tech stack (languages, frameworks, libraries)
- Existing conventions (naming, file organization)
- Git workflow (branching strategy, commit conventions)

Use `/init` output as a starting point if available, then refine.

### Step 3 — Write the CLAUDE.md

Follow these rules strictly:

#### Size: target < 200 lines
- Longer files consume more context and reduce adherence
- Move detailed content to `.claude/rules/` or imported files

#### Structure: use markdown headings and bullets
- Group related instructions under clear headings
- Use short bullet points, not prose paragraphs

#### Specificity: write verifiable instructions
- "Use 2-space indentation" NOT "Format code properly"
- "Run `pnpm test` before committing" NOT "Test your changes"
- "API handlers live in `src/api/handlers/`" NOT "Keep files organized"

#### Only include what Claude can't derive from the code
- Don't repeat what's obvious from reading the codebase
- Focus on decisions, conventions, and gotchas that aren't self-evident
- Include commands that aren't discoverable from config files

### Step 4 — Organize with rules (if needed)

For larger projects, split instructions into `.claude/rules/`:

```
.claude/
├── CLAUDE.md              # Core project instructions (< 200 lines)
└── rules/
    ├── code-style.md      # Style guidelines
    ├── testing.md          # Test conventions
    ├── api-design.md       # API patterns
    └── frontend/
        └── components.md   # Frontend-specific rules
```

**Path-scoped rules** — only load when Claude works with matching files:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Rules
- All endpoints must include input validation
- Use standard error response format
```

Rules without `paths` frontmatter load unconditionally at startup.

### Step 5 — Use imports for large instruction sets

Reference external files with `@path/to/file` syntax:

```markdown
See @README.md for project overview.
See @docs/architecture.md for system design.

# Personal overrides
- @~/.claude/my-project-prefs.md
```

- Relative paths resolve from the file containing the import
- Max depth: 5 levels of recursive imports

## Recommended CLAUDE.md Template

```markdown
# Project Name

## Build & Run
- `command to install deps`
- `command to run dev`
- `command to run tests`
- `command to run single test` — pattern: `command -- path/to/test`
- `command to lint`
- `command to typecheck`

## Architecture
- Brief description of project structure
- Key directories and their purpose
- Important patterns (e.g., "feature-based architecture in src/features/")

## Code Conventions
- Language/framework-specific rules
- Naming conventions (files, variables, components)
- Import ordering rules
- Error handling patterns

## Git Workflow
- Branch naming convention
- Commit message format
- PR process

## Important Notes
- Non-obvious gotchas
- Environment setup requirements
- Things that break silently if done wrong
```

## What NOT to Put in CLAUDE.md

- Code patterns obvious from reading the codebase
- Git history (use `git log` / `git blame`)
- Debugging solutions (the fix is in the code/commit)
- Ephemeral task details
- Duplicate information already in README or other docs (use `@import` instead)
- Conflicting instructions (Claude picks arbitrarily)

## Troubleshooting Checklist

If Claude isn't following instructions:
1. Run `/memory` to verify the file is loaded
2. Check file location matches the session's working directory
3. Make instructions more specific
4. Look for conflicts between multiple CLAUDE.md files
5. Check file is under 200 lines
