# Monorepo Architecture

> Version: 1.0
>
> This document defines the repository organization of the Personal Finance Platform.
>
> The goal is to separate applications, shared business logic and infrastructure while maintaining a single source of truth.
>
> Every structural change to the repository must follow this document.

---

# Purpose

The Personal Finance Platform is composed of multiple applications that solve different user problems while sharing the same financial engine.

A monorepo allows:

- Shared business logic
- Shared types
- Shared API contracts
- Shared validation
- Consistent tooling
- Single version history
- Simpler dependency management

The objective is **one platform**, not multiple unrelated projects.

---

# Guiding Principles

The repository should organize code by **responsibility**, not by framework.

Applications should contain only application-specific code.

Business logic should never be duplicated between applications.

Every shared implementation should exist exactly once.

---

# Repository Structure

```
finance-platform/

apps/
packages/
supabase/
docs/
tooling/
```

Each top-level directory has a single responsibility.

Current status:

- `apps/web` contains the existing React web application.
- `apps/mobile` exists as the mobile application boundary.
- `packages` exists as the shared package boundary.
- `supabase` remains at the repository root.
- Shared package extraction is complete.
- The Expo React Native mobile foundation is complete.
- Android notification collection is the next milestone.

---

# apps/

Applications that users interact with.

Current structure:

```
apps/

web/
mobile/
```

Future additions:

```
desktop/

admin/

playground/
```

Applications should remain independent.

Applications should never import from one another.

Applications communicate only through shared packages.

---

# apps/web

Technology:

- React
- TypeScript
- Vite

Responsibilities:

- Financial event review
- Dashboard
- Reports
- Rule management
- Merchant management
- Categories
- Budgets
- Administration

The web application provides the complete desktop experience.

---

# apps/mobile

Technology:

- Expo SDK 57
- React Native 0.86
- TypeScript

Responsibilities:

- Notification listener
- Offline operation
- Background synchronization
- Mobile dashboard
- Transaction review
- Native capabilities
- Biometrics

The mobile application provides the primary mobile experience.

---

# packages/

Packages contain reusable platform logic.

Packages must remain framework independent whenever possible.

Packages should not depend on React or React Native.

Current packages:

- `finance-core`
- `shared-types`
- `shared-api`
- `shared-utils`
- `parser`

---

# finance-core

Purpose:

Central business logic.

Contains:

- Rule Engine
- Merchant Intelligence
- Budget calculations
- Dashboard calculations
- Recurring detection
- Reports
- Financial utilities

This package contains the heart of the platform.

---

# shared-types

Purpose:

Shared TypeScript types.

Contains:

- Financial Event
- Transaction
- Merchant
- Category
- Rule
- Budget
- Report models
- DTOs

No application should redefine these types.

---

# shared-api

Purpose:

Shared API layer.

Contains:

- Request models
- Response models
- API clients
- Validation
- Endpoint definitions

Both Web and Mobile use the same API package.

---

# shared-utils

Purpose:

Pure utility functions.

Examples:

- Formatting
- Date helpers
- Currency helpers
- Validation helpers
- String normalization

Utilities should never contain business logic.

---

# parser

Purpose:

Financial input normalization.

Contains:

- Notification parsers
- CSV parsers
- Email parsers

Every parser produces a common Parsed Financial Event.

---

# supabase/

Contains all backend resources.

Examples:

```
migrations/

functions/

policies/

seed/

types/
```

Responsibilities:

- Database schema
- Migrations
- SQL functions
- Row Level Security
- Generated types

Supabase remains the single persistent backend.

---

# docs/

Contains project documentation.

Current documents:

```
architecture.md

platform.md

monorepo.md

shared-packages.md

mobile-architecture.md

notification-pipeline.md

sync-architecture.md

api-contract.md

database.md

development-workflow.md

roadmap.md

codex.md
```

Documentation should evolve with the platform.

---

# tooling/

Repository tooling.

Examples:

```
eslint

prettier

typescript

scripts

ci
```

Tooling should be shared across applications whenever practical.

---

# Dependency Rules

Allowed:

```
apps

↓

packages
```

Allowed:

```
packages

↓

shared packages
```

Allowed:

```
packages

↓

supabase contracts
```

Not allowed:

```
web

↓

mobile
```

Not allowed:

```
mobile

↓

web
```

Applications remain independent.

---

# Business Logic Placement

Business logic belongs inside shared packages.

Not inside applications.

Examples:

Correct:

```
finance-core

↓

Rule Engine
```

Incorrect:

```
apps/web

↓

Rule Engine
```

---

# UI Placement

UI belongs inside applications.

React components remain inside:

```
apps/web
```

React Native components remain inside:

```
apps/mobile
```

UI is never shared.

Business logic is.

---

# Native Capabilities

Native platform integrations belong only inside the application that owns them.

Examples:

Android:

- Notification Listener
- Biometrics
- SQLite
- Background Services

Web:

- Browser storage
- File uploads
- Desktop interactions

These implementations should expose platform-independent interfaces whenever possible.

---

# Shared Contracts

Applications communicate using shared contracts.

Examples:

```
ParsedFinancialEvent

Transaction

BudgetSummary

DashboardSummary
```

Contracts should be versioned and documented.

---

# Package Independence

Packages should be:

- Stateless
- Testable
- Platform independent
- Type-safe
- Reusable

Avoid package interdependencies unless required.

---

# Import Rules

Applications may import:

```
packages/*
```

Packages may import:

```
shared-types

shared-utils
```

Avoid circular dependencies.

Every dependency should point toward more generic code.

---

# Migration Status

Phase 13.1 completed the initial monorepo migration.

Completed:

- Moved the existing React application into `apps/web`.
- Created the `apps/mobile` application boundary.
- Created the `packages` shared package boundary.
- Preserved root-level commands for web development and verification.

Completed:

- Extracted shared business logic into packages.
- Kept application-specific UI inside each app.
- Updated web imports to consume shared packages.

Next:

1. Implement Android notification collection.
2. Keep application-specific UI inside each app.
3. Continue routing shared business logic through packages.

The migration should preserve functionality after every step.

---

# Versioning

The platform should evolve together.

Applications should consume compatible versions of shared packages.

Breaking changes should be introduced deliberately and documented.

---

# Testing Strategy

Shared packages should contain the majority of business logic tests.

Applications should focus on:

- UI
- Navigation
- Integration
- Platform-specific behavior

This minimizes duplicated testing effort.

---

# Repository Goals

The repository should remain:

- Modular
- Predictable
- Scalable
- Type-safe
- Easy to navigate
- Easy to extend

New applications should require minimal structural changes.

---

# Relationship to Other Documents

This document defines repository organization.

Related documents:

- `platform.md`
  - Overall platform architecture.

- `architecture.md`
  - Application architecture.

- `shared-packages.md`
  - Responsibilities of each shared package.

- `mobile-architecture.md`
  - Mobile application structure.

- `notification-pipeline.md`
  - Financial event processing.

- `sync-architecture.md`
  - Synchronization model.

- `development-workflow.md`
  - Repository development process.

Together these documents define how the Personal Finance Platform is organized and how it should evolve over time.
