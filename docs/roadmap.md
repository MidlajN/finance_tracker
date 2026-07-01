# Personal Finance Engine Roadmap

> Version: 1.0
>
> This document defines the implementation roadmap of the Personal Finance Engine.
>
> The roadmap exists to ensure development happens in a deliberate sequence. Every milestone builds on the previous one.
>
> Before implementing a feature, verify its position in this roadmap.
>
> Do not implement future milestones unless explicitly requested.

---

# Project Goal

Build a long-term Personal Finance Engine capable of collecting financial information from multiple sources, enriching it with financial intelligence, and transforming it into actionable financial insights.

The architecture should support future expansion without requiring fundamental redesigns.

---

# Development Philosophy

Development follows these principles:

- One milestone at a time.
- Every milestone leaves the project in a working state.
- Prefer extending existing architecture over introducing new abstractions.
- Complete a feature before starting another.
- Do not partially implement future milestones.
- Architecture always takes priority over feature count.

---

# Current Project Status

## Phase 1 — Foundation

Status: ✅ Complete

Completed:

- Project setup
- Vite + React + TypeScript
- Supabase integration
- Authentication
- Common component library
- Layout
- Routing
- Utility layer

---

## Phase 2 — Financial Events

Status: ✅ Complete

Completed:

- Financial Event model
- Event repository
- Event store
- Event management UI
- Event review
- Event confirmation
- Event ignore
- Event details
- Event creation

Outcome:

Financial events became the central ingestion model of the application.

---

## Phase 3 — Merchant Intelligence

Status: ✅ Complete

Completed:

- Merchant repository
- Merchant management
- Merchant search
- Merchant aliases
- Merchant learning
- MerchantCombobox
- Merchant normalization

Outcome:

The system can learn merchants and improve categorization over time.

---

## Phase 4 — Categories

Status: ✅ Complete

Completed:

- Category repository
- Category store
- Category management
- Category selection
- Merchant category assignment

Outcome:

Transactions can be categorized consistently.

---

## Phase 5 — Transactions

Status: ✅ Complete

Completed:

- Transaction repository
- Transaction store
- Transaction service
- Transaction details
- Transaction editing
- Transaction browsing

Outcome:

Financial events are transformed into permanent financial transactions.

---

## Phase 6 — Dashboard Intelligence

Status: ✅ Complete

Completed:

- Dashboard service
- Dashboard store
- Financial summaries
- Recent transactions
- Merchant summary
- Category summary
- Financial statistics

Outcome:

The application provides meaningful financial insights from confirmed transactions.

---

## Phase 7 — Rule Engine

Status: ✅ Complete

Completed:

- Financial rule model
- Rule repository
- Rule engine service
- Rule store
- Rule management UI
- Deterministic rule evaluation
- Merchant assignment
- Category assignment through event metadata
- Rule ordering
- Event creation pipeline integration

Objective:

Introduce deterministic financial intelligence.

Purpose:

Automatically enrich financial events before user review.

Scope:

- Rule Engine
- Rule evaluation
- Merchant assignment
- Category assignment
- Rule ordering
- Rule execution service
- Rule management UI

Rules should support:

- Merchant equals
- Merchant contains
- Merchant starts with
- Merchant ends with
- Regular expression

Actions:

- Assign merchant
- Assign category

Future event sources must reuse this engine.

No AI or machine learning should be introduced.

Completion Criteria:

- Rule engine integrated into event pipeline.
- Rule evaluation isolated inside services.
- Rules reusable across all event sources.

Outcome:

Financial events can be deterministically enriched before review using reusable merchant and category assignment rules.

---

# Current Milestone

## Phase 8 — Automation

Status: ✅ Complete

Completed:

- Auto merchant recognition through rules
- Auto categorization through rules
- Auto-confirm rule action
- Merchant defaults during confirmation
- Category defaults during confirmation
- Event pipeline automation through EventService

Objective:

Reduce manual user interaction.

Scope:

- Auto categorization
- Auto merchant recognition
- Auto confirmation rules
- Merchant defaults
- Category defaults

Completion Criteria:

Frequently occurring financial events require minimal user interaction.

Outcome:

Deterministic rules can enrich and optionally confirm matching financial events, reducing manual review for trusted recurring activity.

---

## Phase 9 — Budgets

Status: ✅ Complete

Completed:

- Budget model
- Budget repository
- Budget service
- Budget store
- Budget UI
- Monthly category budgets
- Monthly progress
- Budget warnings

Objective:

Introduce monthly budgeting.

Scope:

- Budget model
- Budget repository
- Budget service
- Budget UI
- Category budgets
- Monthly progress
- Budget warnings

