create table financial_events (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    merchant_id uuid
        references merchants(id),

    merchant_name_raw text,

    status event_status not null default 'pending',

    direction event_direction not null,

    amount numeric(12,2) not null,

    currency text not null default 'INR',

    occurred_at timestamptz not null,

    confidence real not null default 0,

    notes text,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);