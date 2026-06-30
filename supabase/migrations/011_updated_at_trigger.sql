create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on profiles
for each row
execute function set_updated_at();

create trigger trg_categories_updated_at
before update on categories
for each row
execute function set_updated_at();

create trigger trg_merchants_updated_at
before update on merchants
for each row
execute function set_updated_at();

create trigger trg_financial_events_updated_at
before update on financial_events
for each row
execute function set_updated_at();

create trigger trg_transactions_updated_at
before update on transactions
for each row
execute function set_updated_at();