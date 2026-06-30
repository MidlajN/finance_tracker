import type {
    HTMLAttributes,
    PropsWithChildren,
} from "react";

import { cn } from "../../utils/helpers";

interface PageContainerProps
    extends HTMLAttributes<HTMLDivElement>,
        PropsWithChildren {}

export function PageContainer({
    children,
    className,
    ...props
}: PageContainerProps) {
    return (
        <div
            {...props}
            className={cn(
                "mx-auto",
                "w-full",
                "max-w-7xl",
                "space-y-8",
                className
            )}
        >
            {children}
        </div>
    );
}