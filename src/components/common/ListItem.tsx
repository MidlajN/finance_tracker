import type {
    HTMLAttributes,
    PropsWithChildren,
    ReactNode,
} from "react";

import { ChevronRight } from "lucide-react";

import { cn } from "../../utils/helpers";

interface ListItemProps
    extends HTMLAttributes<HTMLDivElement>,
        PropsWithChildren {
    icon?: ReactNode;
    title: string;
    subtitle?: string;
    right?: ReactNode;
}

export function ListItem({
    icon,
    title,
    subtitle,
    right,
    className,
    ...props
}: ListItemProps) {
    return (
        <div
            {...props}
            className={cn(
                "flex cursor-pointer items-center justify-between border-b border-slate-100 p-5 transition hover:bg-slate-50 last:border-none",
                className
            )}
        >
            <div className="flex items-center gap-4">
                {icon}

                <div>
                    <h3 className="font-medium text-slate-900">
                        {title}
                    </h3>

                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-500">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {right}

                <ChevronRight
                    size={18}
                    className="text-slate-300"
                />
            </div>
        </div>
    );
}