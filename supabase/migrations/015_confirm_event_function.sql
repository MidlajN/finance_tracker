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
begin
    select *
    into v_event
    from public.financial_events
    where id = p_event_id;

    if not found then
        raise exception 'Financial event not found.';
    end if;

    if v_event.status = 'confirmed' then
        raise exception 'Financial event already confirmed.';
    end if;

    update public.financial_events
    set
        status = 'confirmed',
        updated_at = now()
    where id = p_event_id;

    insert into public.transactions (
        event_id,
        merchant_id,
        transaction_type,
        amount,
        currency,
        occurred_at,
        notes
    )
    values (
        v_event.id,
        v_event.merchant_id,
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

    return v_transaction;
end;
$$;