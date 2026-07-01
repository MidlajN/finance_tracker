# Development Workflow

> Version: 1.0
>
> This document defines the development workflow for the Personal Finance Platform.
>
> Every implementation—whether performed by a human developer or an AI assistant—must follow this workflow.
>
> The objective is to maintain a stable, deterministic, and maintainable codebase throughout the lifetime of the project.

---

# Purpose

The development workflow exists to ensure:

- Consistent architecture
- Predictable implementations
- Complete milestones
- Stable releases
- Long-term maintainability

Every change should move the project forward without introducing architectural drift.

---

# Core Principles

Development always follows these principles:

- Architecture before implementation.
- One milestone at a time.
- Complete implementations.
- No duplicate logic.
- No unnecessary abstractions.
- No partial features.
- Every milestone leaves the repository deployable.

---

# Source of Truth

Before beginning any work, always read the project documentation.

Required reading order:

```
docs/codex.md

↓

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

docs/roadmap.md
```

Implementation should never begin without understanding these documents.

---

# Development Lifecycle

Every milestone follows the same lifecycle.

```
Read Documentation

↓

Determine Current Milestone

↓

Inspect Repository

↓

Design

↓

Implement

↓

Verify

↓

Update Documentation

↓

Complete Milestone
```

This process should never be skipped.

---

# Step 1 — Understand the Current Milestone

Read:

```
docs/roadmap.md
```

Determine:

- Current milestone
- Completed milestones
- Planned milestones

Only implement the current milestone.

Future milestones must not be implemented unless explicitly requested.

---

# Step 2 — Inspect the Repository

Before writing code:

Inspect:

- Existing repositories
- Existing services
- Existing stores
- Existing features
- Existing reusable components
- Existing utilities
- Existing types

Do not assume functionality is missing.

Search before creating.

---

# Step 3 — Evaluate Existing Implementations

Before creating anything new, ask:

Does something similar already exist?

If yes:

Extend it.

Do not create parallel implementations.

---

# Step 4 — Architecture Validation

Every implementation must respect:

```
Repository

↓

Service

↓

Store

↓

Feature

↓

Common Components
```

Business logic must remain inside Services.

Repositories own persistence.

Stores own application state.

Features own user interaction.

Common Components own presentation.

---

# Step 5 — Implementation

Implement only what is required for the current milestone.

Rules:

- Keep implementations complete.
- Keep files compile-ready.
- Avoid placeholders.
- Avoid TODOs.
- Avoid speculative abstractions.

---

# Step 6 — Validation

Before considering a milestone complete:

Verify:

- TypeScript compiles.
- Build succeeds.
- Existing functionality remains operational.
- No duplicate logic exists.
- Documentation remains accurate.

The repository should always remain releasable.

---

# Step 7 — Documentation

After completing a milestone:

Update:

```
docs/roadmap.md
```

Mark:

Completed milestone

↓

Current milestone

If architectural changes occurred:

Update:

```
docs/architecture.md
```

If development guidelines changed:

Update:

```
docs/codex.md
```

If platform structure changed:

Update the corresponding architecture document.

Documentation should always reflect reality.

---

# Repository Rules

Every implementation should:

- Reuse existing code.
- Extend existing abstractions.
- Preserve architecture.
- Minimize unrelated modifications.

Never:

- Refactor unrelated code.
- Replace architecture.
- Introduce duplicate services.
- Introduce duplicate repositories.

---

# Creating New Files

Before creating a file:

Search the repository.

If equivalent functionality exists:

Extend it.

Create new files only when introducing genuinely new responsibilities.

---

# Refactoring Policy

Refactoring is allowed only when:

- Fixing a bug.
- Removing duplication.
- Supporting the current milestone.
- Improving maintainability without changing behavior.

Avoid stylistic refactoring.

Avoid architecture changes during feature work.

---

# Dependency Rules

Dependencies should always point toward more generic layers.

Allowed:

```
Features

↓

Stores

↓

Services

↓

Repositories
```

Forbidden:

```
Repositories

↓

Features
```

Forbidden:

```
Services

↓

React Components
```

Forbidden:

```
Stores

↓

Supabase Queries
```

---

# Error Handling

Repositories:

Throw errors.

Services:

Translate or coordinate errors when appropriate.

Stores:

Expose user-facing state.

UI:

Display meaningful messages.

Never expose implementation details directly to users.

---

# Type Safety

Always use:

Generated Supabase types.

Infer types whenever practical.

Avoid:

- any
- duplicated models
- manually maintained database types

Maintain one source of truth.

---

# Testing Philosophy

Business logic should be verified at the shared logic layer.

Applications should verify:

- Rendering
- Navigation
- User interaction
- Platform integration

Avoid testing duplicated logic across multiple applications.

---

# Performance Philosophy

Prefer:

- Simplicity
- Readability
- Maintainability

Optimize only when justified.

Do not introduce complexity without measurable benefit.

---

# Security Philosophy

Every implementation should:

- Validate input.
- Respect ownership.
- Preserve Row Level Security.
- Avoid exposing sensitive information.
- Never trust client input.

Security should never rely solely on the UI.

---

# Documentation Philosophy

Documentation is part of the implementation.

Whenever behavior changes:

Update the corresponding document.

The documentation should always describe the current repository.

Never allow documentation to become outdated.

---

# Milestone Completion Checklist

A milestone is complete only when:

- Implementation is complete.
- TypeScript compiles.
- Build succeeds.
- Existing functionality works.
- No duplicate logic exists.
- Documentation is updated.
- Roadmap reflects the new project state.

---

# Long-Term Goal

The objective is not simply to build features.

The objective is to build a maintainable Personal Finance Platform that can continue evolving without architectural redesign.

Every implementation should improve one or more of:

- Financial data quality
- Financial intelligence
- User understanding
- Platform maintainability

without compromising the existing architecture.

---

# Relationship to Other Documents

This document defines how development is performed.

Related documents:

- `codex.md`
- `architecture.md`
- `platform.md`
- `monorepo.md`
- `shared-packages.md`
- `mobile-architecture.md`
- `notification-pipeline.md`
- `sync-architecture.md`
- `api-contract.md`
- `database.md`
- `roadmap.md`

Together these documents define both the architecture of the Personal Finance Platform and the process used to evolve it over time.