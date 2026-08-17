-- Liability accounts (credit cards, BNPL) can carry a credit limit so
-- the UI can present available credit. Informational only — balance
-- math never reads it.
alter table accounts
add column credit_limit numeric(14,2);
