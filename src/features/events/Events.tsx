import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    RefreshCw,
} from "lucide-react";

import { SearchInput } from "../../components/common/SearchInput";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Surface } from "../../components/common/Surface";

import { useEventStore } from "../../stores/eventStore";
import { cn } from "../../utils/helpers";

import { EventCard } from "./EventCard";
import { EventDetails } from "./EventDetails";

import { Plus } from "lucide-react";
import { CreateEventDialog } from "./CreateEventDialog";

export function Events() {
    const [selectedEventId, setSelectedEventId] =
        useState<string | null>(null);

    const [createDialogOpen, setCreateDialogOpen] =
        useState(false);

    const refresh = useEventStore(
        (s) => s.refresh
    );

    const confirm = useEventStore(
        (s) => s.confirm
    );

    const ignore = useEventStore(
        (s) => s.ignore
    );

    const events = useEventStore(
        (s) => s.events
    );

    const loading = useEventStore(
        (s) => s.loading
    );

    const error = useEventStore(
        (s) => s.error
    );

    const clearError = useEventStore(
        (s) => s.clearError
    );

    const search = useEventStore(
        (s) => s.search
    );

    const setSearch = useEventStore(
        (s) => s.setSearch
    );

    useEffect(() => {
        refresh();
    }, [refresh]);

    const filtered = useMemo(
        () => {
            const query =
                search.trim().toLowerCase();

            if (!query) {
                return events;
            }

            return events.filter((event) =>
                [
                    event.merchant_name_raw ?? "",
                    event.status,
                    event.direction,
                    event.currency,
                    event.amount.toString(),
                ]
                    .some((value) =>
                        value
                            .toLowerCase()
                            .includes(query)
                    )
            );
        },
        [events, search]
    );

    const selectedEvent =
        filtered.find(
            (event) => event.id === selectedEventId
        ) ??
        filtered[0] ??
        null;

    const hasEvents = events.length > 0;
    const hasFilteredEvents = filtered.length > 0;

    const emptyTitle = hasEvents
        ? "No matching events"
        : "No events";

    const emptyDescription = hasEvents
        ? "Try a different merchant, status, direction, currency, or amount."
        : "Detected financial events will appear here.";

    const eventCountLabel =
        filtered.length === 1
            ? "1 event"
            : `${filtered.length} events`;

    const handleConfirm = async (id: string) => {
        await confirm(id);
    };

    const handleIgnore = async (id: string) => {
        await ignore(id);
    };

    const handleRefresh = async () => {
        await refresh();
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        clearError();
    };

    const refreshIconClassName = cn(
        "mr-2",
        loading && "animate-spin"
    );

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Financial Events"
                description="Detected financial activity waiting for review."
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() =>
                                setCreateDialogOpen(true)
                            }
                        >
                            <Plus
                                size={16}
                                className="mr-2"
                            />
                            New Event
                        </Button>

                        <Button
                            variant="secondary"
                            disabled={loading}
                            onClick={handleRefresh}
                        >
                            <RefreshCw
                                size={16}
                                className={refreshIconClassName}
                            />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {error && (
                <Surface className="flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="font-medium">
                            {error}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        className="px-2 py-1 text-red-700 hover:bg-red-100"
                        onClick={clearError}
                    >
                        Dismiss
                    </Button>
                </Surface>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
                <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">
                                Review Queue
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {eventCountLabel}
                            </p>
                        </div>

                        <div className="w-full sm:max-w-sm">
                            <SearchInput
                                value={search}
                                onChange={handleSearch}
                                placeholder="Search events..."
                            />
                        </div>
                    </div>

                    {loading && !hasEvents ? (
                        <Surface className="flex min-h-72 items-center justify-center p-8">
                            <div className="flex flex-col items-center gap-4 text-sm text-slate-500">
                                <RefreshCw
                                    size={28}
                                    className="animate-spin text-blue-600"
                                />
                                Loading events...
                            </div>
                        </Surface>
                    ) : !hasFilteredEvents ? (
                        <Surface className="min-h-72">
                            <EmptyState
                                title={emptyTitle}
                                description={emptyDescription}
                            />
                        </Surface>
                    ) : (
                        <div className="grid gap-4">
                            {filtered.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    selected={
                                        selectedEvent?.id ===
                                        event.id
                                    }
                                    onClick={(nextEvent) =>
                                        setSelectedEventId(
                                            nextEvent.id
                                        )
                                    }
                                />
                            ))}
                        </div>
                    )}
                </section>

                <div className="lg:sticky lg:top-0 lg:h-[calc(100vh-12rem)]">
                    <EventDetails
                        event={selectedEvent}
                        loading={loading}
                        onConfirm={handleConfirm}
                        onIgnore={handleIgnore}
                    />
                </div>
            </div>

            <CreateEventDialog
                open={createDialogOpen}
                onClose={() =>
                    setCreateDialogOpen(false)
                }
            />
        </PageContainer>
    );
}
