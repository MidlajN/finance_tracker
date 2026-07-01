# Personal Finance Engine Architecture

> Version: 1.0
>
> This document defines the application architecture of the Personal
> Finance Engine.
>
> It describes the architecture of the Finance Engine itself. Platform
> architecture, mobile architecture, synchronization, API contracts and
> development workflow are documented in their respective documents
> under `docs/`.

------------------------------------------------------------------------

# Purpose

The Personal Finance Engine is the deterministic business engine of the
Personal Finance Platform.

Its responsibility is to transform financial inputs into trusted
financial knowledge.

The engine owns:

-   Financial Event lifecycle
-   Rule Engine
-   Merchant Intelligence
-   Transaction lifecycle
-   Dashboard calculations
-   Budget calculations
-   Recurring detection
-   Reports
-   Financial analytics

The engine is independent of the client that produced the financial
data.

------------------------------------------------------------------------

# Philosophy

The engine prioritizes:

-   Correctness before convenience
-   Deterministic behaviour
-   Explicit workflows
-   Separation of concerns
-   Type safety
-   Long-term maintainability

Prefer deterministic behaviour over clever behaviour.

------------------------------------------------------------------------

# Scope

This document defines:

-   Layered application architecture
-   Finance Engine responsibilities
-   Data lifecycle
-   Module ownership
-   Business rule ownership

It does **not** define:

-   Platform architecture
-   Mobile architecture
-   Monorepo layout
-   Synchronization
-   API contracts
-   Development workflow

Those topics are documented separately.

------------------------------------------------------------------------

# Layered Architecture

    Repositories
            ↓
    Services
            ↓
    Stores
            ↓
    Features
            ↓
    Common Components

Every feature must respect this layering.

No layer may bypass another.

------------------------------------------------------------------------

# Repository Layer

Repositories own persistence.

Responsibilities:

-   CRUD
-   RPC
-   Queries
-   Database mapping
-   Persistence

Repositories never contain:

-   Business rules
-   React
-   Zustand
-   UI logic

------------------------------------------------------------------------

# Service Layer

Services own business logic.

Responsibilities include:

-   Event confirmation
-   Rule evaluation
-   Merchant intelligence
-   Dashboard calculations
-   Budget calculations
-   Reports
-   Recurring detection
-   Transaction synchronization

Services coordinate repositories.

Services never know about React.

------------------------------------------------------------------------

# Store Layer

Stores expose application state.

Responsibilities:

-   Loading
-   Error state
-   Refresh
-   Selection
-   Calling Services

Stores do not contain business rules.

------------------------------------------------------------------------

# Feature Layer

Features represent application screens.

Responsibilities:

-   User interaction
-   Local form state
-   Dialog state
-   Rendering

Business logic belongs in Services.

------------------------------------------------------------------------

# Common Components

Reusable presentation components.

Examples:

-   Button
-   Dialog
-   MerchantCombobox
-   CategorySelect
-   Badge
-   Card

Components should remain presentation-focused.

------------------------------------------------------------------------

# Finance Engine Pipeline

Every financial input follows the same deterministic lifecycle.

    Financial Source

    ↓

    Financial Event

    ↓

    Rule Engine

    ↓

    Merchant Intelligence

    ↓

    User Review

    ↓

    Transaction

    ↓

    Dashboard

    ↓

    Budgets

    ↓

    Recurring Detection

    ↓

    Reports

    ↓

    Financial Insight

Every future capability integrates into this pipeline.

------------------------------------------------------------------------

# Finance Engine Modules

## Financial Events

Financial Events are temporary.

They represent pending financial activity.

Financial Events may be:

-   Created
-   Edited
-   Ignored
-   Confirmed

They never become analytics directly.

------------------------------------------------------------------------

## Rule Engine

Rules are deterministic.

Supported responsibilities:

-   Merchant assignment
-   Category assignment
-   Auto confirmation
-   Event enrichment

Rules execute before user review.

------------------------------------------------------------------------

## Merchant Intelligence

Merchant Intelligence owns:

-   Canonical merchants
-   Merchant aliases
-   Merchant normalization
-   Usage tracking
-   Default categories

Merchant Intelligence improves financial quality over time.

------------------------------------------------------------------------

## Transactions

Transactions are permanent.

They power:

-   Dashboard
-   Budgets
-   Reports
-   Analytics
-   Recurring detection

Editing a transaction must preserve consistency with linked Financial
Events.

------------------------------------------------------------------------

## Dashboard

Dashboard consumes confirmed Transactions.

Dashboard calculations belong in DashboardService.

UI never performs financial aggregation.

------------------------------------------------------------------------

## Budgets

Budgets consume confirmed expense Transactions.

Budget calculations belong in BudgetService.

------------------------------------------------------------------------

## Recurring Detection

Recurring detection consumes confirmed Transactions.

Detection belongs in RecurringService.

------------------------------------------------------------------------

## Reports

Reports are generated from confirmed Transactions.

Aggregation belongs in ReportService.

------------------------------------------------------------------------

# Business Rule Ownership

Business logic belongs in Services.

Never place business logic inside:

-   Components
-   Stores
-   Repositories

------------------------------------------------------------------------

# State Management

Global state:

-   Authentication
-   Events
-   Transactions
-   Merchants
-   Categories
-   Dashboard
-   Budgets
-   Reports

Local state:

-   Forms
-   Search
-   Dialog visibility
-   Selection

Temporary UI state should remain local.

------------------------------------------------------------------------

# Type Safety

Use generated Supabase types.

Infer repository result types whenever practical.

Avoid duplicated models.

Avoid `any`.

------------------------------------------------------------------------

# Error Handling

Repositories throw.

Services coordinate.

Stores expose state.

UI renders user-friendly errors.

------------------------------------------------------------------------

# Architecture Rules

Always:

-   Extend existing abstractions.
-   Reuse repositories.
-   Reuse services.
-   Reuse components.
-   Preserve deterministic behaviour.

Never:

-   Duplicate business logic.
-   Bypass the architecture.
-   Introduce parallel implementations.
-   Mix persistence with business logic.

------------------------------------------------------------------------

# Relationship to Other Documents

This document defines only the Finance Engine.

Additional architecture is documented in:

-   docs/platform.md
-   docs/monorepo.md
-   docs/shared-packages.md
-   docs/mobile-architecture.md
-   docs/notification-pipeline.md
-   docs/sync-architecture.md
-   docs/api-contract.md
-   docs/database.md
-   docs/development-workflow.md
-   docs/roadmap.md
-   docs/codex.md

Together these documents define the complete Personal Finance Platform.