Completion Criteria:

Users can define monthly spending limits.

Outcome:

Users can define monthly category spending limits and track confirmed expense progress against each budget.

---

## Phase 10 — Recurring Transactions

Status: ✅ Complete

Completed:

- Recurring service
- Recurring store
- Recurring activity UI
- Salary detection
- Subscription detection
- Bill detection
- Frequency analysis
- Confidence scoring

Objective:

Detect recurring financial activity.

Scope:

- Salary detection
- Subscription detection
- Bill detection
- Frequency analysis
- Confidence scoring

Completion Criteria:

Recurring financial activity is automatically identified.

Outcome:

The application detects recurring income and expense patterns from confirmed transactions using deterministic timing and amount consistency.

---

## Phase 11 — Reports

Status: ✅ Complete

Completed:

- Report service
- Report store
- Report UI
- Monthly report
- Yearly report
- Income summary
- Expense summary
- Category report
- Merchant report

Objective:

Generate financial summaries.

Scope:

- Monthly report
- Yearly report
- Income summary
- Expense summary
- Category report
- Merchant report

Completion Criteria:

Users can understand financial trends over time.

Outcome:

Users can review monthly and yearly financial summaries grouped by category, merchant and confirmed transactions.

---

## Phase 12 — Import / Export

Status: ✅ Complete

Completed:

- Import/export service
- Import/export store
- Import/export UI
- CSV import into Financial Events
- Transaction CSV export
- Financial Event backup export
- Financial Event backup restore
- CSV validation
- Duplicate detection

Objective:

Support external financial data.

Scope:

- CSV import
- CSV export
- Backup
- Restore
- Data validation
- Duplicate detection

Completion Criteria:

External financial records integrate into the same Financial Event pipeline.

Outcome:

External records can be imported or restored as Financial Events, and confirmed transactions can be exported without bypassing the event pipeline.

---
# Current Milestone

## Phase 13 — Platform Evolution

Status: ⏳ Current

Objective:

Evolve the Personal Finance Engine into a multi-client Personal Finance Platform while preserving the existing deterministic financial pipeline.

The Finance Engine remains the single source of business logic.

The Mobile Client becomes a first-class application that consumes the same Finance Engine as the Web Client.

---

### Phase 13.1 — Monorepo Migration

Status: ✅ Complete

Completed:

- Moved the existing React application into `apps/web`
- Introduced the `apps/mobile` application boundary
- Introduced the `packages` shared package boundary
- Preserved root-level development, build, typecheck, lint and preview commands
- Preserved Supabase resources and project documentation at the repository root

Objective:

Prepare the repository for multiple applications without changing the existing architecture.

Scope:

- Move the existing React application into `apps/web`
- Introduce `apps/mobile`
- Introduce `packages`
- Preserve existing functionality
- Preserve build process
- Preserve documentation

Completion Criteria:

The repository supports multiple applications while preserving the existing web application.

Outcome:

The project becomes a platform capable of supporting multiple clients.

---

### Phase 13.2 — Shared Packages

Status: ✅ Complete

Completed:

- Created `packages/shared-types` for cross-client financial contracts
- Created `packages/shared-utils` for pure formatting, normalization and date helpers
- Created `packages/finance-core` for deterministic rules, dashboard, budget, report and recurring calculations
- Created `packages/parser` for CSV financial event normalization and import/export serialization helpers
- Created `packages/shared-api` for API and synchronization contracts
- Updated the web application to consume shared packages instead of owning reusable business logic directly

Objective:

Extract reusable business logic into shared packages.

Scope:

- finance-core
- shared-types
- shared-utils
- shared-api
- parser

Completion Criteria:

Business logic exists exactly once and is reusable across all applications.

Outcome:

The Finance Engine becomes platform independent.

---

### Phase 13.3 — Mobile Client Foundation

Status: ⏳ Current

Objective:

Create the React Native application.

Scope:

- React Native project
- TypeScript
- Navigation
- Authentication
- Shared API integration
- Shared type integration
- Shared Finance Engine integration

Completion Criteria:

The Mobile Client can authenticate and communicate with the same backend as the Web Client.

Outcome:

The Mobile Client becomes a first-class application within the platform.

---

### Phase 13.4 — Android Notification Listener

Status: Planned

Objective:

Automatically collect financial events from Android notifications.

Scope:

- Notification Listener Service
- Notification permission
- Native bridge
- Notification parser
- Parsed Financial Event generation

Completion Criteria:

Supported Android notifications are converted into Parsed Financial Events.

Notifications must never create Transactions directly.

Outcome:

