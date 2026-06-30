import type {
    HTMLAttributes,
    PropsWithChildren,
} from "react";

import { cn } from "../../utils/helpers";

interface ListProps
    extends HTMLAttributes<HTMLDivElement>,
        PropsWithChildren {}

export function List({
    children,
    className,
    ...props
}: ListProps) {
    return (
        <div
            {...props}
            className={cn(
                "overflow-hidden rounded-2xl border border-slate-200 bg-white",
                className
            )}
        >
            {children}
        </div>
    );
}