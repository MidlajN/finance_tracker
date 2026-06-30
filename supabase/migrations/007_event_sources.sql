create table event_sources (

    id uuid primary key
        default gen_random_uuid(),

    event_id uuid not null
        references financial_events(id)
        on delete cascade,

    source_type source_type not null,

    source_application text,

    parser_version text,

    confidence real not null default 0,

    received_at timestamptz not null default now(),

    payload jsonb not null,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);