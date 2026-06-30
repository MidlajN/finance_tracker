create table merchants (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    normalized_name citext not null,

    category_id uuid
        references categories(id),

    usage_count integer not null default 0,

    last_seen_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique(user_id, normalized_name)
);

create table merchant_aliases (

    id uuid primary key
        default gen_random_uuid(),

    merchant_id uuid not null
        references merchants(id)
        on delete cascade,

    alias citext not null,

    unique(merchant_id, alias)
);