# Shared Packages Architecture

> Version: 1.0
>
> This document defines every shared package within the Personal Finance Platform.
>
> The purpose of shared packages is to ensure business logic, contracts and utilities exist exactly once and are reused by every application.
>
> Applications should share business logic—not UI.

---

# Purpose

The platform consists of multiple applications:

- Web
- Mobile
- Future Desktop
- Future CLI tools
- Future Importers

These applications should never duplicate financial logic.

Instead, all reusable logic lives inside shared packages.

```
Applications

↓

Shared Packages

↓

Supabase
```

---

# Design Principles

Shared packages must satisfy the following principles:

- Platform independent
- UI independent
- Framework independent whenever possible
- Type-safe
- Deterministic
- Testable
- Reusable

Shared packages should never depend on application-specific code.

---

# Package Overview

```
packages/

finance-core/

shared-types/

shared-api/

shared-utils/

parser/
```

Every package has a single responsibility.

Current status:

- `finance-core` contains deterministic financial calculations and rule evaluation.
- `shared-types` contains cross-client financial contracts.
- `shared-api` contains API and synchronization contracts.
- `shared-utils` contains pure formatting, normalization and date helpers.
- `parser` contains CSV financial event parsing and import/export serialization helpers.

---

# finance-core

## Purpose

Contains the business engine of the platform.

This package owns financial intelligence.

No application should implement financial rules independently.

---

## Responsibilities

The Finance Core owns:

- Rule Engine
- Merchant Intelligence
- Budget calculations
- Dashboard calculations
- Reports
- Recurring transaction detection
- Financial summaries
- Financial validation
- Event enrichment

Everything that determines how financial data behaves belongs here.

---

## Examples

```
finance-core/

rules/

merchant/

dashboard/

budgets/

reports/

analytics/

recurring/

events/
```

Applications consume these modules.

They never duplicate them.

---

## Forbidden

The Finance Core must never contain:

- React
- React Native
- Zustand
- UI Components
- Navigation
- Platform APIs

---

# shared-types

## Purpose

Provides every shared TypeScript model.

Every application uses these types.

---

## Responsibilities

Contains:

- FinancialEvent
- Transaction
- Merchant
- Category
- Budget
- Rule
- Dashboard
- Reports
- Notification models
- API DTOs

---

## Rules

Applications should never redefine shared models.

If multiple applications require the same type:

Move it here.

---

# shared-api

## Purpose

Defines communication contracts.

Applications should communicate using documented models.

---

## Responsibilities

Contains:

- API client
- Endpoint definitions
- Request models
- Response models
- Validation
- Authentication helpers

---

## Example

```
shared-api/

events/

transactions/

budgets/

reports/

auth/
```

---

## Rules

Endpoints belong here.

Business logic does not.

---

# shared-utils

## Purpose

Contains reusable utility functions.

Utilities should be pure.

---

## Examples

Formatting

```
formatCurrency()

formatDate()

formatPercentage()
```

Normalization

```
normalizeMerchant()

normalizeCurrency()

normalizePhone()
```

Validation

```
isValidAmount()

isValidCurrency()

isFutureDate()
```

---

## Rules

Utilities should:

- Have no side effects.
- Never access databases.
- Never call APIs.
- Never depend on React.

---

# parser

## Purpose

Normalizes external financial inputs.

Every external source should eventually produce the same Parsed Financial Event.

---

## Supported Sources

Notification

CSV

Email

Future Bank APIs

OCR

---

## Parser Flow

```
Raw Source

↓

Parser

↓

Parsed Financial Event
```

After parsing, every workflow becomes identical.

---

## Parser Rules

Parsers should:

- Extract structured information.
- Never create transactions.
- Never evaluate rules.
- Never assign categories.
- Never communicate with Supabase.

Parsers only normalize data.

---

# Package Dependencies

Allowed

```
finance-core

↓

shared-types

↓

shared-utils
```

Allowed

```
shared-api

↓

shared-types
```

Allowed

```
parser

↓

shared-types
```

---

Forbidden

```
finance-core

↓

React
```

Forbidden

```
shared-utils

↓

finance-core
```

Forbidden

```
parser

↓

finance-core
```

Dependencies should always point toward more generic code.

---

# Ownership

Each package owns one responsibility.

finance-core

Owns business rules.

shared-types

Owns contracts.

shared-api

Owns communication.

shared-utils

Owns utilities.

parser

Owns normalization.

Responsibilities should never overlap.

---

# Versioning

Packages evolve independently.

Breaking changes should be minimized.

Shared contracts should remain stable.

Applications should migrate deliberately.

---

# Testing

Business logic should be tested inside packages.

Applications should focus on integration.

Example

```
finance-core

↓

Rule Engine Tests
```

instead of

```
apps/web

↓

Rule Engine Tests
```

This avoids duplicated testing.

---

# Extraction Policy

Before creating code inside an application ask:

Can this be reused by another application?

If yes:

Move it into a shared package.

Examples:

Correct

```
Rule Engine

↓

finance-core
```

Correct

```
Merchant Matcher

↓

finance-core
```

Correct

```
Parsed Financial Event

↓

shared-types
```

Incorrect

```
apps/mobile/

Rule Engine
```

Incorrect

```
apps/web/

Budget Calculator
```

---

# UI Policy

UI should never exist inside shared packages.

Do not place:

- React Components
- React Native Components
- Pages
- Navigation
- Dialogs
- Screens

inside packages.

Applications own presentation.

Packages own logic.

---

# Financial Pipeline Ownership

The Finance Core owns the deterministic pipeline.

```
Financial Event

↓

Rule Engine

↓

Merchant Intelligence

↓

Transaction

↓

Dashboard

↓

Analytics
```

Applications invoke the pipeline.

They never implement it.

---

# Future Expansion

Future packages may include:

```
sync/

notifications/

bank-connectors/

machine-learning/

testing/
```

New packages should only be introduced when a responsibility cannot naturally belong to an existing package.

Avoid creating narrowly scoped packages.

---

# Design Goals

The shared package ecosystem should remain:

- Modular
- Deterministic
- Reusable
- Framework independent
- Platform independent
- Type-safe
- Easy to test
- Easy to extend

---

# Relationship to Other Documents

This document defines shared code ownership.

Related documents:

- `platform.md`
- `architecture.md`
- `monorepo.md`
- `mobile-architecture.md`
- `notification-pipeline.md`
- `sync-architecture.md`
- `api-contract.md`

Together these documents ensure every application shares one financial engine instead of implementing multiple independent versions.
