create table currencies (

    code text primary key,

    name text not null,

    symbol text not null,

    decimal_precision integer not null
        check (decimal_precision >= 0)
);

insert into currencies (code, name, symbol, decimal_precision)
values
    ('INR', 'Indian Rupee', '₹', 2),
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('JPY', 'Japanese Yen', '¥', 0)
on conflict (code) do nothing;

create table exchange_rates (

    id uuid primary key
        default gen_random_uuid(),

    base_currency text not null
        references currencies(code),

    quote_currency text not null
        references currencies(code),

    rate numeric(18,8) not null
        check (rate > 0),

    valid_on date not null,

    source text not null,

    created_at timestamptz not null default now(),

    unique(base_currency, quote_currency, valid_on)
);

create index idx_exchange_rates_pair_date
    on exchange_rates(base_currency, quote_currency, valid_on desc);

create table accounts (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    account_type text not null
        check (
            account_type in (
                'cash',
                'bank',
                'credit_card',
                'investment',
                'loan',
                'digital_wallet',
                'other'
            )
        ),

    currency text not null
        references currencies(code),

    opening_balance numeric(14,2) not null default 0,

    institution text,

    archived boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

alter table transactions
add column account_id uuid
    references accounts(id)
    on delete set null;

create table assets (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    asset_type text not null
        check (
            asset_type in (
                'cash',
                'bank_deposit',
                'real_estate',
                'vehicle',
                'precious_metals',
                'equity',
                'mutual_fund',
                'etf',
                'cryptocurrency',
                'bond',
                'other'
            )
        ),

    currency text not null
        references currencies(code),

    quantity numeric(18,6) not null default 1
        check (quantity >= 0),

    acquisition_value numeric(14,2) not null
        check (acquisition_value >= 0),

    current_valuation numeric(14,2) not null
        check (current_valuation >= 0),

    acquisition_date date not null,

    notes text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create table liabilities (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    liability_type text not null
        check (
            liability_type in (
                'credit_card',
                'mortgage',
                'vehicle_loan',
                'education_loan',
                'personal_loan',
                'other'
            )
        ),

    currency text not null
        references currencies(code),

    outstanding_balance numeric(14,2) not null
        check (outstanding_balance >= 0),

    original_amount numeric(14,2) not null
        check (original_amount >= 0),

    interest_rate numeric(8,4) not null default 0
        check (interest_rate >= 0),

    start_date date not null,

    end_date date,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create table loans (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    liability_id uuid not null
        references liabilities(id)
        on delete cascade,

    loan_type text not null
        check (
            loan_type in (
                'mortgage',
                'personal_loan',
                'vehicle_loan',
                'student_loan',
                'business_loan'
            )
        ),

    monthly_payment numeric(14,2) not null
        check (monthly_payment >= 0),

    remaining_payments integer not null
        check (remaining_payments >= 0),

    interest_accrued numeric(14,2) not null default 0
        check (interest_accrued >= 0),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique(liability_id)
);

create table investments (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    symbol text not null,

    quantity numeric(18,6) not null
        check (quantity >= 0),

    average_purchase_price numeric(14,4) not null
        check (average_purchase_price >= 0),

    current_price numeric(14,4)
        check (current_price is null or current_price >= 0),

    currency text not null
        references currencies(code),

    exchange text,

    purchase_history jsonb not null default '[]'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create table goals (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    target_amount numeric(14,2) not null
        check (target_amount > 0),

    currency text not null
        references currencies(code),

    target_date date,

    status text not null default 'active'
        check (
            status in (
                'active',
                'completed',
                'archived'
            )
        ),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create table valuations (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    resource_type text not null
        check (
            resource_type in (
                'asset',
                'investment',
                'liability'
            )
        ),

    resource_id uuid not null,

    valued_at timestamptz not null,

    currency text not null
        references currencies(code),

    source text not null,

    value numeric(14,2) not null
        check (value >= 0),

    created_at timestamptz not null default now()
);

create index idx_accounts_user
    on accounts(user_id);

create index idx_accounts_currency
    on accounts(currency);

create index idx_assets_user
    on assets(user_id);

create index idx_assets_currency
    on assets(currency);

create index idx_liabilities_user
    on liabilities(user_id);

create index idx_loans_user
    on loans(user_id);

create index idx_investments_user
    on investments(user_id);

create index idx_goals_user
    on goals(user_id);

create index idx_valuations_resource
    on valuations(resource_type, resource_id, valued_at desc);

create index idx_transactions_account
    on transactions(account_id);

alter table currencies enable row level security;
alter table exchange_rates enable row level security;
alter table accounts enable row level security;
alter table assets enable row level security;
alter table liabilities enable row level security;
alter table loans enable row level security;
alter table investments enable row level security;
alter table goals enable row level security;
alter table valuations enable row level security;

create policy "currencies_select"
on currencies
for select
using (true);

create policy "exchange_rates_select"
on exchange_rates
for select
using (true);

create policy "accounts_all"
on accounts
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "assets_all"
on assets
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "liabilities_all"
on liabilities
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "loans_all"
on loans
for all
using (user_id = auth.uid())
with check (
    user_id = auth.uid()
    and exists (
        select 1
        from liabilities
        where liabilities.id = loans.liability_id
        and liabilities.user_id = auth.uid()
    )
);

create policy "investments_all"
on investments
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "goals_all"
on goals
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "valuations_all"
on valuations
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create trigger trg_accounts_updated_at
before update on accounts
for each row
execute function set_updated_at();

create trigger trg_assets_updated_at
before update on assets
for each row
execute function set_updated_at();

create trigger trg_liabilities_updated_at
before update on liabilities
for each row
execute function set_updated_at();

create trigger trg_loans_updated_at
before update on loans
for each row
execute function set_updated_at();

create trigger trg_investments_updated_at
before update on investments
for each row
execute function set_updated_at();

create trigger trg_goals_updated_at
before update on goals
for each row
execute function set_updated_at();
