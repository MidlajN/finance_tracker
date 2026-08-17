import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    deriveTransactionType,
    getAccountClass,
} from "@finance/finance-core";

import { Button } from "../../components/common/Button";
import { CategorySelect } from "../../components/common/CategorySelect";
import { Dialog } from "../../components/common/Dialog";
import { FormField } from "../../components/common/FormField";
import { Input } from "../../components/common/Input";
import { MerchantCombobox } from "../../components/common/MerchantCombobox";

import { useCategoryStore } from "../../stores/categoryStore";
import { useFinancialIntelligenceStore } from "../../stores/financialIntelligenceStore";
import { useTransactionStore } from "../../stores/transactionStore";

import type {
    Merchant,
    Transaction,
} from "../../types";

type TransactionMerchant =
    NonNullable<Transaction["merchant"]>;

interface EditTransactionDialogProps {
    open: boolean;

    transaction: Transaction | null;

    onClose: () => void;
}

function toMerchant(
    merchant: TransactionMerchant
): Merchant {
    return {
        id: merchant.id,
        user_id: merchant.user_id,
        name: merchant.name,
        normalized_name:
            merchant.normalized_name,
        category_id:
            merchant.category_id ?? "",
        usage_count:
            merchant.usage_count,
        last_seen_at:
            merchant.last_seen_at ?? "",
        created_at: merchant.created_at,
        updated_at: merchant.updated_at,
    };
}

function toDateTimeLocal(value: string) {
    const date = new Date(value);

    date.setMinutes(
        date.getMinutes() -
            date.getTimezoneOffset()
    );

    return date
        .toISOString()
        .slice(0, 16);
}

interface EditTransactionFormProps {
    transaction: Transaction;

    onClose: () => void;
}

