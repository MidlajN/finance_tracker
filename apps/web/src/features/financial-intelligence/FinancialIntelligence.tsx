import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";
import {
    AlertCircle,
    Banknote,
    BriefcaseBusiness,
    CircleDollarSign,
    Landmark,
    LineChart,
    Pencil,
    Plus,
    RefreshCw,
    Target,
    Trash2,
    WalletCards,
} from "lucide-react";

import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { EmptyState } from "../../components/common/EmptyState";
import { FormField } from "../../components/common/FormField";
import { Input } from "../../components/common/Input";
import { List } from "../../components/common/List";
import { ListItem } from "../../components/common/ListItem";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { StatCard } from "../../components/common/StatCard";
import { Surface } from "../../components/common/Surface";

import { useFinancialIntelligenceStore } from "../../stores/financialIntelligenceStore";
import { formatCurrency } from "../../utils/format";
import { cn } from "../../utils/helpers";

import type {
    AccountType,
    AssetType,
    CachedAccount,
    CachedAsset,
    CachedGoal,
    CachedInvestment,
    CachedLiability,
    CachedLoan,
    GoalStatus,
    LiabilityType,
    LoanType,
} from "@finance/shared-types";

type ResourceKind =
    | "account"
    | "asset"
    | "liability"
    | "loan"
    | "investment"
    | "goal";

type ResourceItem =
    | CachedAccount
    | CachedAsset
    | CachedLiability
    | CachedLoan
    | CachedInvestment
    | CachedGoal;

const accountTypes: AccountType[] = [
    "cash",
    "bank",
    "credit_card",
    "investment",
    "loan",
    "digital_wallet",
    "other",
];

const assetTypes: AssetType[] = [
    "cash",
    "bank_deposit",
    "real_estate",
    "vehicle",
    "precious_metals",
    "equity",
    "mutual_fund",
    "etf",
    "cryptocurrency",
    "bond",
    "other",
];

const liabilityTypes: LiabilityType[] = [
    "credit_card",
    "mortgage",
    "vehicle_loan",
    "education_loan",
    "personal_loan",
    "other",
];

const loanTypes: LoanType[] = [
    "mortgage",
    "personal_loan",
    "vehicle_loan",
    "student_loan",
    "business_loan",
];

const goalStatuses: GoalStatus[] = [
    "active",
    "completed",
    "archived",
];

function titleCase(value: string) {
    return value
        .split("_")
        .map(
            (part) =>
                part.charAt(0).toUpperCase() +
                part.slice(1)
        )
        .join(" ");
}

function Select({
    disabled,
    options,
    value,
    onChange,
}: {
    disabled?: boolean;
    options: string[];
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={(event) =>
                onChange(event.target.value)
            }
            className="
                h-10
                w-full
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-900
                outline-none
                transition
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-500/20
                disabled:cursor-not-allowed
                disabled:bg-slate-50
                disabled:text-slate-500
            "
        >
            {options.map((option) => (
                <option
                    key={option}
                    value={option}
                >
                    {titleCase(option)}
                </option>
            ))}
        </select>
    );
}

function PercentBar({
    value,
}: {
    value: number;
}) {
    const width = Math.min(
        Math.max(value, 0),
        100
    );

    return (
        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
            <div
                className="h-full rounded-full bg-blue-600"
                style={{
                    width: `${width}%`,
                }}
            />
        </div>
    );
}

interface DialogState {
    kind: ResourceKind;
    item: ResourceItem | null;
}

const defaultDialog: DialogState = {
    kind: "account",
    item: null,
};

