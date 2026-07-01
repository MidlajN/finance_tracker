import type { ChangeEvent } from "react";

interface Category {
    id: string;
    name: string;
}

interface CategorySelectProps {
    value: string | null;

    categories: Category[];

    onChange: (
        categoryId: string | null
    ) => void;

    disabled?: boolean;

    className?: string;
}

export function CategorySelect({
    value,
    categories,
    onChange,
    disabled = false,
    className = "",
}: CategorySelectProps) {
    function handleChange(
        event: ChangeEvent<HTMLSelectElement>
    ) {
        const value = event.target.value;

        onChange(
            value === ""
                ? null
                : value
        );
    }

    return (
        <select
            value={value ?? ""}
            onChange={handleChange}
            disabled={disabled}
            className={[
                "w-full",
                "rounded-lg",
                "border",
                "border-slate-300",
                "bg-white",
                "px-3",
                "py-2",
                "text-sm",
                "outline-none",
                "transition",
                "focus:border-blue-600",
                "focus:ring-2",
                "focus:ring-blue-100",
                "disabled:cursor-not-allowed",
                "disabled:opacity-50",
                className,
            ].join(" ")}
        >
            <option value="">
                Uncategorized
            </option>

            {categories.map(
                (category) => (
                    <option
                        key={category.id}
                        value={category.id}
                    >
                        {category.name}
                    </option>
                )
            )}
        </select>
    );
}