-- Manual entry may pin the confirmed transaction's type via
-- metadata.transaction_type_override (currently only 'transfer' — a
-- transfer leg is neither income nor expense, so it must not derive
-- from the direction). Transfers also carry no category. Must stay in
-- lockstep with materializeTransactionLocally on the client.
create or replace function public.confirm_financial_event(
    p_event_id uuid,
    p_transaction_id uuid default null
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
    v_rule_category_id uuid;
    v_account_id uuid;
    v_transaction_type transaction_type;
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

    if v_event.metadata ? 'rule_category_id'
        and nullif(
            v_event.metadata ->> 'rule_category_id',
            ''
        ) is not null
    then
        v_rule_category_id =
            (v_event.metadata ->> 'rule_category_id')::uuid;
    end if;

    if v_event.metadata ? 'account_id'
        and nullif(
            v_event.metadata ->> 'account_id',
            ''
        ) is not null
    then
        select id
        into v_account_id
        from public.accounts
        where id = (v_event.metadata ->> 'account_id')::uuid
            and user_id = auth.uid();
    end if;

    if v_event.metadata ->> 'transaction_type_override' = 'transfer' then
        v_transaction_type = 'transfer'::transaction_type;
    elsif v_event.direction = 'debit' then
        v_transaction_type = 'expense'::transaction_type;
    else
        v_transaction_type = 'income'::transaction_type;
    end if;

    update public.financial_events
    set
        status = 'confirmed',
        updated_at = now()
    where id = p_event_id;

    insert into public.transactions (
        id,
        event_id,
        account_id,
        merchant_id,
        category_id,
        transaction_type,
        amount,
        currency,
        occurred_at,
        notes
    )
    values (
        coalesce(p_transaction_id, gen_random_uuid()),
        v_event.id,
        v_account_id,
        v_event.merchant_id,
        case
            when v_transaction_type = 'transfer' then null
            else coalesce(
                v_rule_category_id,
                v_merchant.category_id
            )
        end,
        v_transaction_type,
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
