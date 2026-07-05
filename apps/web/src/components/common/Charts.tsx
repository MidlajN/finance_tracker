import { EmptyState } from "./EmptyState";
import { Surface } from "./Surface";

interface BarChartItem {
    label: string;
    value: number;
}

interface PairedChartItem {
    label: string;
    firstValue: number;
    secondValue: number;
}

interface CashFlowChartItem {
    label: string;
    income: number;
    expenses: number;
    net: number;
}

function getMaximum(values: number[]) {
    return (
        Math.max(
            ...values.map((value) =>
                Math.abs(value)
            ),
            0
        ) || 1
    );
}

function getWidth(value: number, maximum: number) {
    return `${Math.min(
        100,
        (Math.abs(value) / maximum) * 100
    )}%`;
}

export function BarListChart({
    data,
    emptyTitle,
    formatValue,
}: {
    data: BarChartItem[];
    emptyTitle: string;
    formatValue: (value: number) => string;
}) {
    if (data.length === 0) {
        return (
            <Surface>
                <EmptyState
                    title={emptyTitle}
                    description="Confirmed transaction history will appear here."
                />
            </Surface>
        );
    }

    const maximum = getMaximum(
        data.map((item) => item.value)
    );

    return (
        <Surface className="space-y-4 p-5">
            {data.map((item) => (
                <div
                    key={item.label}
                    className="space-y-2"
                >
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium text-slate-700">
                            {item.label}
                        </span>
                        <span className="shrink-0 font-semibold text-slate-900">
                            {formatValue(item.value)}
                        </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                                width: getWidth(
                                    item.value,
                                    maximum
                                ),
                            }}
                        />
                    </div>
                </div>
            ))}
        </Surface>
    );
}

export function PairedBarChart({
    data,
    emptyTitle,
    firstLabel,
    formatValue,
    secondLabel,
}: {
    data: PairedChartItem[];
    emptyTitle: string;
    firstLabel: string;
    formatValue: (value: number) => string;
    secondLabel: string;
}) {
    if (data.length === 0) {
        return (
            <Surface>
                <EmptyState
                    title={emptyTitle}
                    description="Confirmed transaction history will appear here."
                />
            </Surface>
        );
    }

    const maximum = getMaximum(
        data.flatMap((item) => [
            item.firstValue,
            item.secondValue,
        ])
    );

    return (
        <Surface className="space-y-5 p-5">
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    {firstLabel}
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    {secondLabel}
                </span>
            </div>

            {data.map((item) => (
                <div
                    key={item.label}
                    className="space-y-2"
                >
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium text-slate-700">
                            {item.label}
                        </span>
                        <span className="shrink-0 text-slate-500">
                            {formatValue(
                                item.firstValue -
                                    item.secondValue
                            )}
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-green-500"
                                style={{
                                    width: getWidth(
                                        item.firstValue,
                                        maximum
                                    ),
                                }}
                            />
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-red-500"
                                style={{
                                    width: getWidth(
                                        item.secondValue,
                                        maximum
                                    ),
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </Surface>
    );
}

export function CashFlowChart({
    data,
    emptyTitle,
    formatValue,
}: {
    data: CashFlowChartItem[];
    emptyTitle: string;
    formatValue: (value: number) => string;
}) {
    if (data.length === 0) {
        return (
            <Surface>
                <EmptyState
                    title={emptyTitle}
                    description="Confirmed transaction history will appear here."
                />
            </Surface>
        );
    }

    const maximum = getMaximum(
        data.map((item) => item.net)
    );

    return (
        <Surface className="space-y-4 p-5">
            {data.map((item) => (
                <div
                    key={item.label}
                    className="grid gap-3 md:grid-cols-[7rem_1fr_8rem] md:items-center"
                >
                    <span className="text-sm font-medium text-slate-700">
                        {item.label}
                    </span>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={
                                item.net >= 0
                                    ? "h-full rounded-full bg-green-500"
                                    : "h-full rounded-full bg-red-500"
                            }
                            style={{
                                width: getWidth(
                                    item.net,
                                    maximum
                                ),
                            }}
                        />
                    </div>

                    <span className="text-left text-sm font-semibold text-slate-900 md:text-right">
                        {formatValue(item.net)}
                    </span>
                </div>
            ))}
        </Surface>
    );
}
