import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from "react";
import {
    Loader2,
    Plus,
} from "lucide-react";

import { MerchantRepository } from "../../repositories/MerchantRepository";
import type { Merchant } from "../../types";
import {
    cn,
    normalizeMerchantName,
} from "../../utils/helpers";

import { Button } from "./Button";
import { Input } from "./Input";

type MerchantRecord = Awaited<
    ReturnType<typeof MerchantRepository.create>
>;

interface MerchantComboboxProps {
    value: Merchant | null;

    onChange: (merchant: Merchant | null) => void;

    placeholder?: string;

    disabled?: boolean;
}

function toMerchant(
    merchant: MerchantRecord
): Merchant {
    return {
        id: merchant.id,
        user_id: merchant.user_id,
        name: merchant.name,
        normalized_name: merchant.normalized_name,
        category_id: merchant.category_id ?? "",
        usage_count: merchant.usage_count,
        last_seen_at: merchant.last_seen_at ?? "",
        created_at: merchant.created_at,
        updated_at: merchant.updated_at,
    };
}

export function MerchantCombobox({
    value,
    onChange,
    placeholder = "Search merchant...",
    disabled = false,
}: MerchantComboboxProps) {
    const rootRef =
        useRef<HTMLDivElement | null>(null);

    const [query, setQuery] =
        useState("");

    const [open, setOpen] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [creating, setCreating] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [merchants, setMerchants] =
        useState<Merchant[]>([]);

    const trimmedQuery = query.trim();

    const inputValue = open
        ? query
        : value?.name ?? "";

    const normalizedQuery =
        normalizeMerchantName(trimmedQuery);

    const hasExactNormalizedMatch =
        Boolean(normalizedQuery) &&
        merchants.some(
            (merchant) =>
                merchant.normalized_name ===
                normalizedQuery
        );

    const showCreateOption =
        Boolean(normalizedQuery) &&
        !hasExactNormalizedMatch &&
        !loading;

    useEffect(() => {
        if (!open || disabled) {
            return;
        }

        function handleMouseDown(
            event: MouseEvent
        ) {
            if (
                rootRef.current &&
                !rootRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleMouseDown
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleMouseDown
            );
        };
    }, [disabled, open]);

    useEffect(() => {
        if (!open || disabled) {
            return;
        }

        const searchQuery = trimmedQuery;

        if (!searchQuery) {
            return;
        }

        let cancelled = false;

        const timeoutId = window.setTimeout(
            () => {
                setLoading(true);
                setError(null);

                MerchantRepository.search(
                    searchQuery
                )
                    .then((results) => {
                        if (!cancelled) {
                            setMerchants(results);
                        }
                    })
                    .catch(() => {
                        if (!cancelled) {
                            setMerchants([]);
                            setError(
                                "Unable to search merchants. Please try again."
                            );
                        }
                    })
                    .finally(() => {
                        if (!cancelled) {
                            setLoading(false);
                        }
                    });
            },
            250
        );

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [
        disabled,
        open,
        trimmedQuery,
    ]);

    function selectMerchant(
        merchant: Merchant
    ) {
        setQuery(merchant.name);
        setOpen(false);
        setError(null);
        onChange(merchant);
    }

    function handleInputChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const nextQuery = event.target.value;

        setQuery(nextQuery);
        setOpen(true);
        setError(null);

        if (!nextQuery.trim()) {
            setMerchants([]);
            onChange(null);
            return;
        }

        if (
            value &&
            normalizeMerchantName(nextQuery) !==
                value.normalized_name
        ) {
            onChange(null);
        }
    }

    async function handleCreate() {
        if (
            creating ||
            disabled ||
            !trimmedQuery ||
            !normalizedQuery
        ) {
            return;
        }

        setCreating(true);
        setError(null);

        try {
            const existing =
                await MerchantRepository.findByNormalizedName(
                    normalizedQuery
                );

            if (existing) {
                selectMerchant(
                    toMerchant(existing)
                );
                return;
            }

            const created =
                await MerchantRepository.create({
                    name: trimmedQuery,
                    normalized_name:
                        normalizedQuery,
                });

            selectMerchant(
                toMerchant(created)
            );
        } catch {
            try {
                const existing =
                    await MerchantRepository.findByNormalizedName(
                        normalizedQuery
                    );

                if (existing) {
                    selectMerchant(
                        toMerchant(existing)
                    );
                    return;
                }
            } catch {
                // Keep the user-facing message below generic.
            }

            setError(
                "Unable to create merchant. Please try again."
            );
        } finally {
            setCreating(false);
        }
    }

    return (
        <div
            ref={rootRef}
            className="relative"
        >
            <Input
                value={inputValue}
                placeholder={placeholder}
                disabled={disabled}
                onFocus={() => {
                    if (!disabled) {
                        setQuery(
                            value?.name ?? ""
                        );
                        setOpen(true);
                    }
                }}
                onChange={handleInputChange}
            />

            {open && !disabled && (
                <div
                    className={cn(
                        "absolute",
                        "left-0",
                        "right-0",
                        "top-full",
                        "z-30",
                        "mt-2",
                        "max-h-72",
                        "overflow-y-auto",
                        "rounded-xl",
                        "border",
                        "border-slate-200",
                        "bg-white",
                        "py-2",
                        "shadow-lg"
                    )}
                >
                    {loading && (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                            Searching merchants...
                        </div>
                    )}

                    {!loading &&
                        trimmedQuery &&
                        merchants.map(
                            (merchant) => (
                                <button
                                    key={merchant.id}
                                    type="button"
                                    className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"
                                    onClick={() =>
                                        selectMerchant(
                                            merchant
                                        )
                                    }
                                >
                                    <span className="block font-medium text-slate-900">
                                        {merchant.name}
                                    </span>

                                    <span className="mt-1 block text-xs text-slate-500">
                                        Used{" "}
                                        {
                                            merchant.usage_count
                                        }{" "}
                                        times
                                    </span>
                                </button>
                            )
                        )}

                    {showCreateOption && (
                        <div className="border-t border-slate-100 px-2 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={
                                    creating
                                }
                                className="w-full justify-start gap-2 px-2 py-2"
                                onClick={
                                    handleCreate
                                }
                            >
                                {creating ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Plus
                                        size={16}
                                    />
                                )}
                                Create "
                                {trimmedQuery}"
                            </Button>
                        </div>
                    )}

                    {!loading &&
                        !showCreateOption &&
                        merchants.length === 0 &&
                        trimmedQuery && (
                            <p className="px-4 py-3 text-sm text-slate-500">
                                No merchants found.
                            </p>
                        )}

                    {!trimmedQuery && (
                        <p className="px-4 py-3 text-sm text-slate-500">
                            Start typing to search
                            merchants.
                        </p>
                    )}

                    {error && (
                        <p className="border-t border-slate-100 px-4 py-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
