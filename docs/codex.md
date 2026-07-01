# Codex Development Guide

> Version: 1.0
>
> This document defines how AI assistants (Codex) should contribute to the Personal Finance Platform.
>
> It defines the development workflow, implementation rules and repository contract.
>
> It does **not** redefine the architecture documented elsewhere.

---

# Purpose

The purpose of this document is to ensure every implementation:

- Preserves the existing architecture
- Produces production-ready code
- Avoids duplicate implementations
- Completes one milestone at a time
- Leaves the repository in a working state

This document should be read before every implementation.

---

# Startup Procedure

Before writing or modifying any code, complete every step in order.

## Step 1

Read the following documents in this order.

```
docs/architecture.md

↓

docs/platform.md

↓

docs/monorepo.md

↓

docs/shared-packages.md

↓

docs/mobile-architecture.md

↓

docs/notification-pipeline.md

↓

docs/sync-architecture.md

↓

docs/api-contract.md

↓

docs/database.md

↓

docs/development-workflow.md

↓

docs/roadmap.md

↓

docs/codex.md
```

Do not begin implementation until every document has been read.

---

## Step 2

Determine the current milestone from:

```
docs/roadmap.md
```

Only implement the current milestone.

Never begin work on future milestones unless explicitly instructed.

---

## Step 3

Inspect the repository.

Understand the existing implementation before making changes.

Search for existing:

- repositories
- services
- stores
- features
- reusable components
- utilities
- types

Never assume functionality does not exist.

---

## Step 4

Determine the nature of the requested work.

Examples:

- Bug Fix
- New Feature
- Refactor
- Documentation
- Architecture Change

Only perform the requested work.

Avoid unrelated modifications.

---

# Documentation Priority

When documentation overlaps, use the following precedence.

1. architecture.md
2. platform.md
3. monorepo.md
4. shared-packages.md
5. mobile-architecture.md
6. notification-pipeline.md
7. sync-architecture.md
8. api-contract.md
9. database.md
10. development-workflow.md
11. roadmap.md
12. codex.md

Higher priority documents always take precedence.

---

# Decision Hierarchy

When multiple implementation approaches exist, always prefer:

```
Reuse Existing Implementation

↓

Extend Existing Implementation

↓

Create New Implementation

↓

Create New Abstraction

↓

Change Architecture
```

Architecture changes are the final option.

---

# Repository Rules

Before creating anything new, search the repository.

Before creating:

- Repository
- Service
- Store
- Feature
- Component
- Utility
- Hook

Determine whether an existing implementation can be extended.

Never introduce duplicate implementations.

---

# Implementation Rules

Implement one complete milestone at a time.

Do not:

- Scaffold future milestones.
- Leave partially implemented features.
- Introduce placeholder implementations.
- Create TODO-only code.
- Create speculative abstractions.

Every implementation should be production ready.

---

# Architecture Rules

Follow the architecture defined in:

```
docs/architecture.md
```

Never bypass the architecture.

Never introduce parallel implementations.

Never move business logic into UI layers.

Never move persistence into Services or Components.

---

# Refactoring Rules

Refactor only when required to:

- Fix a bug
- Remove duplication
- Support the current milestone
- Improve maintainability without changing behavior

Do not perform stylistic refactoring.

Do not rename files unnecessarily.

Do not reorganize unrelated code.

---

# Code Quality

Every implementation should:

- Compile successfully
- Use strict typing
- Reuse existing abstractions
- Preserve deterministic behavior
- Be production ready

Avoid:

- any
- duplicated models
- duplicated logic
- unused code
- dead code

---

# Type Safety

Always use:

- Generated Supabase types
- Type inference where practical

Never manually duplicate database models.

Never introduce unnecessary custom types.

---

# Security

Never trust client input.

Respect:

- Row Level Security
- Ownership validation
- Authentication
- Authorization

Avoid exposing:

- Database errors
- Internal implementation details
- Sensitive information

---

# Performance

Prefer:

- Simplicity
- Readability
- Maintainability

Optimize only when measurable benefits justify additional complexity.

Avoid premature optimization.

---

# AI Behaviour

Before implementing:

Understand the existing implementation.

Do not guess.

Do not invent APIs.

Do not invent files.

Do not invent architecture.

Inspect the repository first.

If required context is missing, request the relevant file rather than making assumptions.

---

# Documentation Updates

Whenever a milestone changes the repository:

Update:

```
docs/roadmap.md
```

If architecture changes:

Update the appropriate architecture document.

Do not duplicate architectural information across multiple documents.

Each document should own one responsibility.

---

# Repository Contract

Every completed implementation must leave the repository in a working state.

Before finishing:

- Ensure TypeScript compiles.
- Ensure the project builds successfully.
- Remove dead code.
- Remove duplicate implementations.
- Preserve the existing architecture.
- Keep unrelated files untouched.
- Return complete compile-ready files.

Never leave placeholder implementations.

---

# Milestone Completion Checklist

Before marking a milestone complete, verify:

- Repository builds successfully.
- TypeScript compiles.
- Existing functionality remains operational.
- No duplicate implementations were introduced.
- No unnecessary files were created.
- Documentation has been updated if required.
- `docs/roadmap.md` has been updated.
- The completed milestone is marked complete.
- The next milestone is marked as current.

Only then should the milestone be considered finished.

---

# Goal

Build a long-lived, maintainable Personal Finance Platform.

Every implementation should improve one or more of:

- Financial data quality
- Financial intelligence
- User understanding
- Maintainability

without compromising the established architecture.

The objective is not simply to complete features.

The objective is to preserve and evolve the architecture while delivering complete, production-ready implementations.