Financial activity can be captured automatically without user input.

---

### Phase 13.5 — Offline Storage

Status: Planned

Objective:

Enable offline-first operation.

Scope:

- SQLite
- Local repositories
- Cached Financial Events
- Cached Transactions
- Local persistence
- Synchronization queue

Completion Criteria:

The Mobile Client remains fully usable without network connectivity.

Outcome:

Financial information is immediately available and safely persisted locally.

---

### Phase 13.6 — Synchronization

Status: Planned

Objective:

Synchronize local financial data with Supabase.

Scope:

- Queue processing
- Background synchronization
- Retry strategy
- Conflict handling
- Realtime updates
- Incremental synchronization

Completion Criteria:

Financial Events synchronize automatically without user intervention.

Outcome:

Multiple clients remain synchronized while supporting offline usage.

---

### Phase 13.7 — Mobile Experience

Status: Planned

Objective:

Provide feature parity between the Mobile Client and the Web Client.

Scope:

- Dashboard
- Financial Events
- Transactions
- Merchants
- Categories
- Budgets
- Reports
- Settings

Completion Criteria:

Users can perform day-to-day financial management entirely from the Mobile Client.

Outcome:

The Mobile Client becomes a complete native experience.

---

### Phase 13.8 — Production Release

Status: Planned

Objective:

Prepare the Mobile Client for public release.

Scope:

- Production configuration
- Release signing
- Performance optimization
- QA
- Play Store assets
- Release builds

Completion Criteria:

The Mobile Client is production ready.

Outcome:

The Personal Finance Platform is available on both Web and Android.

---

# Upcoming Milestones

## Phase 14 — Analytics

Status: Planned

Objective:

Generate deeper financial insights from confirmed transactions.

Scope:

- Spending trends
- Income trends
- Merchant analytics
- Category analytics
- Cash flow analysis
- Monthly comparisons
- Year-over-year comparisons

Completion Criteria:

Users gain meaningful insight into long-term financial behaviour.

Outcome:

The platform provides advanced financial analysis built entirely from confirmed Transactions.

---

## Phase 15 — Visualization

Status: Planned

Objective:

Present financial insights through interactive visualizations.

Scope:

- Monthly charts
- Category charts
- Merchant charts
- Income vs Expense
- Budget progress
- Spending trends
- Cash flow visualization

Charts consume analytics only.

Charts never calculate business logic.

Completion Criteria:

Users can understand financial information visually.

Outcome:

Financial insights become easier to interpret through reusable visualization components.

---

## Phase 16 — Financial Intelligence

Status: Planned

Objective:

Expand the deterministic Finance Engine with additional financial capabilities.

Scope:

- Multiple accounts
- Multi-currency support
- Asset tracking
- Liability tracking
- Loan management
- Investment tracking
- Goal tracking
- Net worth calculation

Completion Criteria:

The platform supports comprehensive personal financial management while preserving the existing deterministic architecture.

Outcome:

The Finance Engine evolves into a complete personal financial management platform.

---

# Future Expansion

The following capabilities are intentionally outside the current roadmap.

Possible future additions:

- Bank API integrations
- Email parsing
- OCR receipt processing
- Public API
- Webhooks
- Shared households
- Desktop application
- AI-assisted financial insights (optional)

These capabilities must integrate into the existing Financial Event pipeline and Finance Engine rather than introducing parallel workflows.

---

# Milestone Rules

Every milestone must satisfy the following conditions before moving to the next:

- Architecture remains consistent.
- TypeScript compiles successfully.
- Existing functionality continues to work.
- No duplicate implementations are introduced.
- Business logic remains inside the Finance Engine.
- Repositories remain persistence-focused.
- Services remain business-focused.
- Stores remain state-focused.
- Features remain presentation-focused.
- Shared packages remain platform independent.
- Documentation is updated when required.

A milestone is complete only when the repository remains deployable.

---

# Definition of Done

A milestone is considered complete when:

- Feature implementation is complete.
- Build succeeds.
- TypeScript compiles successfully.
- Existing functionality remains unaffected.
- No placeholder implementations remain.
- No duplicate logic exists.
- Documentation has been updated.
- `docs/roadmap.md` reflects the current project state.

---

# Long-Term Vision

Every financial input should follow the same deterministic lifecycle.

```
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

Analytics

↓

Financial Insight
```

Regardless of whether financial information originates from:

- Manual Entry
- Android Notifications
- CSV Imports
- Email Parsing
- Bank Integrations
- Future Sources

the Finance Engine must always process it through the same deterministic pipeline.

This single pipeline is the foundation of the Personal Finance Platform.
