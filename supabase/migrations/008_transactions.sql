create table transactions (

    id uuid primary key
        default gen_random_uuid(),

    event_id uuid not null unique
        references financial_events(id)
        on delete cascade,

    merchant_id uuid
        references merchants(id),

    category_id uuid
        references categories(id),

    transaction_type transaction_type not null,

    amount numeric(12,2) not null,

    currency text not null default 'INR',

    occurred_at timestamptz not null,

    notes text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);