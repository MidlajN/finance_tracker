# Financial Intelligence

> Version: 1.0

This document defines the Financial Intelligence architecture of the Personal Finance Platform.

It extends the deterministic Finance Engine beyond Transactions into complete personal financial management while preserving the existing architecture.

The Finance Engine remains the only location where financial business rules exist.

The Mobile Client and Web Client consume the same Finance Engine.

---

# Purpose

The existing Finance Engine transforms Financial Events into confirmed Transactions.

Financial Intelligence builds upon confirmed Transactions to provide a complete financial picture including:

- Accounts
- Assets
- Liabilities
- Investments
- Goals
- Net Worth
- Multi-currency support

Financial Intelligence never bypasses the Transaction pipeline.

Everything ultimately derives from confirmed financial information.

---

# Design Principles

Financial Intelligence follows the same principles as the rest of the platform.

Business rules exist exactly once.

Derived values are never persisted when they can be deterministically regenerated.

Clients display data.

Finance Core performs calculations.

Synchronization moves data.

Repositories persist data.

Services execute business logic.

---

# Financial Hierarchy

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

Account

↓

Assets / Liabilities

↓

Goals

↓

Net Worth

↓

Analytics

↓

Visualization
```

Transactions remain the foundation.

Everything introduced in this document derives from Transactions or user-owned financial resources.

---

# Accounts

Accounts represent containers that hold balances.

Examples:

- Cash
- Savings
- Current Account
- Credit Card
- Wallet
- Investment Account
- Loan Account

Transactions belong to Accounts.

Accounts never own Transactions.

Transactions reference Accounts.

---

## Account Types

Supported account categories:

- Cash
- Bank
- Credit Card
- Investment
- Loan
- Digital Wallet
- Other

Future account types may be added without changing the Transaction architecture.

---

## Account Properties

Each Account contains:

- Identifier
- Display Name
- Account Type
- Currency
- Opening Balance
- Current Balance (derived)
- Institution
- Archived State

Balances are deterministic.

Current Balance is calculated.

It is never manually edited.

---

# Multi-Currency

Every Account belongs to exactly one Currency.

Transactions inherit the currency of their Account.

Cross-currency transfers create two Transactions connected by a Transfer relationship.

No Transaction stores multiple currencies.

---

## Currency Model

Currency contains:

- ISO 4217 Code
- Display Name
- Symbol
- Decimal Precision

Examples:

INR

USD

EUR

JPY

---

## Base Currency

Every user selects exactly one Base Currency.

Examples:

INR

USD

EUR

All reporting uses the Base Currency.

Original Transaction currencies remain unchanged.

---

## Exchange Rates

Exchange rates are reference data.

The Finance Engine never estimates exchange rates.

Rates originate from an external provider.

Historical rates are immutable.

Each conversion references the historical rate valid at the Transaction date.

---

# Assets

Assets represent owned value.

Examples:

- Property
- Vehicle
- Gold
- Cash
- Cryptocurrency
- Stocks
- Mutual Funds
- Fixed Deposits
- Bonds

Assets may or may not originate from Transactions.

---

## Asset Properties

Each Asset contains:

- Identifier
- Name
- Asset Type
- Currency
- Quantity
- Acquisition Value
- Current Valuation
- Acquisition Date
- Notes

---

## Asset Categories

Supported categories:

- Cash
- Bank Deposit
- Real Estate
- Vehicle
- Precious Metals
- Equity
- Mutual Fund
- ETF
- Cryptocurrency
- Bond
- Other

---

# Liabilities

Liabilities represent obligations.

Examples:

- Credit Card Balance
- Mortgage
- Vehicle Loan
- Education Loan
- Personal Loan

Liabilities reduce Net Worth.

---

## Liability Properties

Each Liability contains:

- Identifier
- Name
- Liability Type
- Currency
- Outstanding Balance
- Original Amount
- Interest Rate
- Start Date
- End Date

---

# Loans

Loans specialize Liabilities.

Loan types include:

- Mortgage
- Personal Loan
- Vehicle Loan
- Student Loan
- Business Loan

Additional information:

- Monthly Payment
- Remaining Payments
- Amortization Schedule
- Interest Accrued

Loan calculations belong inside Finance Core.

---

# Investments

Investments represent market-linked Assets.

Supported investments:

- Stocks
- ETFs
- Mutual Funds
- Bonds
- Cryptocurrency

Investments store positions.

Market value is derived.

---

## Investment Properties

Each Investment contains:

- Identifier
- Symbol
- Quantity
- Average Purchase Price
- Current Price
- Currency
- Exchange
- Purchase History

Current valuation is never manually edited.

It is calculated.

---

# Goals

Goals represent planned financial targets.

Examples:

- Emergency Fund
- Home Purchase
- Vacation
- Education
- Retirement

Goals never move money.

They measure progress.

---

## Goal Properties

Each Goal contains:

- Identifier
- Name
- Target Amount
- Current Progress
- Currency
- Target Date
- Status

Progress is calculated.

---

# Net Worth

Net Worth is always derived.

It is never stored.

```
Net Worth

