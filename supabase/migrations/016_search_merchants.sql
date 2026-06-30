create or replace function search_merchants(
    p_query text,
    p_limit integer default 10
)
returns table (
    id uuid,
    user_id uuid,
    name text,
    normalized_name citext,
    category_id uuid,
    usage_count integer,
    last_seen_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language sql
security invoker
stable
as
$$
    select distinct
        m.id,
        m.user_id,
        m.name,
        m.normalized_name,
        m.category_id,
        m.usage_count,
        m.last_seen_at,
        m.created_at,
        m.updated_at
    from merchants m
    left join merchant_aliases a
        on a.merchant_id = m.id
    where
        auth.uid() = m.user_id
        and (
            m.name ilike '%' || p_query || '%'
            or
            a.alias ilike '%' || p_query || '%'
        )
    order by
        m.usage_count desc,
        m.name asc
    limit greatest(1, least(p_limit, 25));
$$;