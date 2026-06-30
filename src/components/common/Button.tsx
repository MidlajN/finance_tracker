import type {
    ButtonHTMLAttributes,
    PropsWithChildren,
} from "react";

import { cn } from "../../utils/helpers";

type Variant =
    | "primary"
    | "secondary"
    | "danger"
    | "ghost";

interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
        PropsWithChildren {
    variant?: Variant;
}

const variants: Record<Variant, string> = {
    primary:
        "bg-blue-600 text-white hover:bg-blue-700",

    secondary:
        "bg-slate-100 text-slate-800 hover:bg-slate-200",

    danger:
        "bg-red-600 text-white hover:bg-red-700",

    ghost:
        "hover:bg-slate-100 text-slate-700",
};

export function Button({
    children,
    variant = "primary",
    className,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            className={cn(
                "cursor-pointer",
                "inline-flex items-center justify-center",
                "rounded-lg",
                "px-4 py-2",
                "text-sm font-medium",
                "transition-colors",
                "disabled:pointer-events-none",
                "disabled:opacity-50",
                variants[variant],
                className
            )}
        >
            {children}
        </button>
    );
}