# Database Architecture

> Version: 1.0
>
> This document defines the database philosophy of the Personal Finance Platform.
>
> It does **not** define SQL migrations.
>
> It defines the purpose, ownership and relationships of the platform's persistent data.

---

# Purpose

The database is the permanent source of financial truth.

Its responsibilities are:

- Persist financial information
- Maintain relationships
- Preserve history
- Enforce ownership
- Support synchronization
- Support financial intelligence

The database should never contain presentation logic.

Business logic should remain inside the Finance Engine whenever practical.

---

# Design Principles

The database should always be:

- Normalized
- Deterministic
- Auditable
- Secure
- Extensible
- User scoped

Every table should have a single responsibility.

---

# Source of Truth

The authoritative source of truth is:

```
Supabase PostgreSQL
```

Local SQLite databases are caches.

Clients may rebuild local state from the server at any time.

---

# Database Layers

```
Applications

↓

Repositories

↓

Supabase

↓

PostgreSQL
```

Applications never communicate directly with PostgreSQL.

Repositories own persistence.

---

# Ownership

Every user owns their own financial data.

Examples:

- Financial Events
- Transactions
- Merchants
- Categories
- Budgets
- Rules
- Reports

Ownership is enforced through Row Level Security.

No application should bypass ownership validation.

---

# Core Entities

The platform revolves around a small number of core entities.

```
User

↓

Financial Events

↓

Transactions

↓

Financial Insights
```

Everything else supports this lifecycle.

---

# User

Purpose:

Represents an authenticated platform user.

Managed by:

Supabase Authentication

The application should never duplicate authentication information.

---

# Financial Events

Purpose:

Represents pending financial activity.

Examples:

- Notification
- Manual entry
- CSV import
- Email import

Financial Events are temporary.

Financial Events become Transactions after confirmation.

---

# Transactions

Purpose:

Represents permanent financial records.

Transactions power:

- Dashboard
- Reports
- Budgets
- Analytics
- Recurring Detection

Transactions should remain immutable where possible.

Edits should preserve history.

---

# Merchants

Purpose:

Represents normalized merchant identities.

Responsibilities:

- Canonical naming
- Merchant aliases
- Default category
- Usage statistics

Merchants improve over time through Merchant Intelligence.

---

# Merchant Aliases

Purpose:

Map multiple merchant representations to one canonical merchant.

Example:

```
AMZN

Amazon

Amazon Pay

↓

Amazon
```

Aliases improve automatic recognition.

---

# Categories

Purpose:

Describe financial behavior.

Examples:

- Shopping
- Food
- Travel
- Salary
- Utilities

Categories remain user configurable.

---

# Rules

Purpose:

Deterministic financial automation.

Rules may:

- Assign merchants
- Assign categories
- Auto-confirm events

Rules should never modify historical transactions.

Rules operate before user review.

---

# Budgets

Purpose:

Track planned spending.

Budgets are typically:

- Monthly
- Category based

Budgets consume Transactions.

They never consume Financial Events.

---

# Reports

Purpose:

Provide historical financial summaries.

Reports should be generated from Transactions.

Reports should never become the source of truth.

---

# Recurring Transactions

Purpose:

Describe detected recurring financial activity.

Examples:

- Salary
- Rent
- Subscriptions
- Insurance

Recurring information is derived.

It should never replace Transaction history.

---

# Synchronization Metadata

Purpose:

Track synchronization state.

Examples:

- Device identifiers
- Queue identifiers
- Synchronization timestamps
- Conflict markers

Synchronization metadata supports infrastructure.

It is not financial data.

---

# Relationships

High level relationship overview:

```
User

├── Financial Events

├── Transactions

├── Merchants

├── Categories

├── Rules

├── Budgets

└── Reports
```

Transactions relate to:

```
Merchant

Category

Financial Event
```

Financial Events may relate to:

```
Merchant

Notification Source

Imported Source
```

---

# Historical Data

Financial history should be preserved.

Avoid destructive updates whenever practical.

Prefer:

- timestamps
- status transitions
- audit information

Historical integrity is more valuable than convenience.

---

# Status Based Workflow

Financial entities should move through states.

Example:

```
Notification

↓

Financial Event

↓

Pending

↓

Confirmed

↓

Transaction
```

Avoid deleting historical records unnecessarily.

Prefer explicit status transitions.

---

# Data Integrity

The database should enforce:

- Referential integrity
- Required relationships
- Unique constraints
- Ownership
- Validation

Application code should not rely solely on client-side validation.

---

# Row Level Security

Every user should only access their own financial information.

All user-owned tables should enforce:

- SELECT
- INSERT
- UPDATE
- DELETE

through Row Level Security policies.

No client should rely on hidden UI for security.

---

# Generated Types

Application models should come from generated Supabase types.

Never manually duplicate database models.

Type generation should remain part of the development workflow.

---

# Migrations

Schema changes should always be introduced through migrations.

Never modify production schema manually.

Migration principles:

- Forward only
- Version controlled
- Repeatable
- Reviewed

Each migration should represent one logical change.

---

# Naming Conventions

Tables:

Plural nouns.

Examples:

```
transactions

financial_events

merchants

budgets
```

Primary Keys:

```
id
```

Foreign Keys:

```
merchant_id

category_id

event_id

user_id
```

Timestamps:

```
created_at

updated_at
```

Status fields should use explicit enums whenever practical.

---

# Soft vs Hard Deletes

Historical financial information should rarely be deleted.

Prefer:

- status
- archived
- ignored

over destructive deletion.

Hard deletes should be reserved for:

- user requested deletion
- cascading cleanup
- orphan removal

---

# Performance

Database performance should prioritize:

- Indexed lookups
- Efficient joins
- Deterministic queries
- Minimal duplicated data

Avoid premature denormalization.

Optimize only when justified by measurable performance needs.

---

# Future Expansion

The schema should naturally support:

- Multiple accounts
- Shared households
- Investment tracking
- Loans
- Assets
- Bank integrations
- Multi-currency
- Attachments
- OCR receipts

New entities should integrate into the existing model rather than creating parallel structures.

---

# Database Goals

The database should remain:

- Consistent
- Auditable
- Secure
- Extensible
- Predictable
- Easy to migrate
- Easy to query

It should serve as a stable foundation for every current and future client.

---

# Relationship to Other Documents

This document defines database philosophy.

Related documents:

- `platform.md`
- `architecture.md`
- `monorepo.md`
- `shared-packages.md`
- `notification-pipeline.md`
- `sync-architecture.md`
- `api-contract.md`
- `development-workflow.md`

Together these documents define how persistent financial information is modeled, owned and evolved across the Personal Finance Platform.