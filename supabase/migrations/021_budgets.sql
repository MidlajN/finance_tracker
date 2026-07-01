create table budgets (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    category_id uuid not null
        references categories(id),

    month_start date not null,

    amount numeric(12,2) not null
        check (amount > 0),

    currency text not null default 'INR',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique(user_id, category_id, month_start)
);

create index idx_budgets_user
    on budgets(user_id);

create index idx_budgets_month
    on budgets(month_start);

create index idx_budgets_category
    on budgets(category_id);

alter table budgets enable row level security;

create policy "budgets_all"
on budgets
for all
using (
    user_id = auth.uid()
)
with check (
    user_id = auth.uid()
);

create trigger trg_budgets_updated_at
before update on budgets
for each row
execute function set_updated_at();
