import { useState } from "react";
import { MotiView } from "moti";
import { Pencil, Trash2, X } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  CachedAccount,
  CachedCategory,
  CachedTransaction,
} from "@finance/shared-types";
import type { TransactionUpdates } from "@finance/shared-api";

import { premiumTheme } from "../../theme/premiumTheme";
import { formatTransactionDate } from "../../utils/financeFormat";
import { AccountPickerField } from "./AccountPicker";
import { CategoryPickerField } from "./CategoryPicker";
import { DangerConfirmModal } from "./DangerConfirmModal";
import { financeStyles } from "./financeStyles";
import { TransactionDateField } from "./TransactionDateField";

export function TransactionEditModal({
  accounts,
  categories,
  frequentCategoryIds,
  onAddAccount,
  onClose,
  onDelete,
  onManageCategories,
  onSave,
  transaction,
}: {
  accounts: CachedAccount[];
  categories: CachedCategory[];
  frequentCategoryIds: string[];
  onAddAccount: () => void;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onManageCategories: () => void;
  onSave: (updates: TransactionUpdates) => Promise<void>;
  transaction: CachedTransaction;
}) {
  const [mode, setMode] = useState<"edit" | "view">("view");
  const [amount, setAmount] = useState(`${transaction.amount}`);
  const [transactionType, setTransactionType] = useState(
    transaction.transaction_type
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    transaction.category_id ?? null
  );
  const [accountId, setAccountId] = useState<string | null>(
    transaction.account_id ?? null
  );
  const [occurredAt, setOccurredAt] = useState(
    () => new Date(transaction.occurred_at)
  );
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const parsedAmount = Number(amount);
  const canSave =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && !busy;

  async function handleSave() {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setBusy(true);

    try {
      const updates: TransactionUpdates = {};

      if (parsedAmount !== transaction.amount) {
        updates.amount = parsedAmount;
      }

      if (transactionType !== transaction.transaction_type) {
        updates.transaction_type = transactionType;
      }

      if (categoryId !== transaction.category_id) {
        updates.category_id = categoryId;
      }

      if (accountId !== transaction.account_id) {
        updates.account_id = accountId;
      }

      if (occurredAt.toISOString() !== transaction.occurred_at) {
        updates.occurred_at = occurredAt.toISOString();
      }

      if ((notes.trim() || null) !== (transaction.notes ?? null)) {
        updates.notes = notes.trim() || null;
      }

      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }

      onClose();
    } catch {
      setError("Unable to update the transaction. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    setDeleteConfirmVisible(true);
  }

  function handleConfirmedDelete() {
    setBusy(true);
    onDelete()
      .then(() => {
        setDeleteConfirmVisible(false);
        onClose();
      })
      .catch(() => {
        setDeleteConfirmVisible(false);
        setError("Unable to delete the transaction. Try again.");
      })
      .finally(() => setBusy(false));
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <KeyboardAvoidingView
        behavior="padding"
        style={financeStyles.modalBackdrop}
      >
        <Pressable onPress={onClose} style={financeStyles.modalDismissLayer} />
        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 24 }}
          style={financeStyles.modalPanel}
          transition={{
            damping: 18,
            mass: 0.8,
            stiffness: 180,
            type: "spring",
          }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={financeStyles.modalHeader}>
              <View style={financeStyles.merchantPickerTitleBlock}>
                <Text style={financeStyles.merchantPickerTitle}>
                  {mode === "view" ? "Transaction" : "Edit transaction"}
                </Text>
                <Text style={financeStyles.merchantPickerSubtitle}>
                  {transaction.merchant?.name ??
                    transaction.event?.merchant_name_raw ??
                    "Manual entry"}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={financeStyles.modalCloseButton}
              >
                <X color="#0f172a" size={20} strokeWidth={2.4} />
              </Pressable>
            </View>

            {mode === "view" ? (
              <>
                <View style={styles.viewAmountBlock}>
                  <Text
                    style={[
                      styles.viewAmount,
                      transaction.transaction_type === "income" &&
                        styles.viewAmountIncome,
                    ]}
                  >
                    {transaction.transaction_type === "expense" ? "-" : ""}₹
                    {transaction.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.viewType}>
                    {transaction.transaction_type === "income"
                      ? "Income"
                      : "Expense"}
                  </Text>
                </View>

                <View style={styles.viewDetails}>
                  <ViewDetailRow
                    label="Category"
                    value={transaction.category?.name ?? "Uncategorized"}
                  />
                  <ViewDetailRow
                    label="Account"
                    value={
                      accounts.find(
                        (account) => account.id === transaction.account_id
                      )?.name ?? "Unassigned"
                    }
                  />
                  <ViewDetailRow
                    label="Date"
                    value={formatTransactionDate(
                      new Date(transaction.occurred_at)
                    )}
                  />
                  {transaction.notes ? (
                    <ViewDetailRow label="Notes" value={transaction.notes} />
                  ) : null}
                  <ViewDetailRow
                    label="Source"
                    value={
                      transaction.event?.source === "manual"
                        ? "Added manually"
                        : "Captured automatically"
                    }
                  />
                </View>

                {error ? (
                  <Text style={financeStyles.error}>{error}</Text>
                ) : null}

                <Pressable
                  onPress={() => setMode("edit")}
                  style={styles.saveButton}
                >
                  <Pencil color="#ffffff" size={15} strokeWidth={2.4} />
                  <Text style={styles.saveButtonText}>Edit transaction</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={confirmDelete}
                  style={styles.deleteRow}
                >
                  <Trash2 color="#dc2626" size={16} strokeWidth={2.4} />
                  <Text style={styles.deleteText}>Delete transaction</Text>
                </Pressable>
              </>
            ) : null}

            {mode === "edit" ? (
              <View style={styles.typeRow}>
                {(["expense", "income"] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setTransactionType(option)}
                    style={[
                      styles.typeButton,
                      transactionType === option && styles.typeButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        transactionType === option && styles.typeTextActive,
                      ]}
                    >
                      {option === "expense" ? "Expense" : "Income"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {mode === "edit" ? (
              <>
                <View style={styles.amountField}>
                  <Text style={styles.amountCurrency}>₹</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={(value) => {
                      setAmount(value);
                      setError(null);
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#9aa0aa"
                    style={styles.amountInput}
                    value={amount}
                  />
                </View>

                <TransactionDateField
                  onSelect={setOccurredAt}
                  value={occurredAt}
                />

                <CategoryPickerField
                  categories={categories}
                  frequentCategoryIds={frequentCategoryIds}
                  onManageCategories={onManageCategories}
                  onSelect={setCategoryId}
                  selectedCategoryId={categoryId}
                />

                <AccountPickerField
                  accounts={accounts}
                  onAddAccount={onAddAccount}
                  onSelect={setAccountId}
                  selectedAccountId={accountId}
                />

                <TextInput
                  multiline
                  onChangeText={setNotes}
                  placeholder="Notes"
                  placeholderTextColor="#9aa0aa"
                  style={styles.notesInput}
                  value={notes}
                />

                {error ? (
                  <Text style={financeStyles.error}>{error}</Text>
                ) : null}

                <Pressable
                  disabled={!canSave}
                  onPress={() => void handleSave()}
                  style={[
                    styles.saveButton,
                    !canSave && styles.saveButtonDisabled,
                  ]}
                >
                  <Text style={styles.saveButtonText}>
                    {busy ? "Saving..." : "Save changes"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => setMode("view")}
                  style={styles.cancelRow}
                >
                  <Text style={styles.cancelText}>Back to details</Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </MotiView>

        <DangerConfirmModal
          busy={busy}
          message="This removes the transaction and its captured event everywhere. This cannot be undone."
          onCancel={() => setDeleteConfirmVisible(false)}
          onConfirm={handleConfirmedDelete}
          title="Delete transaction?"
          visible={deleteConfirmVisible}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ViewDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.viewDetailRow}>
      <Text style={styles.viewDetailLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.viewDetailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amountCurrency: {
    color: premiumTheme.colors.secondary,
    fontSize: 22,
    fontWeight: "700",
  },
  amountField: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    minHeight: 62,
    paddingHorizontal: 16,
  },
  amountInput: {
    color: premiumTheme.colors.ink,
    flex: 1,
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 28,
  },
  deleteRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
  },
  deleteText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "700",
  },
  notesInput: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    color: premiumTheme.colors.ink,
    fontSize: 14,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  cancelRow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  cancelText: {
    color: premiumTheme.colors.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  typeButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
  },
  typeButtonActive: {
    backgroundColor: "#ffffff",
    ...premiumTheme.shadow.soft,
  },
  typeRow: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  typeText: {
    color: premiumTheme.colors.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  typeTextActive: {
    color: premiumTheme.colors.ink,
    fontWeight: "700",
  },
  viewAmount: {
    color: premiumTheme.colors.ink,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  viewAmountBlock: {
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
  },
  viewAmountIncome: {
    color: "#16a34a",
  },
  viewDetailLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  viewDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    minHeight: 44,
  },
  viewDetails: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  viewDetailValue: {
    color: premiumTheme.colors.ink,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  viewType: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