function EditTransactionForm({
    transaction,
    onClose,
}: EditTransactionFormProps) {
    const update = useTransactionStore(
        (state) => state.update
    );

    const loading = useTransactionStore(
        (state) => state.loading
    );

    const categories = useCategoryStore(
        (state) => state.categories
    );

    const accounts =
        useFinancialIntelligenceStore(
            (state) =>
                state.data?.accounts ?? []
        );

    const refreshFinancialIntelligence =
        useFinancialIntelligenceStore(
            (state) => state.refresh
        );

    const refreshCategories =
        useCategoryStore(
            (state) => state.refresh
        );

    const [transactionType, setTransactionType] =
        useState<
            | "expense"
            | "income"
            | "refund"
            | "transfer"
        >(
            transaction.transaction_type ===
                "income" ||
                transaction.transaction_type ===
                    "transfer" ||
                transaction.transaction_type ===
                    "refund"
                ? transaction.transaction_type
                : "expense"
        );

    const isTransfer =
        transactionType === "transfer";

    // What the accounting rules would call this row, from its captured
    // direction and parsed intent. Offered as a one-click suggestion —
    // the user decides; nothing is rewritten automatically.
    const eventDirection =
        transaction.event?.direction ?? null;
    const eventMetadata =
        transaction.event?.metadata;
    const metadataIntent =
        typeof eventMetadata === "object" &&
        eventMetadata !== null &&
        !Array.isArray(eventMetadata) &&
        ((
            eventMetadata as Record<
                string,
                unknown
            >
        ).intent === "refund" ||
            (
                eventMetadata as Record<
                    string,
                    unknown
                >
            ).intent === "liability_payment")
            ? ((
                  eventMetadata as Record<
                      string,
                      unknown
                  >
              ).intent as
                  | "liability_payment"
                  | "refund")
            : null;
    const linkedAccount = transaction.account_id
        ? accounts.find(
              (candidate) =>
                  candidate.id ===
                  transaction.account_id
          ) ?? null
        : null;
    const suggestedType = eventDirection
        ? deriveTransactionType({
              accountClass: linkedAccount
                  ? getAccountClass(
                        linkedAccount.account_type
                    )
                  : null,
              direction: eventDirection,
              intent: metadataIntent,
          })
        : null;
    const suggestion =
        suggestedType &&
        suggestedType !==
            transaction.transaction_type &&
        suggestedType !== transactionType
            ? suggestedType
            : null;

    const [merchant, setMerchant] =
        useState<Merchant | null>(() =>
            transaction.merchant
                ? toMerchant(
                      transaction.merchant
                  )
                : null
        );

    const [categoryId, setCategoryId] =
        useState<string | null>(
            transaction.category_id
        );

    const [accountId, setAccountId] =
        useState<string | null>(
            transaction.account_id
        );

    const [amount, setAmount] =
        useState(
            transaction.amount.toString()
        );

    const [occurredAt, setOccurredAt] =
        useState(() =>
            toDateTimeLocal(
                transaction.occurred_at
            )
        );

    const [notes, setNotes] =
        useState(transaction.notes ?? "");

    const [amountError, setAmountError] =
        useState<string | null>(null);

    const [dateError, setDateError] =
        useState<string | null>(null);

    const [formError, setFormError] =
        useState<string | null>(null);

    useEffect(() => {
        refreshCategories();
        refreshFinancialIntelligence();
    }, [
        refreshCategories,
        refreshFinancialIntelligence,
    ]);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setAmountError(null);
        setDateError(null);
        setFormError(null);

        const parsedAmount =
            Number(amount);

        const parsedDate =
            new Date(occurredAt);

        let hasError = false;

        if (
            Number.isNaN(parsedAmount) ||
            parsedAmount <= 0
        ) {
            setAmountError(
                "Enter an amount greater than zero."
            );
            hasError = true;
        }

        if (
            !occurredAt ||
            Number.isNaN(parsedDate.getTime())
        ) {
            setDateError(
                "Enter a valid date and time."
            );
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            await update({
                transactionId:
                    transaction.id,
                eventId:
                    transaction.event_id,
                // Transfers carry no merchant or category by
                // definition.
                merchant: isTransfer
                    ? null
                    : merchant,
                categoryId: isTransfer
                    ? null
                    : categoryId,
                accountId,
                amount: parsedAmount,
                occurredAt:
                    parsedDate.toISOString(),
                notes:
                    notes.trim() || null,
                transactionType,
            });

            onClose();
        } catch {
            setFormError(
                "Unable to update transaction. Please try again."
            );
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            {suggestion ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2.5">
                    <p className="text-sm text-slate-700">
                        The accounting rules read
                        this as a{" "}
                        <strong>
                            {suggestion}
                        </strong>
                        .
                    </p>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                            setTransactionType(
                                suggestion
                            )
                        }
                        className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                        Use suggestion
                    </button>
                </div>
            ) : null}

            <FormField label="Type">
                <select
                    value={transactionType}
                    disabled={loading}
                    onChange={(event) =>
                        setTransactionType(
                            event.target.value as
                                | "expense"
                                | "income"
                                | "refund"
                                | "transfer"
                        )
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                >
                    <option value="expense">
                        Expense
                    </option>
                    <option value="income">
                        Income
                    </option>
                    <option value="transfer">
                        Transfer
                    </option>
                    <option value="refund">
                        Refund
                    </option>
                </select>
            </FormField>

            {!isTransfer ? (
                <>
                    <FormField label="Merchant">
                        <MerchantCombobox
                            value={merchant}
                            onChange={setMerchant}
                            disabled={loading}
                        />
                    </FormField>

                    <FormField label="Category">
                        <CategorySelect
                            value={categoryId}
                            categories={categories}
                            onChange={setCategoryId}
                            disabled={loading}
                        />
                    </FormField>
                </>
            ) : null}

            <FormField label="Account">
                <select
                    value={accountId ?? ""}
                    disabled={loading}
                    onChange={(event) =>
                        setAccountId(
                            event.target.value ||
                                null
                        )
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
                    <option value="">
                        No account
                    </option>
                    {accounts.map((account) => (
                        <option
                            key={account.id}
                            value={account.id}
                        >
                            {account.name}
                        </option>
                    ))}
                </select>
            </FormField>

            <FormField
                label="Amount"
                required
                error={amountError ?? undefined}
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

            <FormField
                label="Date & Time"
                required
                error={dateError ?? undefined}
            >
                <Input
                    type="datetime-local"
                    value={occurredAt}
                    disabled={loading}
                    onChange={(event) =>
                        setOccurredAt(
                            event.target.value
                        )
                    }
                />
            </FormField>

            <FormField label="Notes">
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
                    {loading
                        ? "Saving..."
                        : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}

export function EditTransactionDialog({
    open,
    transaction,
    onClose,
}: EditTransactionDialogProps) {
    if (!transaction) {
        return null;
    }

    return (
        <Dialog
            open={open}
            title="Edit Transaction"
            onClose={onClose}
        >
            <EditTransactionForm
                key={transaction.id}
                transaction={transaction}
                onClose={onClose}
            />
        </Dialog>
    );
}