function getInitialFormValues(
    state: DialogState | null,
    data: ReturnType<
        typeof useFinancialIntelligenceStore.getState
    >["data"]
) {
    const initial = {
        name: "",
        kind: "",
        currency: data?.baseCurrency ?? "INR",
        amount: "",
        quantity: "1",
        secondaryAmount: "",
        rate: "0",
        date: new Date()
            .toISOString()
            .slice(0, 10),
        endDate: "",
        notes: "",
        status: "active" as GoalStatus,
        liabilityId:
            data?.liabilities[0]?.id ?? "",
        payments: "0",
        exchange: "",
    };

    if (!state?.item) {
        return initial;
    }

    const value = state.item;

    if (state.kind === "account") {
        const account = value as CachedAccount;

        return {
            ...initial,
            name: account.name,
            kind: account.account_type,
            currency: account.currency,
            amount:
                account.opening_balance.toString(),
            notes: account.institution ?? "",
        };
    }

    if (state.kind === "asset") {
        const asset = value as CachedAsset;

        return {
            ...initial,
            name: asset.name,
            kind: asset.asset_type,
            currency: asset.currency,
            amount:
                asset.current_valuation.toString(),
            quantity: asset.quantity.toString(),
            secondaryAmount:
                asset.acquisition_value.toString(),
            date: asset.acquisition_date,
            notes: asset.notes ?? "",
        };
    }

    if (state.kind === "liability") {
        const liability =
            value as CachedLiability;

        return {
            ...initial,
            name: liability.name,
            kind: liability.liability_type,
            currency: liability.currency,
            amount:
                liability.outstanding_balance.toString(),
            secondaryAmount:
                liability.original_amount.toString(),
            rate:
                liability.interest_rate.toString(),
            date: liability.start_date,
            endDate: liability.end_date ?? "",
        };
    }

    if (state.kind === "loan") {
        const loan = value as CachedLoan;

        return {
            ...initial,
            kind: loan.loan_type,
            liabilityId: loan.liability_id,
            amount:
                loan.monthly_payment.toString(),
            payments:
                loan.remaining_payments.toString(),
            secondaryAmount:
                loan.interest_accrued.toString(),
        };
    }

    if (state.kind === "investment") {
        const investment =
            value as CachedInvestment;

        return {
            ...initial,
            name: investment.symbol,
            currency: investment.currency,
            quantity:
                investment.quantity.toString(),
            amount:
                investment.average_purchase_price.toString(),
            secondaryAmount:
                (
                    investment.current_price ?? 0
                ).toString(),
            exchange: investment.exchange ?? "",
        };
    }

    const goal = value as CachedGoal;

    return {
        ...initial,
        name: goal.name,
        currency: goal.currency,
        amount: goal.target_amount.toString(),
        date: goal.target_date ?? "",
        status: goal.status,
    };
}

