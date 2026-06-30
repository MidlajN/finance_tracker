import {
    ArrowDownRight,
    ArrowUpRight,
    Calendar,
    CircleDollarSign,
    Clock,
    FileJson,
    ShieldCheck,
    StickyNote,
} from "lucide-react";


import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Surface } from "../../components/common/Surface";
import type { Event } from "../../types";


type BadgeVariant =
    "default" | "success" | "warning" | "danger";

interface EventDetailsProps {
    event: Event | null;

    loading?: boolean;

    onConfirm?: (id: string) => void | Promise<void>;

    onIgnore?: (id: string) => void | Promise<void>;
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

export function EventDetails({
    event,
    loading = false,
    onConfirm,
    onIgnore,
}: EventDetailsProps) {
    if (!event) {
        return (
            <Surface className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                    <CircleDollarSign
                        size={56}
                        className="mx-auto text-slate-300"
                    />

                    <h2 className="mt-6 text-xl font-semibold text-slate-900">
                        Select an Event
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Select a financial event from the
                        left to review its details.
                    </p>
                </div>
            </Surface>
        );
    }

    const isDebit =
        event.direction === "debit";

    return (
        <Surface className="flex h-full flex-col">
            <div className="border-b border-slate-200 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {event.merchant_name_raw ??
                                "Unknown Merchant"}
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Financial Event
                        </p>
                    </div>

                    <Badge
                        variant={getStatusVariant(
                            event.status
                        )}
                    >
                        {event.status}
                    </Badge>
                </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-6">

                {/* Amount */}

                <section>
                    <div className="flex items-center gap-3">
                        {isDebit ? (
                            <ArrowUpRight className="text-red-500" />
                        ) : (
                            <ArrowDownRight className="text-green-500" />
                        )}

                        <div>
                            <p className="text-sm text-slate-500">
                                Amount
                            </p>

                            <h1 className="text-4xl font-bold tracking-tight">
                                ₹
                                {event.amount.toLocaleString(
                                    "en-IN",
                                    {
                                        minimumFractionDigits: 2,
                                    }
                                )}
                            </h1>
                        </div>
                    </div>
                </section>

                {/* Event Info */}

                <section className="space-y-5">

                    <div className="flex items-center gap-3">
                        <Calendar
                            size={18}
                            className="text-slate-400"
                        />

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Date
                            </p>

                            <p className="font-medium">
                                {new Date(
                                    event.occurred_at
                                ).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Clock
                            size={18}
                            className="text-slate-400"
                        />

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Time
                            </p>

                            <p className="font-medium">
                                {new Date(
                                    event.occurred_at
                                ).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ShieldCheck
                            size={18}
                            className="text-slate-400"
                        />

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Confidence
                            </p>

                            <p className="font-medium">
                                {Math.round(
                                    event.confidence * 100
                                )}
                                %
                            </p>
                        </div>
                    </div>

                </section>

                {/* Notes */}

                {event.notes && (
                    <section>

                        <div className="mb-3 flex items-center gap-2">
                            <StickyNote
                                size={18}
                                className="text-slate-400"
                            />

                            <h3 className="font-semibold">
                                Notes
                            </h3>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                            {event.notes}
                        </div>

                    </section>
                )}

                {/* Metadata */}

                <section>

                    <div className="mb-3 flex items-center gap-2">
                        <FileJson
                            size={18}
                            className="text-slate-400"
                        />

                        <h3 className="font-semibold">
                            Metadata
                        </h3>
                    </div>

                    <pre className="overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-200">
                        {JSON.stringify(
                            event.metadata,
                            null,
                            2
                        )}
                    </pre>

                </section>

            </div>

            {event.status === "pending" && (
                <div className="flex gap-3 border-t border-slate-200 p-6">

                    <Button
                        variant="secondary"
                        className="flex-1"
                        disabled={loading}
                        onClick={() =>
                            onIgnore?.(event.id)
                        }
                    >
                        Ignore
                    </Button>

                    <Button
                        className="flex-1"
                        disabled={loading}
                        onClick={() =>
                            onConfirm?.(event.id)
                        }
                    >
                        Confirm
                    </Button>

                </div>
            )}
        </Surface>
    );
}
