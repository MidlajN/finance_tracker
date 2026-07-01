import type {
    HTMLAttributes,
    PropsWithChildren,
} from "react";

import { cn } from "../../utils/helpers";

interface SurfaceProps
    extends HTMLAttributes<HTMLDivElement>,
        PropsWithChildren {}

export function Surface({
    children,
    className,
    ...props
}: SurfaceProps) {
    return (
        <div
            {...props}
            className={cn(
                "rounded-2xl",
                "border",
                "border-slate-200/70",
                "bg-white/90",
                "backdrop-blur",
                "shadow-sm",
                className
            )}
        >
            {children}
        </div>
    );
}