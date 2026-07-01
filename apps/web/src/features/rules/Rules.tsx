import {
    useEffect,
    useState,
    type FormEvent,
} from "react";
import {
    AlertCircle,
    Plus,
    RefreshCw,
    SlidersHorizontal,
    Trash2,
} from "lucide-react";

import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { CategorySelect } from "../../components/common/CategorySelect";
import { Dialog } from "../../components/common/Dialog";
import { EmptyState } from "../../components/common/EmptyState";
import { FormField } from "../../components/common/FormField";
import { Input } from "../../components/common/Input";
import { List } from "../../components/common/List";
import { ListItem } from "../../components/common/ListItem";
import { MerchantCombobox } from "../../components/common/MerchantCombobox";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { Surface } from "../../components/common/Surface";

import { useCategoryStore } from "../../stores/categoryStore";
import { useRuleStore } from "../../stores/ruleStore";

import type {
    Merchant,
} from "../../types";
import type { RuleMatchOperator } from "../../services/RuleEngineService";

type Rule = ReturnType<
    typeof useRuleStore.getState
>["rules"][number];

type RuleMerchant =
    NonNullable<Rule["merchant"]>;

const MATCH_OPERATORS: {
    value: RuleMatchOperator;
    label: string;
}[] = [
    {
        value: "equals",
        label: "Merchant equals",
    },
    {
        value: "contains",
        label: "Merchant contains",
    },
    {
        value: "starts_with",
        label: "Merchant starts with",
    },
    {
        value: "ends_with",
        label: "Merchant ends with",
    },
    {
        value: "regex",
        label: "Regular expression",
    },
];

