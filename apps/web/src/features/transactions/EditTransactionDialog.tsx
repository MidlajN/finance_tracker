import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import { Button } from "../../components/common/Button";
import { CategorySelect } from "../../components/common/CategorySelect";
import { Dialog } from "../../components/common/Dialog";
import { FormField } from "../../components/common/FormField";
import { Input } from "../../components/common/Input";
import { MerchantCombobox } from "../../components/common/MerchantCombobox";

import { useCategoryStore } from "../../stores/categoryStore";
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

    const refreshCategories =
        useCategoryStore(
            (state) => state.refresh
        );

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
    }, [refreshCategories]);

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
                merchant,
                categoryId,
                amount: parsedAmount,
                occurredAt:
                    parsedDate.toISOString(),
                notes:
                    notes.trim() || null,
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