=

Total Assets

−

Total Liabilities
```

Every calculation uses the user's Base Currency.

Currency conversion occurs before aggregation.

---

# Valuation Rules

Financial Intelligence separates historical cost from current valuation.

Historical values never change.

Current valuations may change.

Every valuation records:

- Timestamp
- Currency
- Source
- Value

Valuation history is append-only.

---

# Deterministic Calculations

Finance Core calculates:

- Current Account Balance
- Total Assets
- Total Liabilities
- Net Worth
- Investment Performance
- Goal Progress

No client calculates financial values independently.

---

# Architecture Principles

Financial Intelligence extends the existing Finance Engine.

It does not replace it.

Transactions remain immutable financial history.

Assets represent ownership.

Liabilities represent obligations.

Goals represent planning.

Net Worth represents derived financial state.

Every calculation must remain deterministic.

Business logic exists only inside Finance Core.

# Financial Intelligence (Part 2)

> Version: 1.0

This section defines ownership, synchronization, offline behavior and architectural responsibilities for Financial Intelligence.

All resources introduced in Financial Intelligence follow the same deterministic principles established by the Finance Engine.

---

# Resource Ownership

Financial Intelligence introduces several new resources.

Each resource has a single source of truth.

No resource may have multiple competing owners.

---

## Accounts

Owner:

Finance Engine

Purpose:

Represents financial containers that hold balances.

Examples:

- Bank Accounts
- Cash
- Wallets
- Credit Cards
- Investment Accounts
- Loan Accounts

Synchronization:

Bidirectional

Offline:

Supported

Mobile CRUD:

Full

Reason:

Users frequently create and edit accounts while offline.

---

## Currencies

Owner:

Finance Engine

Purpose:

Reference data.

Synchronization:

Pull only

Offline:

Cached

Mobile CRUD:

None

Reason:

Currencies are standardized reference data.

---

## Exchange Rates

Owner:

Finance Engine

Source:

External provider

Synchronization:

Pull only

Offline:

Cached

Mobile CRUD:

None

Exchange rates are immutable historical reference data.

---

## Assets

Owner:

Finance Engine

Synchronization:

Bidirectional

Offline:

Supported

Mobile CRUD:

Full

Assets created offline synchronize automatically.

---

## Liabilities

Owner:

Finance Engine

Synchronization:

Bidirectional

Offline:

Supported

Mobile CRUD:

Full

Outstanding balances remain derived from synchronized information.

---

## Loans

Owner:

Finance Engine

Synchronization:

Bidirectional

Offline:

Supported

Mobile CRUD:

Full

Loan schedules synchronize normally.

Interest calculations always occur inside Finance Core.

---

## Investments

Owner:

Finance Engine

Synchronization:

Bidirectional

Offline:

Supported

Mobile CRUD:

Full

Investment prices are external reference data.

Portfolio ownership belongs to the user.

---

## Goals

Owner:

Finance Engine

Synchronization:

Bidirectional

Offline:

Supported

Mobile CRUD:

Full

Goal progress is calculated locally using Finance Core.

---

## Net Worth

Owner:

Finance Core

Synchronization:

None

Offline:

Generated

Persistence:

None

Net Worth is always derived.

---

# Synchronization Rules

Financial Intelligence follows the same synchronization pipeline as Financial Events.

```
Mobile

↓

SQLite

↓

Synchronization Queue

↓

Supabase

↓

Realtime

↓

