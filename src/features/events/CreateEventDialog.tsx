import { useState, type FormEvent } from "react";

import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { FormField } from "../../components/common/FormField";
import { Input } from "../../components/common/Input";

import { useEventStore } from "../../stores/eventStore";

interface CreateEventDialogProps {
    open: boolean;
    onClose: () => void;
}

export function CreateEventDialog({
    open,
    onClose,
}: CreateEventDialogProps) {
    const create = useEventStore(
        (state) => state.create
    );

    const loading = useEventStore(
        (state) => state.loading
    );

    const [amount, setAmount] =
        useState("");

    const [merchant, setMerchant] =
        useState("");

    const [direction, setDirection] =
        useState<"debit" | "credit">(
            "debit"
        );

    const [occurredAt, setOccurredAt] =
        useState(() => {
            const now = new Date();

            now.setMinutes(
                now.getMinutes() -
                    now.getTimezoneOffset()
            );

            return now
                .toISOString()
                .slice(0, 16);
        });

    const [notes, setNotes] =
        useState("");

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const parsedAmount =
            Number(amount);

        if (
            Number.isNaN(parsedAmount) ||
            parsedAmount <= 0
        ) {
            return;
        }

        await create({
            amount: parsedAmount,
            confidence: 1,
            currency: "INR",
            direction,
            merchant_id: null,
            merchant_name_raw:
                merchant.trim() || null,
            metadata: {},
            notes:
                notes.trim() || null,
            occurred_at: new Date(
                occurredAt
            ).toISOString(),
            status: "pending",
        });

        setAmount("");
        setMerchant("");
        setNotes("");
        setDirection("debit");

        onClose();
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="New Financial Event"
        >
            <form
                onSubmit={handleSubmit}
                className="space-y-5"
            >
                <FormField
                    label="Amount"
                    required
                >
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) =>
                            setAmount(
                                e.target.value
                            )
                        }
                    />
                </FormField>

                <FormField
                    label="Merchant"
                    required
                >
                    <Input
                        value={merchant}
                        onChange={(e) =>
                            setMerchant(
                                e.target.value
                            )
                        }
                    />
                </FormField>

                <FormField
                    label="Direction"
                    required
                >
                    <select
                        value={direction}
                        onChange={(e) =>
                            setDirection(
                                e.target
                                    .value as
                                    | "debit"
                                    | "credit"
                            )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="debit">
                            Expense
                        </option>

                        <option value="credit">
                            Income
                        </option>
                    </select>
                </FormField>

                <FormField
                    label="Date & Time"
                    required
                >
                    <Input
                        type="datetime-local"
                        value={occurredAt}
                        onChange={(e) =>
                            setOccurredAt(
                                e.target.value
                            )
                        }
                    />
                </FormField>

                <FormField label="Notes">
                    <Input
                        value={notes}
                        onChange={(e) =>
                            setNotes(
                                e.target.value
                            )
                        }
                    />
                </FormField>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        Create Event
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}