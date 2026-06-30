import type {
    HTMLAttributes,
    PropsWithChildren,
} from "react";

import { cn } from "../../utils/helpers";

interface CardProps
    extends HTMLAttributes<HTMLDivElement>,
        PropsWithChildren {}

export function Card({
    children,
    className,
    ...props
}: CardProps) {
    return (
        <div
            {...props}
            className={cn(
                "group",
                "rounded-2xl",
                "border",
                "border-slate-200/70",
                "bg-white",
                "p-6",
                "shadow-sm",
                "transition-all",
                "duration-300",
                "hover:-translate-y-1",
                "hover:shadow-lg",
                className
            )}
        >
            {children}
        </div>
    );
}