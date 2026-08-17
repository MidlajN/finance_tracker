-- Classification now mirrors the accounting engine's
-- deriveTransactionType (finance-core): the parser records observed
-- intent (metadata.intent: 'refund' | 'liability_payment'), and the
-- type derives from direction + matched account class + intent.
--   credit + refund intent            -> refund
--   credit into a liability account   -> transfer (card bill payment)
--   debit + liability_payment intent
--     from a non-liability account    -> transfer (paying leg)
--   otherwise                         -> expense / income by direction
-- Manual transaction_type_override still wins. Must stay in lockstep
-- with materializeTransactionLocally on the client.
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
    v_account_type text;
    v_account_is_liability boolean;
    v_intent text;
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
        select id, account_type
        into v_account_id, v_account_type
        from public.accounts
        where id = (v_event.metadata ->> 'account_id')::uuid
            and user_id = auth.uid();
    end if;

    -- Liability classes; must match finance-core getAccountClass.
    -- coalesce keeps the unmatched-account case (null) behaving like
    -- the engine's null account class.
    v_account_is_liability = coalesce(
        v_account_type in ('credit_card', 'loan', 'bnpl'),
        false
    );
    v_intent = v_event.metadata ->> 'intent';

    if v_event.metadata ->> 'transaction_type_override' = 'transfer' then
        v_transaction_type = 'transfer'::transaction_type;
    elsif v_event.direction = 'credit' then
        if v_intent = 'refund' then
            v_transaction_type = 'refund'::transaction_type;
        elsif v_account_is_liability then
            v_transaction_type = 'transfer'::transaction_type;
        else
            v_transaction_type = 'income'::transaction_type;
        end if;
    else
        if v_intent = 'liability_payment'
            and not v_account_is_liability
        then
            v_transaction_type = 'transfer'::transaction_type;
        else
            v_transaction_type = 'expense'::transaction_type;
        end if;
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
