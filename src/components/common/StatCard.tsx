import type { ReactNode } from "react";

import { ArrowUpRight } from "lucide-react";

import { Card } from "./Card";

interface StatCardProps {
    title: string;

    value: ReactNode;

    subtitle?: string;

    icon?: ReactNode;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon,
}: StatCardProps) {
    return (
        <Card>
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                        {value}
                    </h2>

                    {subtitle && (
                        <p className="text-sm text-slate-500">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div
                    className="
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-100
                        text-slate-700
                    "
                >
                    {icon ?? <ArrowUpRight size={20} />}
                </div>
            </div>
        </Card>
    );
}