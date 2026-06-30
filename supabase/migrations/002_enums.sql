create type event_status as enum (
    'pending',
    'confirmed',
    'ignored',
    'merged'
);

create type source_type as enum (
    'notification',
    'sms',
    'clipboard',
    'share',
    'ocr',
    'manual'
);

create type event_direction as enum (
    'debit',
    'credit'
);

create type transaction_type as enum (
    'expense',
    'income',
    'transfer',
    'refund'
);