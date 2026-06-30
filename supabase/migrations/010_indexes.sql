-- Profiles
create index idx_profiles_currency
    on profiles(currency);

-- Categories
create index idx_categories_user
    on categories(user_id);

-- Merchants
create index idx_merchants_user
    on merchants(user_id);

create index idx_merchants_category
    on merchants(category_id);

create index idx_merchants_normalized
    on merchants(normalized_name);

-- Merchant aliases
create index idx_aliases_merchant
    on merchant_aliases(merchant_id);

create index idx_aliases_alias
    on merchant_aliases(alias);

-- Financial events
create index idx_events_user
    on financial_events(user_id);

create index idx_events_status
    on financial_events(status);

create index idx_events_occurred
    on financial_events(occurred_at desc);

create index idx_events_merchant
    on financial_events(merchant_id);

-- Event sources
create index idx_sources_event
    on event_sources(event_id);

create index idx_sources_type
    on event_sources(source_type);

-- Transactions
create index idx_transactions_event
    on transactions(event_id);

create index idx_transactions_category
    on transactions(category_id);

create index idx_transactions_merchant
    on transactions(merchant_id);

create index idx_transactions_occurred
    on transactions(occurred_at desc);

-- Merge history
create index idx_merge_source
    on merge_history(source_event_id);

create index idx_merge_target
    on merge_history(target_event_id);