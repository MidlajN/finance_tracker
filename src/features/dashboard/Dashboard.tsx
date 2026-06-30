import { useEffect } from "react";

import {
    Clock3,
    CreditCard,
    Receipt,
    Store,
} from "lucide-react";

import { EmptyState } from "../../components/common/EmptyState";
import { List } from "../../components/common/List";
import { ListItem } from "../../components/common/ListItem";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { StatCard } from "../../components/common/StatCard";

import { useEventStore } from "../../stores/eventStore";

export function Dashboard() {
    const refresh = useEventStore(
        (s) => s.refresh
    );

    const events = useEventStore(
        (s) => s.events
    );

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <PageContainer>
            <PageHeader
                title="Dashboard"
                description="Monitor your financial activity."
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Pending"
                    value={events.length}
                    icon={<Clock3 />}
                />

                <StatCard
                    title="Today"
                    value="₹0"
                    icon={<CreditCard />}
                />

                <StatCard
                    title="Transactions"
                    value="0"
                    icon={<Receipt />}
                />

                <StatCard
                    title="Merchants"
                    value="0"
                    icon={<Store />}
                />
            </div>

            <Section
                title="Recent Events"
                description="Latest detected financial events."
            >
                {events.length === 0 ? (
                    <EmptyState
                        title="No Events"
                        description="Detected events will appear here."
                    />
                ) : (
                    <List>
                        {events.map((event) => (
                            <ListItem
                                key={event.id}
                                title={
                                    event.merchant_name_raw ??
                                    "Unknown Merchant"
                                }
                                subtitle={event.status}
                                right={
                                    <span className="font-semibold">
                                        ₹{event.amount}
                                    </span>
                                }
                            />
                        ))}
                    </List>
                )}
            </Section>
        </PageContainer>
    );
}