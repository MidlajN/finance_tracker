create table financial_rules (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    priority integer not null default 100,

    enabled boolean not null default true,

    match_operator text not null
        check (
            match_operator in (
                'equals',
                'contains',
                'starts_with',
                'ends_with',
                'regex'
            )
        ),

    match_value text not null,

    merchant_id uuid
        references merchants(id),

    category_id uuid
        references categories(id),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    check (
        merchant_id is not null
        or category_id is not null
    )
);

create index idx_financial_rules_user
    on financial_rules(user_id);

create index idx_financial_rules_enabled_priority
    on financial_rules(user_id, enabled, priority);

alter table financial_rules enable row level security;

create policy "financial_rules_all"
on financial_rules
for all
using (
    user_id = auth.uid()
)
with check (
    user_id = auth.uid()
);

create trigger trg_financial_rules_updated_at
before update on financial_rules
for each row
execute function set_updated_at();