Local Cache
```

Business rules remain inside Finance Core.

Synchronization never performs calculations.

---

# Synchronization Queue

The queue may contain:

- Create Account
- Update Account
- Delete Account

- Create Asset
- Update Asset
- Delete Asset

- Create Liability
- Update Liability
- Delete Liability

- Create Loan
- Update Loan
- Delete Loan

- Create Investment
- Update Investment
- Delete Investment

- Create Goal
- Update Goal
- Delete Goal

Reference data never enters the synchronization queue.

---

# Offline Behaviour

The Mobile Client supports offline operation.

Supported offline:

- Create Accounts
- Edit Accounts
- Create Assets
- Edit Assets
- Create Liabilities
- Edit Liabilities
- Create Goals
- Update Goals
- View Investments
- View Analytics
- View Reports
- View Net Worth

Requires network:

- Exchange Rate Updates
- Market Prices
- Remote Synchronization

---

# Conflict Resolution

Financial resources use deterministic conflict resolution.

---

## Accounts

Last write wins.

---

## Assets

Client changes merge.

Server validates.

---

## Liabilities

Client changes merge.

Server validates.

---

## Loans

Server validates payment schedules.

Client edits synchronize.

---

## Investments

Portfolio ownership:

Client

Market prices:

Server

Valuation:

Finance Core

---

## Goals

Last write wins.

Progress recalculates automatically.

---

## Exchange Rates

Server wins.

Clients never modify exchange rates.

---

## Derived Resources

Always regenerated.

Never synchronized.

Includes:

- Net Worth
- Analytics
- Reports
- Dashboard
- Charts
- Budget Progress

---

# Repository Responsibilities

Repositories remain persistence-only.

Repositories never calculate.

Repositories never perform synchronization.

Repositories expose CRUD operations.

Examples:

AccountRepository

AssetRepository

InvestmentRepository

LoanRepository

GoalRepository

---

# Services

Services execute business workflows.

Examples:

AccountService

AssetService

InvestmentService

LoanService

GoalService

Services coordinate:

Repositories

↓

Finance Core

↓

Synchronization

↓

Stores

Services never contain UI code.

---

# Stores

Stores expose application state.

Stores never calculate financial values.

Stores never communicate directly with databases.

Stores consume Services.

---

# Finance Core Responsibilities

Finance Core performs:

Account Balance Calculation

↓

Currency Conversion

↓

Net Worth

↓

Goal Progress

↓

Portfolio Performance

↓

Loan Amortization

↓

Analytics

↓

Dashboard

↓

Reports

Finance Core owns every deterministic calculation.

---

# Analytics Integration

Analytics consume:

Transactions

Accounts

Assets

Liabilities

Goals

Investments

Analytics never modify financial resources.

---

# Visualization Integration

Charts consume Analytics.

Charts never access repositories directly.

Charts never calculate business logic.

---

# Report Integration

Reports consume:

Finance Core

Analytics

Budget Engine

Reports are generated.

Reports are never synchronized.

---

# Notification Pipeline

Android notifications continue producing:

Financial Events

↓

Rules

↓

Transactions

↓

Accounts

Financial Intelligence never bypasses this pipeline.

---

# Future Expansion

Financial Intelligence is designed for extension.

Future resources include:

- Insurance
- Tax Tracking
- Pension Accounts
- Business Accounts
- Shared Accounts
- Trust Funds
- Estate Planning

New resources must follow the same ownership model.

---

# Architecture Rules

Financial Intelligence follows the existing architecture.

```
Repositories

↓

Services

↓

Stores

↓

Features

↓

Shared Components
```

Business logic exists only inside Finance Core.

Repositories persist.

Services coordinate.

Stores expose state.

Features render UI.

Shared Components remain presentation only.

No layer may bypass another.

---

# Definition of Done

A Financial Intelligence milestone is complete when:

- All new resources follow documented ownership.
- Offline synchronization functions correctly.
- Finance Core performs all calculations.
- No business logic exists in UI.
- Analytics consume Finance Core.
- Reports remain generated.
- Synchronization remains deterministic.
- TypeScript passes.
- Lint passes.
- Build passes.
- Android build passes.
- Documentation reflects implementation.

---

# Long-Term Vision

Financial Intelligence extends the deterministic Finance Engine without introducing parallel workflows.

Every financial resource ultimately contributes to a single financial model.

```
Financial Source

↓

Financial Event

↓

Rule Engine

↓

Transaction

↓

Accounts

↓

Assets / Liabilities

↓

Goals

↓

Net Worth

↓

Analytics

↓

Visualization

↓

Reports
```

Regardless of whether information originates from:

- Manual Entry
- Android Notifications
- CSV Import
- Email Parsing
- Bank Integrations
- Future Sources

all financial information must converge into the same deterministic Finance Engine.

This unified model remains the foundation of the Personal Finance Platform.