function ResourceDialog({
    state,
    onClose,
}: {
    state: DialogState | null;
    onClose: () => void;
}) {
    const data = useFinancialIntelligenceStore(
        (store) => store.data
    );
    const loading = useFinancialIntelligenceStore(
        (store) => store.loading
    );
    const actions =
        useFinancialIntelligenceStore();
    const initialFormValues =
        getInitialFormValues(state, data);
    const [formError, setFormError] =
        useState<string | null>(null);

    const [name, setName] = useState(
        initialFormValues.name
    );
    const [kind, setKind] = useState(
        initialFormValues.kind
    );
    const [currency, setCurrency] =
        useState(initialFormValues.currency);
    const [amount, setAmount] = useState(
        initialFormValues.amount
    );
    const [quantity, setQuantity] =
        useState(initialFormValues.quantity);
    const [secondaryAmount, setSecondaryAmount] =
        useState(
            initialFormValues.secondaryAmount
        );
    const [rate, setRate] = useState(
        initialFormValues.rate
    );
    const [date, setDate] = useState(
        initialFormValues.date
    );
    const [endDate, setEndDate] = useState(
        initialFormValues.endDate
    );
    const [notes, setNotes] = useState(
        initialFormValues.notes
    );
    const [status, setStatus] =
        useState<GoalStatus>(
            initialFormValues.status
        );
    const [liabilityId, setLiabilityId] =
        useState(
            initialFormValues.liabilityId
        );
    const [payments, setPayments] = useState(
        initialFormValues.payments
    );
    const [exchange, setExchange] =
        useState(initialFormValues.exchange);

    const item = state?.item ?? null;
    const resourceKind =
        state?.kind ?? defaultDialog.kind;

    if (!state) {
        return null;
    }

    const currencyOptions =
        data?.currencies.map(
            (currencyItem) => currencyItem.code
        ) ?? [data?.baseCurrency ?? "INR"];

    function parseAmount(
        value: string,
        label: string,
        allowZero = false
    ) {
        const parsed = Number(value);

        if (
            Number.isNaN(parsed) ||
            parsed < 0 ||
            (!allowZero && parsed === 0)
        ) {
            throw new Error(label);
        }

        return parsed;
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setFormError(null);

        try {
            if (resourceKind === "account") {
                const payload = {
                    name,
                    account_type:
                        (kind ||
                            accountTypes[0]) as AccountType,
                    currency,
                    opening_balance:
                        parseAmount(
                            amount || "0",
                            "Enter a valid opening balance.",
                            true
                        ),
                    institution:
                        notes.trim() || null,
                    archived:
                        (item as CachedAccount | null)
                            ?.archived ?? false,
                };

                if (item) {
                    await actions.updateAccount(
                        item.id,
                        payload
                    );
                } else {
                    await actions.createAccount(
                        payload
                    );
                }
            }

            if (resourceKind === "asset") {
                const payload = {
                    name,
                    asset_type:
                        (kind ||
                            assetTypes[0]) as AssetType,
                    currency,
                    quantity: parseAmount(
                        quantity,
                        "Enter a valid quantity."
                    ),
                    acquisition_value:
                        parseAmount(
                            secondaryAmount,
                            "Enter a valid acquisition value.",
                            true
                        ),
                    current_valuation:
                        parseAmount(
                            amount,
                            "Enter a valid valuation."
                        ),
                    acquisition_date: date,
                    notes: notes.trim() || null,
                };

                if (item) {
                    await actions.updateAsset(
                        item.id,
                        payload
                    );
                } else {
                    await actions.createAsset(
                        payload
                    );
                }
            }

            if (resourceKind === "liability") {
                const payload = {
                    name,
                    liability_type:
                        (kind ||
                            liabilityTypes[0]) as LiabilityType,
                    currency,
                    outstanding_balance:
                        parseAmount(
                            amount,
                            "Enter a valid outstanding balance."
                        ),
                    original_amount:
                        parseAmount(
                            secondaryAmount,
                            "Enter a valid original amount."
                        ),
                    interest_rate:
                        parseAmount(
                            rate || "0",
                            "Enter a valid interest rate.",
                            true
                        ),
                    start_date: date,
                    end_date: endDate || null,
                };

                if (item) {
                    await actions.updateLiability(
                        item.id,
                        payload
                    );
                } else {
                    await actions.createLiability(
                        payload
                    );
                }
            }

            if (resourceKind === "loan") {
                if (!liabilityId) {
                    throw new Error(
                        "Select a liability."
                    );
                }

                const payload = {
                    liability_id: liabilityId,
                    loan_type:
                        (kind ||
                            loanTypes[0]) as LoanType,
                    monthly_payment:
                        parseAmount(
                            amount,
                            "Enter a valid monthly payment."
                        ),
                    remaining_payments:
                        parseAmount(
                            payments || "0",
                            "Enter a valid payment count.",
                            true
                        ),
                    interest_accrued:
                        parseAmount(
                            secondaryAmount || "0",
                            "Enter valid accrued interest.",
                            true
                        ),
                };

                if (item) {
                    await actions.updateLoan(
                        item.id,
                        payload
                    );
                } else {
                    await actions.createLoan(
                        payload
                    );
                }
            }

            if (resourceKind === "investment") {
                const payload = {
                    symbol: name
                        .trim()
                        .toUpperCase(),
                    quantity: parseAmount(
                        quantity,
                        "Enter a valid quantity."
                    ),
                    average_purchase_price:
                        parseAmount(
                            amount,
                            "Enter a valid average price."
                        ),
                    current_price:
                        secondaryAmount
                            ? parseAmount(
                                  secondaryAmount,
                                  "Enter a valid current price.",
                                  true
                              )
                            : null,
                    currency,
                    exchange:
                        exchange.trim() || null,
                    purchase_history:
                        (item as CachedInvestment | null)
                            ?.purchase_history ?? [],
                };

                if (item) {
                    await actions.updateInvestment(
                        item.id,
                        payload
                    );
                } else {
                    await actions.createInvestment(
                        payload
                    );
                }
            }

            if (resourceKind === "goal") {
                const payload = {
                    name,
                    target_amount:
                        parseAmount(
                            amount,
                            "Enter a valid target amount."
                        ),
                    currency,
                    target_date: date || null,
                    status,
                };

                if (item) {
                    await actions.updateGoal(
                        item.id,
                        payload
                    );
                } else {
                    await actions.createGoal(
                        payload
                    );
                }
            }

            onClose();
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : "Unable to save resource."
            );
        }
    }

    return (
        <Dialog
            open
            title={`${item ? "Edit" : "Add"} ${titleCase(resourceKind)}`}
            onClose={onClose}
        >
            <form
                onSubmit={handleSubmit}
                className="space-y-5"
            >
                {resourceKind !== "loan" && (
                    <FormField
                        label={
                            resourceKind ===
                            "investment"
                                ? "Symbol"
                                : "Name"
                        }
                        required
                    >
                        <Input
                            value={name}
                            disabled={loading}
                            onChange={(event) =>
                                setName(
                                    event.target
                                        .value
                                )
                            }
                        />
                    </FormField>
                )}

                {(resourceKind === "account" ||
                    resourceKind === "asset" ||
                    resourceKind === "liability" ||
                    resourceKind === "loan") && (
                    <FormField
                        label="Type"
                        required
                    >
                        <Select
                            value={
                                kind ||
                                (resourceKind ===
                                "account"
                                    ? accountTypes[0]
                                    : resourceKind ===
                                        "asset"
                                      ? assetTypes[0]
                                      : resourceKind ===
                                          "liability"
                                        ? liabilityTypes[0]
                                        : loanTypes[0])
                            }
                            disabled={loading}
                            options={
                                resourceKind ===
                                "account"
                                    ? accountTypes
                                    : resourceKind ===
                                        "asset"
                                      ? assetTypes
                                      : resourceKind ===
                                          "liability"
                                        ? liabilityTypes
                                        : loanTypes
                            }
                            onChange={setKind}
                        />
                    </FormField>
                )}

                {resourceKind !== "loan" && (
                    <FormField
                        label="Currency"
                        required
                    >
                        <Select
                            value={currency}
                            disabled={loading}
                            options={
                                currencyOptions
                            }
                            onChange={setCurrency}
                        />
                    </FormField>
                )}

                {resourceKind === "loan" && (
                    <FormField
                        label="Liability"
                        required
                    >
                        <Select
                            value={liabilityId}
                            disabled={loading}
                            options={
                                data?.liabilities.map(
                                    (liability) =>
                                        liability.id
                                ) ?? []
                            }
                            onChange={
                                setLiabilityId
                            }
                        />
                    </FormField>
                )}

                {(resourceKind === "asset" ||
                    resourceKind ===
                        "investment") && (
                    <FormField
                        label="Quantity"
                        required
                    >
                        <Input
                            type="number"
                            min="0"
                            step="0.000001"
                            value={quantity}
                            disabled={loading}
                            onChange={(event) =>
                                setQuantity(
                                    event.target
                                        .value
                                )
                            }
                        />
                    </FormField>
                )}

                <FormField
                    label={
                        resourceKind === "account"
                            ? "Opening Balance"
                            : resourceKind ===
                                "asset"
                              ? "Current Valuation"
                              : resourceKind ===
                                  "liability"
                                ? "Outstanding Balance"
                                : resourceKind ===
                                    "loan"
                                  ? "Monthly Payment"
                                  : resourceKind ===
                                      "investment"
                                    ? "Average Purchase Price"
                                    : "Target Amount"
                    }
                    required
                >
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        disabled={loading}
                        onChange={(event) =>
                            setAmount(
                                event.target.value
                            )
                        }
                    />
                </FormField>

                {(resourceKind === "asset" ||
                    resourceKind ===
                        "liability" ||
                    resourceKind === "loan" ||
                    resourceKind ===
                        "investment") && (
                    <FormField
                        label={
                            resourceKind ===
                            "asset"
                                ? "Acquisition Value"
                                : resourceKind ===
                                    "liability"
                                  ? "Original Amount"
                                  : resourceKind ===
                                      "loan"
                                    ? "Interest Accrued"
                                    : "Current Price"
                        }
                    >
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                                secondaryAmount
                            }
                            disabled={loading}
                            onChange={(event) =>
                                setSecondaryAmount(
                                    event.target
                                        .value
                                )
                            }
                        />
                    </FormField>
                )}

                {resourceKind === "liability" && (
                    <FormField label="Interest Rate">
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={rate}
                            disabled={loading}
                            onChange={(event) =>
                                setRate(
                                    event.target.value
                                )
                            }
                        />
                    </FormField>
                )}

                {resourceKind === "loan" && (
                    <FormField label="Remaining Payments">
                        <Input
                            type="number"
                            min="0"
                            step="1"
                            value={payments}
                            disabled={loading}
                            onChange={(event) =>
                                setPayments(
                                    event.target.value
                                )
                            }
                        />
                    </FormField>
                )}

                {(resourceKind === "asset" ||
                    resourceKind ===
                        "liability" ||
                    resourceKind === "goal") && (
                    <FormField
                        label={
                            resourceKind ===
                            "asset"
                                ? "Acquisition Date"
                                : resourceKind ===
                                    "liability"
                                  ? "Start Date"
                                  : "Target Date"
                        }
                    >
                        <Input
                            type="date"
                            value={date}
                            disabled={loading}
                            onChange={(event) =>
                                setDate(
                                    event.target.value
                                )
                            }
                        />
                    </FormField>
                )}

                {resourceKind === "liability" && (
                    <FormField label="End Date">
                        <Input
                            type="date"
                            value={endDate}
                            disabled={loading}
                            onChange={(event) =>
                                setEndDate(
                                    event.target.value
                                )
                            }
                        />
                    </FormField>
                )}

                {resourceKind === "goal" && (
                    <FormField label="Status">
                        <Select
                            value={status}
                            disabled={loading}
                            options={goalStatuses}
                            onChange={(value) =>
                                setStatus(
                                    value as GoalStatus
                                )
                            }
                        />
                    </FormField>
                )}

                {resourceKind ===
                    "investment" && (
                    <FormField label="Exchange">
                        <Input
                            value={exchange}
                            disabled={loading}
                            onChange={(event) =>
                                setExchange(
                                    event.target.value
                                )
                            }
                        />
                    </FormField>
                )}

                {(resourceKind === "account" ||
                    resourceKind === "asset") && (
                    <FormField
                        label={
                            resourceKind ===
                            "account"
                                ? "Institution"
                                : "Notes"
                        }
                    >
                        <Input
                            value={notes}
                            disabled={loading}
                            onChange={(event) =>
                                setNotes(
                                    event.target.value
                                )
                            }
                        />
                    </FormField>
                )}

                {formError && (
                    <p className="text-sm text-red-600">
                        {formError}
                    </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={loading}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        Save
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function ResourceActions({
    onEdit,
    onDelete,
}: {
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="flex gap-2">
            <Button
                variant="ghost"
                className="p-2"
                onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                }}
            >
                <Pencil size={16} />
            </Button>

            <Button
                variant="ghost"
                className="p-2 text-red-600 hover:bg-red-50"
                onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                }}
            >
                <Trash2 size={16} />
            </Button>
        </div>
    );
}

