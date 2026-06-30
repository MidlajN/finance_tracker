insert into categories (
    user_id,
    name,
    icon,
    color,
    is_system
)
values
    (null, 'Food', 'utensils', '#ef4444', true),
    (null, 'Groceries', 'shopping-cart', '#22c55e', true),
    (null, 'Transport', 'car', '#3b82f6', true),
    (null, 'Fuel', 'fuel', '#f97316', true),
    (null, 'Shopping', 'shopping-bag', '#8b5cf6', true),
    (null, 'Bills', 'receipt', '#64748b', true),
    (null, 'Entertainment', 'film', '#ec4899', true),
    (null, 'Health', 'heart-pulse', '#10b981', true),
    (null, 'Salary', 'wallet', '#14b8a6', true),
    (null, 'Transfer', 'arrow-right-left', '#6366f1', true)
on conflict do nothing;