-- Budgets evolve from per-month rows into standing templates. A single row
-- now defines a repeating budget; Finance Core derives the active window
-- (week / month / quarter / year) from starts_on at read time. No rows are
-- created on rollover.

alter table budgets
    rename column month_start to starts_on;

alter table budgets
    add column period text not null default 'monthly'
        check (
            period in (
                'weekly',
                'monthly',
                'quarterly',
                'yearly'
            )
        );

alter table budgets
    add column auto_renew boolean not null default true;

alter table budgets
    add column ends_on date;

alter table budgets
    add constraint budgets_ends_after_start
        check (
            ends_on is null
            or ends_on >= starts_on
        );

-- Existing rows were created via unique(user_id, category_id, month_start),
-- so a category may hold several monthly rows. The most recent row becomes
-- the live template; older rows are closed the day before their successor
-- starts and remain as history.
with successors as (
    select
        id,
        lead(starts_on) over (
            partition by user_id, category_id
            order by starts_on
        ) as next_starts_on
    from budgets
)
update budgets
set ends_on = successors.next_starts_on - 1
from successors
where budgets.id = successors.id
  and successors.next_starts_on is not null
  and budgets.ends_on is null;

-- Templates allow one ACTIVE definition per category; ended templates
-- remain as history.
alter table budgets
    drop constraint budgets_user_id_category_id_month_start_key;

create unique index idx_budgets_active_category
    on budgets(user_id, category_id)
    where ends_on is null;
