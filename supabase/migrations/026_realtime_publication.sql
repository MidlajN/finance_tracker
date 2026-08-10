-- The mobile app subscribes to postgres_changes on these tables
-- (SyncService.subscribeToRemoteChanges) to trigger a re-sync when
-- another device or the web app writes. Delivery only happens for
-- tables in the supabase_realtime publication — without this the
-- subscription connects and silently receives nothing.
--
-- Guarded per table: an "alter publication ... add table" on a table
-- that is already a member raises, and some environments may have been
-- added manually via the dashboard.
do
$$
declare
    v_table text;
begin
    foreach v_table in array array[
        'financial_events',
        'transactions',
        'merchants',
        'categories',
        'budgets',
        'financial_rules',
        'accounts',
        'assets',
        'liabilities',
        'loans',
        'investments',
        'goals'
    ]
    loop
        if not exists (
            select 1
            from pg_publication_tables
            where pubname = 'supabase_realtime'
                and schemaname = 'public'
                and tablename = v_table
        ) then
            execute format(
                'alter publication supabase_realtime add table public.%I',
                v_table
            );
        end if;
    end loop;
end
$$;
