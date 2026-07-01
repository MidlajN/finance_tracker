create or replace function public.confirm_financial_event(
    p_event_id uuid
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as
$$
declare
    v_event public.financial_events;
    v_transaction public.transactions;
    v_merchant public.merchants;
begin
    select *
    into v_event
    from public.financial_events
    where id = p_event_id;

    if not found then
        raise exception 'Financial event not found.';
    end if;

    if v_event.user_id <> auth.uid() then
        raise exception 'Access denied.';
    end if;

    if v_event.status = 'confirmed' then
        raise exception 'Financial event already confirmed.';
    end if;

    if v_event.merchant_id is not null then
        select *
        into v_merchant
        from public.merchants
        where id = v_event.merchant_id;
    end if;

    update public.financial_events
    set
        status = 'confirmed',
        updated_at = now()
    where id = p_event_id;

    insert into public.transactions (
        event_id,
        merchant_id,
        category_id,
        transaction_type,
        amount,
        currency,
        occurred_at,
        notes
    )
    values (
        v_event.id,
        v_event.merchant_id,
        v_merchant.category_id,
        case
            when v_event.direction = 'debit'
                then 'expense'::transaction_type
            else 'income'::transaction_type
        end,
        v_event.amount,
        v_event.currency,
        v_event.occurred_at,
        v_event.notes
    )
    returning *
    into v_transaction;

    if v_event.merchant_id is not null then
        update public.merchants
        set
            usage_count = usage_count + 1,
            last_seen_at = now(),
            updated_at = now()
        where id = v_event.merchant_id;
    end if;

    return v_transaction;
end;
$$;