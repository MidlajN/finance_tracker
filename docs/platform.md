# Personal Finance Platform

> Version: 1.0
>
> This document defines the overall platform architecture of the Personal Finance Platform.
>
> Unlike `architecture.md`, which defines application architecture, this document defines how every application within the platform works together.
>
> Every new application, service and package must follow this document.

---

# Purpose

The Personal Finance Platform is designed as a multi-client ecosystem.

The finance engine is the center of the platform.

Different clients collect, present and synchronize financial information while sharing the same business rules and financial intelligence.

The platform must allow future expansion without requiring architectural redesign.

---

# Platform Vision

The platform transforms financial activity into structured financial knowledge.

Regardless of where financial information originates, every piece of data follows the same lifecycle until it becomes financial insight.

Future data sources include:

- Android Notifications
- Manual Entry
- CSV Import
- Email Parsing
- Bank APIs
- OCR Receipts
- Future Integrations

Every source ultimately produces the same internal Financial Event.

No source should create Transactions directly.

---

# Platform Overview

```
                        Users
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        │                  │                  │
   Web Client        Mobile Client      Future Clients
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    Finance Engine
                           │
                 Financial Intelligence
                           │
                       Supabase
```

The Finance Engine is the single source of financial truth.

Clients collect information.

The Finance Engine processes information.

---

# Platform Components

The platform consists of independent applications that communicate using shared contracts.

Current applications:

- Web Client

Planned applications:

- Mobile Client
- Desktop Client (future)

Future integrations:

- Bank API Connector
- Email Importer
- OCR Receipt Scanner
- Public API

Every application must consume the same finance engine.

---

# Core Principle

There is only one finance engine.

There are multiple clients.

Business logic must never be duplicated between clients.

Instead:

```
Clients

↓

Finance Engine

↓

Business Rules

↓

Financial Data
```

---

# Applications

## Web Client

Purpose:

Desktop-oriented financial management.

Responsibilities:

- Review financial events
- Manage merchants
- Manage categories
- Review transactions
- Dashboard
- Reports
- Administration
- Rule management
- Budgets

The web application is optimized for larger screens and detailed workflows.

---

## Mobile Client

Purpose:

Daily financial companion.

Responsibilities:

- Notification listener
- Offline storage
- Quick review
- Transaction history
- Dashboard
- Budgets
- Native capabilities
- Background synchronization

The mobile client is optimized for speed and mobility.

---

# Finance Engine

The Finance Engine is shared by every client.

It contains:

- Financial Event pipeline
- Merchant Intelligence
- Rule Engine
- Dashboard calculations
- Budget calculations
- Reports
- Financial analytics

The Finance Engine owns all financial business rules.

Clients should never implement financial intelligence independently.

---

# Platform Data Flow

Every financial input follows the same lifecycle.

```
Financial Source

↓

Financial Event

↓

Rule Engine

↓

Merchant Intelligence

↓

Pending Review

↓

Transaction

↓

Dashboard

↓

Analytics

↓

Reports
```

No client may bypass this flow.

---

# Source Independence

The origin of financial information should never affect how it is processed.

Examples:

Android Notification

↓

Financial Event

Manual Entry

↓

Financial Event

CSV Import

↓

Financial Event

Email Parsing

↓

Financial Event

After Financial Event creation, every workflow becomes identical.

---

# Shared Business Logic

Business logic belongs to the Finance Engine.

Examples:

- Merchant matching
- Category assignment
- Rule evaluation
- Dashboard calculations
- Budget calculations
- Recurring transaction detection
- Financial reports

Business logic must never be implemented independently by different clients.

---

# Client Responsibilities

Clients are responsible for:

- User interaction
- Native capabilities
- Authentication
- Synchronization
- Rendering
- Local state

Clients are NOT responsible for:

- Financial intelligence
- Financial calculations
- Rule evaluation
- Merchant learning
- Budget logic

---

# Platform Layers

Every application follows the same architecture.

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

Platform architecture should remain consistent across applications.

---

# Shared Packages

The platform uses shared packages for reusable logic.

Examples:

```
shared-types

finance-core

shared-utils

shared-api
```

Shared packages must not depend on platform-specific UI.

Shared packages should remain platform independent.

---

# Platform Communication

Applications communicate through shared contracts.

No application should communicate using undocumented payloads.

Every request and response must be defined in the API contract.

This ensures:

- Type safety
- Version compatibility
- Easier maintenance

---

# Authentication

Authentication is managed centrally.

Current provider:

- Supabase Authentication

Every client authenticates the same user identity.

Business logic should not depend on client type.

---

# Synchronization

Clients synchronize with the Finance Engine.

Synchronization should support:

- Offline operation
- Retry
- Conflict handling
- Background synchronization

Synchronization architecture is defined separately in:

```
docs/sync-architecture.md
```

---

# Notification Processing

Notifications are native platform events.

Notifications are never Transactions.

Notifications become:

```
Notification

↓

Parsed Financial Event

↓

Financial Event
```

Processing continues inside the Finance Engine.

Notification architecture is defined separately in:

```
docs/notification-pipeline.md
```

---

# Data Ownership

The Finance Engine owns all financial data.

Clients may cache data locally.

Local storage should never become the authoritative source.

Supabase remains the primary persistent data store.

---

# Offline First

The platform should continue functioning without network connectivity whenever practical.

Offline capabilities include:

- Viewing cached transactions
- Creating financial events
- Reviewing events
- Queueing synchronization

Synchronization occurs automatically when connectivity returns.

---

# Security

Security principles:

- Least privilege
- Secure authentication
- Row Level Security
- Ownership validation
- Encrypted communication
- No sensitive data in logs

Clients should only access data they own.

---

# Scalability

The platform should scale by adding clients rather than changing the Finance Engine.

Future clients should integrate using the existing architecture.

Examples:

```
Desktop

↓

Finance Engine
```

```
Email Importer

↓

Finance Engine
```

```
Bank API

↓

Finance Engine
```

The Finance Engine should not require architectural changes for new clients.

---

# Design Principles

The platform should remain:

- Deterministic
- Modular
- Extensible
- Maintainable
- Testable
- Type-safe
- Offline capable
- Platform independent

Prefer simple, explicit designs over complex abstractions.

---

# Platform Goals

Every financial input should eventually become meaningful financial knowledge.

The platform should:

- Collect financial activity.
- Normalize financial information.
- Apply deterministic financial intelligence.
- Present actionable financial insights.
- Remain extensible for future integrations.

---

# Relationship to Other Documents

This document defines the overall platform.

Related documents:

- `docs/architecture.md`
  - Application architecture.
  - Layer responsibilities.

- `docs/monorepo.md`
  - Repository organization.

- `docs/mobile-architecture.md`
  - Mobile application architecture.

- `docs/shared-packages.md`
  - Shared package responsibilities.

- `docs/notification-pipeline.md`
  - Notification processing lifecycle.

- `docs/sync-architecture.md`
  - Synchronization strategy.

- `docs/api-contract.md`
  - Communication contracts.

- `docs/database.md`
  - Database philosophy.

- `docs/development-workflow.md`
  - Development process.

Together, these documents define the complete architecture of the Personal Finance Platform.