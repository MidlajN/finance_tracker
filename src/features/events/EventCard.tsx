import {
    ArrowDownRight,
    ArrowUpRight,
    Clock,
} from "lucide-react";

import type { Event } from "../../types";

import { Badge } from "../../components/common/Badge";
import { cn } from "../../utils/helpers";


type BadgeVariant =
    "default" | "success" | "warning" | "danger";

interface EventCardProps {
    event: Event;

    selected?: boolean;

    onClick?: (event: Event) => void;
}

function getStatusVariant(
    status: Event["status"]
): BadgeVariant {
    if (status === "pending") {
        return "warning";
    }

    if (status === "confirmed") {
        return "success";
    }

    if (status === "ignored") {
        return "danger";
    }

    return "default";
}

export function EventCard({
    event,
    selected = false,
    onClick,
}: EventCardProps) {
    const isDebit =
        event.direction === "debit";

    const occurredAt = new Date(
        event.occurred_at
    );

    return (
        <button
            type="button"
            onClick={() => onClick?.(event)}
            className={cn(
                "w-full",
                "rounded-2xl",
                "border",
                "bg-white",
                "p-5",
                "text-left",
                "transition-all",
                "duration-200",
                "hover:border-blue-300",
                "hover:shadow-md",
                "focus:outline-none",
                "focus:ring-2",
                "focus:ring-blue-500",
                selected
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-slate-200"
            )}
        >
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-900">
                        {event.merchant_name_raw ??
                            "Unknown Merchant"}
                    </h3>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={14} />

                        <span>
                            {occurredAt.toLocaleDateString()}
                        </span>

                        <span>•</span>

                        <span>
                            {occurredAt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                </div>

                <Badge
                    variant={getStatusVariant(
                        event.status
                    )}
                >
                    {event.status}
                </Badge>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isDebit ? (
                        <ArrowUpRight
                            size={18}
                            className="text-red-500"
                        />
                    ) : (
                        <ArrowDownRight
                            size={18}
                            className="text-green-500"
                        />
                    )}

                    <span
                        className={cn(
                            "text-2xl font-bold",
                            isDebit
                                ? "text-red-600"
                                : "text-green-600"
                        )}
                    >
                        ₹
                        {event.amount.toLocaleString(
                            "en-IN",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            }
                        )}
                    </span>
                </div>

                <span className="text-xs text-slate-400">
                    {Math.round(
                        event.confidence * 100
                    )}
                    % confidence
                </span>
            </div>
        </button>
    );
}
