import type {
    HTMLAttributes,
    PropsWithChildren,
} from "react";

import { cn } from "../../utils/helpers";

type Variant =
    | "default"
    | "success"
    | "warning"
    | "danger";

interface BadgeProps
    extends HTMLAttributes<HTMLSpanElement>,
        PropsWithChildren {
    variant?: Variant;
}

const variants: Record<Variant, string> = {
    default:
        "bg-slate-100 text-slate-700",

    success:
        "bg-green-100 text-green-700",

    warning:
        "bg-yellow-100 text-yellow-700",

    danger:
        "bg-red-100 text-red-700",
};

export function Badge({
    children,
    variant = "default",
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center",
                "rounded-full",
                "px-2.5 py-1",
                "text-xs font-medium",
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}