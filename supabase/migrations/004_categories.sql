create table categories (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid
        references auth.users(id)
        on delete cascade,

    name text not null,

    icon text,

    color text,

    is_system boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique(user_id, name)
);