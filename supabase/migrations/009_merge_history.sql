create table merge_history (

    id uuid primary key
        default gen_random_uuid(),

    source_event_id uuid not null
        references financial_events(id)
        on delete cascade,

    target_event_id uuid not null
        references financial_events(id)
        on delete cascade,

    created_at timestamptz not null default now()
);
