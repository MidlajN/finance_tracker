import type {
    HTMLAttributes,
    PropsWithChildren,
    ReactNode,
} from "react";

import { cn } from "../../utils/helpers";

interface SectionProps
    extends HTMLAttributes<HTMLDivElement>,
        PropsWithChildren {
    title: string;

    description?: string;

    actions?: ReactNode;
}

export function Section({
    title,
    description,
    actions,
    children,
    className,
    ...props
}: SectionProps) {
    return (
        <section
            {...props}
            className={cn(
                "space-y-4",
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                        {title}
                    </h2>

                    {description && (
                        <p className="mt-1 text-sm text-slate-500">
                            {description}
                        </p>
                    )}
                </div>

                {actions}
            </div>

            {children}
        </section>
    );
}