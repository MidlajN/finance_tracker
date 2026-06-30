create table profiles (

    id uuid primary key
        references auth.users(id)
        on delete cascade,

    full_name text,

    avatar_url text,

    currency text not null default 'INR',

    timezone text not null default 'Asia/Kolkata',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);