function AddButton({
    kind,
    label,
    onOpen,
}: {
    kind: ResourceKind;
    label: string;
    onOpen: (state: DialogState) => void;
}) {
    return (
        <Button
            variant="secondary"
            onClick={() =>
                onOpen({
                    kind,
                    item: null,
                })
            }
        >
            <Plus
                size={16}
                className="mr-2"
            />
            {label}
        </Button>
    );
}

export function FinancialIntelligence() {
    const refresh = useFinancialIntelligenceStore(
        (state) => state.refresh
    );
    const data = useFinancialIntelligenceStore(
        (state) => state.data
    );
    const loading = useFinancialIntelligenceStore(
        (state) => state.loading
    );
    const error = useFinancialIntelligenceStore(
        (state) => state.error
    );
    const clearError = useFinancialIntelligenceStore(
        (state) => state.clearError
    );
    const actions =
        useFinancialIntelligenceStore();
    const [dialog, setDialog] =
        useState<DialogState | null>(null);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const overview = data?.overview;
    const refreshIconClassName = cn(
        "mr-2",
        loading && "animate-spin"
    );

    const loanLiabilityNames = useMemo(() => {
        const names = new Map<string, string>();

        data?.liabilities.forEach((liability) => {
            names.set(
                liability.id,
                liability.name
            );
        });

        return names;
    }, [data]);

    async function deleteResource(
        kind: ResourceKind,
        id: string
    ) {
        if (kind === "account") {
            await actions.deleteAccount(id);
        }

        if (kind === "asset") {
            await actions.deleteAsset(id);
        }

        if (kind === "liability") {
            await actions.deleteLiability(id);
        }

        if (kind === "loan") {
            await actions.deleteLoan(id);
        }

        if (kind === "investment") {
            await actions.deleteInvestment(id);
        }

        if (kind === "goal") {
            await actions.deleteGoal(id);
        }
    }

    const showInitialLoading =
        loading && !data;

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Financial Intelligence"
                description="Accounts, assets, liabilities, goals, investments and net worth from deterministic Finance Core calculations."
                actions={
                    <Button
                        variant="secondary"
                        disabled={loading}
                        onClick={refresh}
                    >
                        <RefreshCw
                            size={16}
                            className={
                                refreshIconClassName
                            }
                        />
                        Refresh
                    </Button>
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
                        className="p-2 text-red-700"
                        onClick={clearError}
                    >
                        Dismiss
                    </Button>
                </Surface>
            )}

            {showInitialLoading ? (
                <Surface className="p-8 text-center text-sm text-slate-500">
                    Loading financial intelligence...
                </Surface>
            ) : overview && data ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Net Worth"
                            value={formatCurrency(
                                overview.netWorth
                                    .netWorth,
                                overview.baseCurrency
                            )}
                            subtitle={overview.baseCurrency}
                            icon={
                                <CircleDollarSign size={20} />
                            }
                        />
                        <StatCard
                            title="Assets"
                            value={formatCurrency(
                                overview.netWorth
                                    .totalAssets +
                                    overview.netWorth
                                        .totalInvestments,
                                overview.baseCurrency
                            )}
                            subtitle="Assets and investments"
                            icon={<LineChart size={20} />}
                        />
                        <StatCard
                            title="Accounts"
                            value={formatCurrency(
                                overview.netWorth
                                    .totalAccounts,
                                overview.baseCurrency
                            )}
                            subtitle="Current balances"
                            icon={<Landmark size={20} />}
                        />
                        <StatCard
                            title="Liabilities"
                            value={formatCurrency(
                                overview.netWorth
                                    .totalLiabilities,
                                overview.baseCurrency
                            )}
                            subtitle="Outstanding balances"
                            icon={
                                <WalletCards size={20} />
                            }
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            title="Accounts"
                            actions={
                                <AddButton
                                    kind="account"
                                    label="Account"
                                    onOpen={setDialog}
                                />
                            }
                        >
                            {overview.accounts
                                .length === 0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No accounts"
                                        description="Add an account to track derived balances."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {overview.accounts.map(
                                        (account) => (
                                            <ListItem
                                                key={
                                                    account
                                                        .account
                                                        .id
                                                }
                                                title={
                                                    account
                                                        .account
                                                        .name
                                                }
                                                subtitle={`${titleCase(account.account.account_type)} • ${account.account.currency}`}
                                                icon={
                                                    <Banknote
                                                        size={
                                                            18
                                                        }
                                                        className="text-blue-600"
                                                    />
                                                }
                                                right={
                                                    <>
                                                        <div className="text-right">
                                                            <p className="font-semibold text-slate-900">
                                                                {formatCurrency(
                                                                    account.currentBalance,
                                                                    account
                                                                        .account
                                                                        .currency
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {formatCurrency(
                                                                    account.convertedBalance,
                                                                    overview.baseCurrency
                                                                )}
                                                            </p>
                                                        </div>
                                                        <ResourceActions
                                                            onEdit={() =>
                                                                setDialog(
                                                                    {
                                                                        kind: "account",
                                                                        item: account.account as CachedAccount,
                                                                    }
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                deleteResource(
                                                                    "account",
                                                                    account
                                                                        .account
                                                                        .id ??
                                                                        ""
                                                                )
                                                            }
                                                        />
                                                    </>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>

                        <Section
                            title="Goals"
                            actions={
                                <AddButton
                                    kind="goal"
                                    label="Goal"
                                    onOpen={setDialog}
                                />
                            }
                        >
                            {overview.goals.length ===
                            0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No goals"
                                        description="Add a goal to track progress."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {overview.goals.map(
                                        (goal) => (
                                            <ListItem
                                                key={
                                                    goal
                                                        .goal
                                                        .id
                                                }
                                                title={
                                                    goal
                                                        .goal
                                                        .name
                                                }
                                                subtitle={`${formatCurrency(goal.remainingAmount, overview.baseCurrency)} remaining`}
                                                icon={
                                                    <Target
                                                        size={
                                                            18
                                                        }
                                                        className="text-emerald-600"
                                                    />
                                                }
                                                right={
                                                    <>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <Badge>
                                                                {titleCase(
                                                                    goal
                                                                        .goal
                                                                        .status
                                                                )}
                                                            </Badge>
                                                            <PercentBar
                                                                value={
                                                                    goal.progressPercentage
                                                                }
                                                            />
                                                        </div>
                                                        <ResourceActions
                                                            onEdit={() =>
                                                                setDialog(
                                                                    {
                                                                        kind: "goal",
                                                                        item: goal.goal as CachedGoal,
                                                                    }
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                deleteResource(
                                                                    "goal",
                                                                    goal
                                                                        .goal
                                                                        .id ??
                                                                        ""
                                                                )
                                                            }
                                                        />
                                                    </>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>

                        <Section
                            title="Assets"
                            actions={
                                <AddButton
                                    kind="asset"
                                    label="Asset"
                                    onOpen={setDialog}
                                />
                            }
                        >
                            {data.assets.length === 0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No assets"
                                        description="Add an asset to include valuations in net worth."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {data.assets.map(
                                        (asset) => (
                                            <ListItem
                                                key={
                                                    asset.id
                                                }
                                                title={
                                                    asset.name
                                                }
                                                subtitle={`${titleCase(asset.asset_type)} • ${asset.quantity} units`}
                                                icon={
                                                    <BriefcaseBusiness
                                                        size={
                                                            18
                                                        }
                                                        className="text-amber-600"
                                                    />
                                                }
                                                right={
                                                    <>
                                                        <span className="font-semibold text-slate-900">
                                                            {formatCurrency(
                                                                asset.current_valuation,
                                                                asset.currency
                                                            )}
                                                        </span>
                                                        <ResourceActions
                                                            onEdit={() =>
                                                                setDialog(
                                                                    {
                                                                        kind: "asset",
                                                                        item: asset,
                                                                    }
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                deleteResource(
                                                                    "asset",
                                                                    asset.id
                                                                )
                                                            }
                                                        />
                                                    </>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>

                        <Section
                            title="Liabilities"
                            actions={
                                <AddButton
                                    kind="liability"
                                    label="Liability"
                                    onOpen={setDialog}
                                />
                            }
                        >
                            {data.liabilities.length ===
                            0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No liabilities"
                                        description="Add a liability to include outstanding balances."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {data.liabilities.map(
                                        (liability) => (
                                            <ListItem
                                                key={
                                                    liability.id
                                                }
                                                title={
                                                    liability.name
                                                }
                                                subtitle={`${titleCase(liability.liability_type)} • ${liability.interest_rate}%`}
                                                icon={
                                                    <WalletCards
                                                        size={
                                                            18
                                                        }
                                                        className="text-red-600"
                                                    />
                                                }
                                                right={
                                                    <>
                                                        <span className="font-semibold text-slate-900">
                                                            {formatCurrency(
                                                                liability.outstanding_balance,
                                                                liability.currency
                                                            )}
                                                        </span>
                                                        <ResourceActions
                                                            onEdit={() =>
                                                                setDialog(
                                                                    {
                                                                        kind: "liability",
                                                                        item: liability,
                                                                    }
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                deleteResource(
                                                                    "liability",
                                                                    liability.id
                                                                )
                                                            }
                                                        />
                                                    </>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>

                        <Section
                            title="Investments"
                            actions={
                                <AddButton
                                    kind="investment"
                                    label="Investment"
                                    onOpen={setDialog}
                                />
                            }
                        >
                            {overview.investments
                                .length === 0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No investments"
                                        description="Add an investment to track valuation and performance."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {overview.investments.map(
                                        (
                                            investment
                                        ) => (
                                            <ListItem
                                                key={
                                                    investment
                                                        .investment
                                                        .id
                                                }
                                                title={
                                                    investment
                                                        .investment
                                                        .symbol
                                                }
                                                subtitle={`${investment.investment.quantity} units • ${investment.gainLossPercentage === null ? "No cost basis" : `${investment.gainLossPercentage.toFixed(1)}%`}`}
                                                icon={
                                                    <LineChart
                                                        size={
                                                            18
                                                        }
                                                        className="text-indigo-600"
                                                    />
                                                }
                                                right={
                                                    <>
                                                        <div className="text-right">
                                                            <p className="font-semibold text-slate-900">
                                                                {formatCurrency(
                                                                    investment.marketValue,
                                                                    investment
                                                                        .investment
                                                                        .currency
                                                                )}
                                                            </p>
                                                            <p
                                                                className={cn(
                                                                    "text-xs",
                                                                    investment.gainLoss >=
                                                                        0
                                                                        ? "text-emerald-600"
                                                                        : "text-red-600"
                                                                )}
                                                            >
                                                                {formatCurrency(
                                                                    investment.gainLoss,
                                                                    investment
                                                                        .investment
                                                                        .currency
                                                                )}
                                                            </p>
                                                        </div>
                                                        <ResourceActions
                                                            onEdit={() =>
                                                                setDialog(
                                                                    {
                                                                        kind: "investment",
                                                                        item: investment.investment as CachedInvestment,
                                                                    }
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                deleteResource(
                                                                    "investment",
                                                                    investment
                                                                        .investment
                                                                        .id ??
                                                                        ""
                                                                )
                                                            }
                                                        />
                                                    </>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>

                        <Section
                            title="Loans"
                            actions={
                                <AddButton
                                    kind="loan"
                                    label="Loan"
                                    onOpen={setDialog}
                                />
                            }
                        >
                            {overview.loans.length ===
                            0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No loans"
                                        description="Add a loan after creating its liability."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {overview.loans.map(
                                        (loan) => (
                                            <ListItem
                                                key={
                                                    loan
                                                        .loan
                                                        .id
                                                }
                                                title={
                                                    loanLiabilityNames.get(
                                                        loan
                                                            .loan
                                                            .liability_id
                                                    ) ??
                                                    titleCase(
                                                        loan
                                                            .loan
                                                            .loan_type
                                                    )
                                                }
                                                subtitle={`${loan.loan.remaining_payments} payments remaining`}
                                                icon={
                                                    <Landmark
                                                        size={
                                                            18
                                                        }
                                                        className="text-slate-700"
                                                    />
                                                }
                                                right={
                                                    <>
                                                        <span className="font-semibold text-slate-900">
                                                            {formatCurrency(
                                                                loan.projectedRemainingPaymentTotal,
                                                                data.baseCurrency
                                                            )}
                                                        </span>
                                                        <ResourceActions
                                                            onEdit={() =>
                                                                setDialog(
                                                                    {
                                                                        kind: "loan",
                                                                        item: loan.loan as CachedLoan,
                                                                    }
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                deleteResource(
                                                                    "loan",
                                                                    loan
                                                                        .loan
                                                                        .id ??
                                                                        ""
                                                                )
                                                            }
                                                        />
                                                    </>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>
                    </div>
                </>
            ) : (
                <Surface>
                    <EmptyState
                        title="Financial intelligence unavailable"
                        description="Refresh to load planning resources."
                    />
                </Surface>
            )}

            <ResourceDialog
                key={
                    dialog
                        ? `${dialog.kind}:${dialog.item?.id ?? "new"}:${data?.baseCurrency ?? "INR"}`
                        : "closed"
                }
                state={dialog}
                onClose={() =>
                    setDialog(null)
                }
            />
        </PageContainer>
    );
}
