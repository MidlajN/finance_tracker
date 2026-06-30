import { Inbox } from "lucide-react";

interface EmptyStateProps {
    title: string;
    description?: string;
}

export function EmptyState({
    title,
    description,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox
                size={48}
                className="text-slate-300"
            />

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {title}
            </h3>

            {description && (
                <p className="mt-2 max-w-md text-sm text-slate-500">
                    {description}
                </p>
            )}
        </div>
    );
}