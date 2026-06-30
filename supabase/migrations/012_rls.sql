alter table profiles enable row level security;
alter table categories enable row level security;
alter table merchants enable row level security;
alter table merchant_aliases enable row level security;
alter table financial_events enable row level security;
alter table event_sources enable row level security;
alter table transactions enable row level security;
alter table merge_history enable row level security;


create policy "profiles_select"
on profiles
for select
using (id = auth.uid());

create policy "profiles_insert"
on profiles
for insert
with check (id = auth.uid());

create policy "profiles_update"
on profiles
for update
using (id = auth.uid());


create policy "categories_all"
on categories
for all
using (
    user_id = auth.uid()
    or user_id is null
)
with check (
    user_id = auth.uid()
);


create policy "merchants_all"
on merchants
for all
using (
    user_id = auth.uid()
)
with check (
    user_id = auth.uid()
);


create policy "aliases_all"
on merchant_aliases
for all
using (
    exists (
        select 1
        from merchants
        where merchants.id = merchant_aliases.merchant_id
        and merchants.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from merchants
        where merchants.id = merchant_aliases.merchant_id
        and merchants.user_id = auth.uid()
    )
);


create policy "events_all"
on financial_events
for all
using (
    user_id = auth.uid()
)
with check (
    user_id = auth.uid()
);


create policy "sources_all"
on event_sources
for all
using (
    exists (
        select 1
        from financial_events
        where financial_events.id = event_sources.event_id
        and financial_events.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from financial_events
        where financial_events.id = event_sources.event_id
        and financial_events.user_id = auth.uid()
    )
);


create policy "transactions_all"
on transactions
for all
using (
    exists (
        select 1
        from financial_events
        where financial_events.id = transactions.event_id
        and financial_events.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from financial_events
        where financial_events.id = transactions.event_id
        and financial_events.user_id = auth.uid()
    )
);


create policy "merge_history_all"
on merge_history
for all
using (
    exists (
        select 1
        from financial_events
        where financial_events.id = merge_history.target_event_id
        and financial_events.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from financial_events
        where financial_events.id = merge_history.target_event_id
        and financial_events.user_id = auth.uid()
    )
);