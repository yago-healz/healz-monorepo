---
name: feature-plan
description: Creates detailed implementation plans for new features and documents them in /docs/plans. Use when the user asks to plan, spec, or design a feature, or says things like "create a plan for", "planejar", "criar um plano", "plan this feature", "document the implementation of". Guides the AI to understand the request fully (asking clarifying questions when needed), then produce a concise, actionable plan that both humans and AI agents can follow — including task ordering and parallelization notes.
---

# Feature Plan Skill

## Goal

Produce a clear, actionable implementation plan saved to `/docs/plans/` that any developer or AI agent can follow independently.

## Workflow

### Step 1 — Understand before you plan

Before writing anything, make sure you fully understand:
- **What** needs to be built (feature, not implementation detail)
- **Why** it exists (business context, user need)
- **Constraints** (existing patterns, APIs, tech stack)
- **Scope** (what is explicitly OUT of scope)

**If anything is unclear → ask.** Do not guess on ambiguous requirements. One targeted question is better than a wrong plan. Ask all open questions in a single message.

### Step 2 — Explore the codebase

Read relevant existing code before designing. Look for:
- Similar features already implemented (patterns to follow)
- Files that will be modified or extended
- Shared types, services, or components to reuse

### Step 3 — Determine plan structure

| Complexity | Structure |
|---|---|
| Small (1–3 files, < 1 day) | Single file: `docs/plans/NNN-feature-name.md` |
| Medium/Large (multi-layer, > 1 day) | Directory: `docs/plans/NNN-feature-name/` with `README.md` + one file per task |

**Numbering:** use the next available 3-digit prefix (check existing files in `docs/plans/`).

### Step 4 — Write the plan

#### Single-file plan structure

```markdown
# Plano NNN — Feature Name

**Objetivo:** One sentence describing the outcome.

---

## Contexto
Why this is needed. Relevant existing code. Constraints.

## Arquivos afetados
List files to create, modify, or delete.

## Implementação

### 1. Task Name
What to do, specific enough to implement without guessing.
Include: file paths, function signatures, data shapes, API contracts.

### 2. Task Name
...

## Ordem de execução
1. Step A (blocker for B and C)
2. Step B and Step C ← can run in parallel
3. Step D

## Fora do escopo
List things explicitly NOT included.
```

#### Multi-file plan structure

`README.md` contains:
- Overview, context, architectural decisions
- Table of tasks with file references
- Execution order and parallelization map

Each task file (`01-task-name.md`, `02-task-name.md`, …) contains:
- Objective (1 sentence)
- Files to create/modify
- Implementation details (specific enough to act on)
- Acceptance criteria

### Step 5 — Mark parallelization

Always include an execution order section. Use clear notation:

```
1. [01-foundation.md] — must complete first (all others depend on this)
2. [02-api.md] + [03-types.md] — parallel (no mutual dependency)
3. [04-ui.md] — requires 02 and 03
4. [05-tests.md] — requires 04
```

## Plan Quality Criteria

A good plan:
- [ ] Can be handed to a different agent with zero additional context
- [ ] Each task has clear acceptance criteria or a "done when" statement
- [ ] No vague verbs ("handle", "manage", "deal with") — be specific
- [ ] Includes exact file paths, not just "create a component"
- [ ] Lists what is out of scope to prevent scope creep
- [ ] Parallelizable work is explicitly marked

## Style Guide

- Write in the same language the user used (PT-BR or EN)
- Be **concise but complete** — no filler text, no restating the obvious
- Use tables for mappings, lists for steps, code blocks for signatures/schemas
- Avoid walls of prose — use headers and bullets

## After Writing the Plan

1. Show the user the plan path(s) created
2. Summarize: number of tasks, estimated parallelization opportunities, key dependencies
3. Ask if they want to start implementing or adjust anything