function toMerchant(
    merchant: RuleMerchant
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

function getOperatorLabel(
    operator: string
) {
    return (
        MATCH_OPERATORS.find(
            (item) =>
                item.value === operator
        )?.label ?? operator
    );
}

interface RuleFormProps {
    rule: Rule | null;

    onClose: () => void;
}

function RuleForm({
    rule,
    onClose,
}: RuleFormProps) {
    const create = useRuleStore(
        (state) => state.create
    );

    const update = useRuleStore(
        (state) => state.update
    );

    const loading = useRuleStore(
        (state) => state.loading
    );

    const categories = useCategoryStore(
        (state) => state.categories
    );

    const [name, setName] =
        useState(rule?.name ?? "");

    const [priority, setPriority] =
        useState(
            (rule?.priority ?? 100).toString()
        );

    const [enabled, setEnabled] =
        useState(rule?.enabled ?? true);

    const [autoConfirm, setAutoConfirm] =
        useState(rule?.auto_confirm ?? false);

    const [matchOperator, setMatchOperator] =
        useState<RuleMatchOperator>(
            (rule?.match_operator as RuleMatchOperator) ??
                "contains"
        );

    const [matchValue, setMatchValue] =
        useState(rule?.match_value ?? "");

    const [merchant, setMerchant] =
        useState<Merchant | null>(
            rule?.merchant
                ? toMerchant(rule.merchant)
                : null
        );

    const [categoryId, setCategoryId] =
        useState<string | null>(
            rule?.category_id ?? null
        );

    const [formError, setFormError] =
        useState<string | null>(null);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setFormError(null);

        const parsedPriority =
            Number(priority);

        if (!name.trim()) {
            setFormError(
                "Rule name is required."
            );
            return;
        }

        if (!matchValue.trim()) {
            setFormError(
                "Match value is required."
            );
            return;
        }

        if (
            Number.isNaN(parsedPriority) ||
            !Number.isInteger(parsedPriority)
        ) {
            setFormError(
                "Priority must be a whole number."
            );
            return;
        }

        if (!merchant && !categoryId) {
            setFormError(
                "Select a merchant or category action."
            );
            return;
        }

        try {
            const payload = {
                name,
                priority: parsedPriority,
                enabled,
                auto_confirm:
                    autoConfirm,
                match_operator:
                    matchOperator,
                match_value:
                    matchValue,
                merchant_id:
                    merchant?.id ?? null,
                category_id:
                    categoryId,
            };

            if (rule) {
                await update(
                    rule.id,
                    payload
                );
            } else {
                await create(payload);
            }

            onClose();
        } catch {
            setFormError(
                "Unable to save rule. Please try again."
            );
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
                <FormField
                    label="Name"
                    required
                >
                    <Input
                        value={name}
                        disabled={loading}
                        onChange={(event) =>
                            setName(
                                event.target.value
                            )
                        }
                    />
                </FormField>

                <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                    <FormField
                        label="Matcher"
                        required
                    >
                        <select
                            value={
                                matchOperator
                            }
                            disabled={loading}
                            onChange={(event) =>
                                setMatchOperator(
                                    event
                                        .target
                                        .value as RuleMatchOperator
                                )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {MATCH_OPERATORS.map(
                                (operator) => (
                                    <option
                                        key={
                                            operator.value
                                        }
                                        value={
                                            operator.value
                                        }
                                    >
                                        {
                                            operator.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </FormField>

                    <FormField
                        label="Priority"
                        required
                    >
                        <Input
                            type="number"
                            step="1"
                            value={priority}
                            disabled={loading}
                            onChange={(
                                event
                            ) =>
                                setPriority(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    </FormField>
                </div>

                <FormField
                    label="Match value"
                    required
                >
                    <Input
                        value={matchValue}
                        disabled={loading}
                        onChange={(event) =>
                            setMatchValue(
                                event.target.value
                            )
                        }
                    />
                </FormField>

                <FormField label="Assign merchant">
                    <MerchantCombobox
                        value={merchant}
                        onChange={setMerchant}
                        disabled={loading}
                    />
                </FormField>

                <FormField label="Assign category">
                    <CategorySelect
                        value={categoryId}
                        categories={categories}
                        onChange={setCategoryId}
                        disabled={loading}
                    />
                </FormField>

                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                        type="checkbox"
                        checked={enabled}
                        disabled={loading}
                        onChange={(event) =>
                            setEnabled(
                                event.target.checked
                            )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    Rule enabled
                </label>

                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                        type="checkbox"
                        checked={autoConfirm}
                        disabled={loading}
                        onChange={(event) =>
                            setAutoConfirm(
                                event.target.checked
                            )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    Auto-confirm matching events
                </label>

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
                            : "Save Rule"}
                    </Button>
                </div>
        </form>
    );
}

export function Rules() {
    const [dialogOpen, setDialogOpen] =
        useState(false);

    const [selectedRule, setSelectedRule] =
        useState<Rule | null>(null);

    const refreshRules = useRuleStore(
        (state) => state.refresh
    );

    const rules = useRuleStore(
        (state) => state.rules
    );

    const loading = useRuleStore(
        (state) => state.loading
    );

    const error = useRuleStore(
        (state) => state.error
    );

    const clearError = useRuleStore(
        (state) => state.clearError
    );

    const updateRule = useRuleStore(
        (state) => state.update
    );

    const deleteRule = useRuleStore(
        (state) => state.delete
    );

    const refreshCategories =
        useCategoryStore(
            (state) => state.refresh
        );

    useEffect(() => {
        refreshRules();
        refreshCategories();
    }, [
        refreshCategories,
        refreshRules,
    ]);

    function handleCreate() {
        setSelectedRule(null);
        setDialogOpen(true);
    }

    function handleEdit(rule: Rule) {
        setSelectedRule(rule);
        setDialogOpen(true);
    }

    const refreshIconClassName = loading
        ? "mr-2 animate-spin"
        : "mr-2";

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Rules"
                description="Create deterministic rules that enrich financial events before review."
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleCreate}
                        >
                            <Plus
                                size={16}
                                className="mr-2"
                            />
                            New Rule
                        </Button>

                        <Button
                            variant="secondary"
                            disabled={loading}
                            onClick={refreshRules}
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

            <Section
                title="Rule Order"
                description="Lower priority numbers run first. The first matching rule enriches the event."
            >
                {loading && rules.length === 0 ? (
                    <Surface className="flex min-h-72 items-center justify-center p-8">
                        <div className="flex flex-col items-center gap-4 text-sm text-slate-500">
                            <RefreshCw
                                size={28}
                                className="animate-spin text-blue-600"
                            />
                            Loading rules...
                        </div>
                    </Surface>
                ) : rules.length === 0 ? (
                    <Surface>
                        <EmptyState
                            title="No rules"
                            description="Create a rule to automatically assign merchants or categories to matching financial events."
                        />
                    </Surface>
                ) : (
                    <List>
                        {rules.map((rule) => (
                            <ListItem
                                key={rule.id}
                                title={rule.name}
                                subtitle={`${getOperatorLabel(rule.match_operator)} "${rule.match_value}"`}
                                icon={
                                    <SlidersHorizontal
                                        size={18}
                                        className="text-slate-400"
                                    />
                                }
                                right={
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <Badge
                                            variant={
                                                rule.enabled
                                                    ? "success"
                                                    : "default"
                                            }
                                        >
                                            {rule.enabled
                                                ? "enabled"
                                                : "disabled"}
                                        </Badge>

                                        <Badge>
                                            Priority{" "}
                                            {
                                                rule.priority
                                            }
                                        </Badge>

                                        {rule.merchant && (
                                            <Badge>
                                                {
                                                    rule
                                                        .merchant
                                                        .name
                                                }
                                            </Badge>
                                        )}

                                        {rule.category && (
                                            <Badge>
                                                {
                                                    rule
                                                        .category
                                                        .name
                                                }
                                            </Badge>
                                        )}

                                        {rule.auto_confirm && (
                                            <Badge variant="warning">
                                                auto-confirm
                                            </Badge>
                                        )}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            disabled={
                                                loading
                                            }
                                            onClick={async (
                                                event
                                            ) => {
                                                event.stopPropagation();
                                                try {
                                                    await updateRule(
                                                        rule.id,
                                                        {
                                                            enabled:
                                                                !rule.enabled,
                                                        }
                                                    );
                                                } catch {
                                                    // Store exposes the friendly error message.
                                                }
                                            }}
                                        >
                                            {rule.enabled
                                                ? "Disable"
                                                : "Enable"}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="danger"
                                            disabled={
                                                loading
                                            }
                                            onClick={async (
                                                event
                                            ) => {
                                                event.stopPropagation();
                                                try {
                                                    await deleteRule(
                                                        rule.id
                                                    );
                                                } catch {
                                                    // Store exposes the friendly error message.
                                                }
                                            }}
                                            className="px-3"
                                        >
                                            <Trash2
                                                size={16}
                                            />
                                        </Button>
                                    </div>
                                }
                                onClick={() =>
                                    handleEdit(rule)
                                }
                            />
                        ))}
                    </List>
                )}
            </Section>

            <Dialog
                open={dialogOpen}
                title={
                    selectedRule
                        ? "Edit Rule"
                        : "New Rule"
                }
                onClose={() =>
                    setDialogOpen(false)
                }
            >
                <RuleForm
                    key={
                        selectedRule?.id ??
                        "new"
                    }
                    rule={selectedRule}
                    onClose={() =>
                        setDialogOpen(false)
                    }
                />
            </Dialog>
        </PageContainer>
    );
}
