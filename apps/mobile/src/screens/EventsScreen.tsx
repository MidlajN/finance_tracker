import { useEffect, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MotiView } from "moti";
import {
  Check,
  ChevronRight,
  Plus,
  ReceiptText,
  Search,
  Store,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CachedMerchant, EventDirection } from "@finance/shared-types";

import { AccountPickerField } from "../components/finance/AccountPicker";
import { CategoryPickerField } from "../components/finance/CategoryPicker";
import { financeStyles } from "../components/finance/financeStyles";
import { SavingOverlay } from "../components/finance/SavingOverlay";
import { SlideToSaveButton } from "../components/finance/SlideToSaveButton";
import { TransactionDateField } from "../components/finance/TransactionDateField";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumTheme } from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";
import {
  getFrequentCategoryIds,
} from "../utils/financeFormat";

type EventsScreenProps = NativeStackScreenProps<RootStackParamList, "Events">;

export function EventsScreen({ navigation }: EventsScreenProps) {
  const accounts = useOfflineStore((state) => state.accounts);
  const categories = useOfflineStore((state) => state.categories);
  const merchants = useOfflineStore((state) => state.merchants);
  const transactions = useOfflineStore((state) => state.transactions);
  const createFinancialEvent = useOfflineStore(
    (state) => state.createFinancialEvent
  );
  const synchronize = useSyncStore((state) => state.synchronize);
  const [merchant, setMerchant] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    null
  );
  const [merchantPickerOpen, setMerchantPickerOpen] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<EventDirection>("debit");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [categoryManuallySelected, setCategoryManuallySelected] =
    useState(false);
  const [occurredAt, setOccurredAt] = useState(() => new Date());
  const [notes, setNotes] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [transactionTypeWidth, setTransactionTypeWidth] = useState(0);
  const savingRef = useRef(false);
  const [transactionTypePosition] = useState(() => new Animated.Value(0));
  const sortedMerchants = useMemo(
    () =>
      merchants
        .slice()
        .sort(
          (first, second) =>
            (second.usage_count ?? 0) - (first.usage_count ?? 0) ||
            first.name.localeCompare(second.name)
        ),
    [merchants]
  );
  const filteredMerchants = useMemo(() => {
    const query = merchantSearch.trim().toLowerCase();

    if (!query) {
      return sortedMerchants.slice(0, 8);
    }

    return sortedMerchants
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [merchantSearch, sortedMerchants]);
  const frequentCategoryIds = useMemo(
    () => getFrequentCategoryIds(transactions),
    [transactions]
  );
  const canUseNewMerchant =
    merchantSearch.trim().length > 0 &&
    !sortedMerchants.some(
      (item) => item.name.toLowerCase() === merchantSearch.trim().toLowerCase()
    );
  const parsedAmount = Number(amount);
  const canSave = Number.isFinite(parsedAmount) && parsedAmount > 0;

  useEffect(() => {
    Animated.timing(transactionTypePosition, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: direction === "credit" ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [direction, transactionTypePosition]);

  function selectMerchant(nextMerchant: CachedMerchant) {
    setMerchant(nextMerchant.name);
    setSelectedMerchantId(nextMerchant.id);
    if (!categoryManuallySelected) {
      setSelectedCategoryId(
        nextMerchant.category_id ?? nextMerchant.category?.id ?? null
      );
    }
    setMerchantSearch("");
    setMerchantPickerOpen(false);
    setError(null);
  }

  function useNewMerchant() {
    const trimmedMerchant = merchantSearch.trim();

    if (!trimmedMerchant) {
      return;
    }

    setMerchant(trimmedMerchant);
    setSelectedMerchantId(null);
    if (!categoryManuallySelected) {
      setSelectedCategoryId(null);
    }
    setMerchantSearch("");
    setMerchantPickerOpen(false);
    setError(null);
  }

  async function handleCreate() {
    if (savingRef.current) {
      return;
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      await createFinancialEvent(
        {
          amount: parsedAmount,
          confidence: 1,
          currency: "INR",
          direction,
          merchant_id: selectedMerchantId,
          merchant_name_raw: merchant.trim() || null,
          metadata: {
            source: "manual",
            account_id: selectedAccountId,
            rule_category_id: selectedCategoryId,
            category_override: categoryManuallySelected,
            account_match: selectedAccountId
              ? {
                  account_id: selectedAccountId,
                  matched_at: new Date().toISOString(),
                  strategy: "manual_entry",
                }
              : null,
          },
          notes: notes.trim() || null,
          occurred_at: occurredAt.toISOString(),
          status: "pending",
        },
        "manual",
        { confirm: true }
      );
      await synchronize();

      setError(null);
      savingRef.current = false;
      // Close the overlay Modal BEFORE navigating: unmounting a screen
      // that still hosts an open Modal intermittently crashes the app on
      // Android during the stack transition.
      setIsSaving(false);
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("Transactions");
        }
      }, 80);
    } catch {
      setError("Unable to save the transaction. Try again.");
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.transactionEntryScreen}
    >
      <ScrollView
        contentContainerStyle={styles.transactionContainer}
        keyboardShouldPersistTaps="handled"
        style={styles.transactionEntryScroll}
      >
        <View
          onLayout={(event) =>
            setTransactionTypeWidth(event.nativeEvent.layout.width)
          }
          style={styles.transactionTypeRow}
        >
          {transactionTypeWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.transactionTypeIndicator,
                {
                  transform: [
                    {
                      translateX: transactionTypePosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, (transactionTypeWidth - 6) / 2],
                      }),
                    },
                  ],
                  width: (transactionTypeWidth - 6) / 2,
                },
              ]}
            />
          ) : null}
          {[
            {
              Icon: TrendingDown,
              label: "Expense",
              value: "debit",
            },
            {
              Icon: TrendingUp,
              label: "Income",
              value: "credit",
            },
          ].map((item) => {
            const active = direction === item.value;
            const TypeIcon = item.Icon;

            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setDirection(item.value as EventDirection);
                }}
                style={styles.transactionTypeButton}
              >
                <TypeIcon
                  color={active ? "#ffffff" : "#64748b"}
                  size={16}
                  strokeWidth={2.6}
                />
                <Text
                  style={[
                    styles.transactionTypeText,
                    active && styles.transactionTypeTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.transactionAmountHero}>
          <Text style={styles.transactionAmountLabel}>
            {direction === "debit" ? "Amount spent" : "Amount received"}
          </Text>
          <View style={styles.transactionAmountRow}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                setAmount(value);
              }}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              style={styles.amountInput}
              value={amount}
            />
          </View>
        </View>

        <View style={styles.transactionSectionDivider} />

        <CategoryPickerField
          categories={categories}
          frequentCategoryIds={frequentCategoryIds}
          onManageCategories={() => navigation.navigate("Categories")}
          onSelect={(categoryId) => {
            setSelectedCategoryId(categoryId);
            setCategoryManuallySelected(true);
          }}
          selectedCategoryId={selectedCategoryId}
        />

        <View style={styles.transactionSectionDivider} />

        <AccountPickerField
          accounts={accounts}
          onAddAccount={() =>
            navigation.navigate("FinancialIntelligence", {
              formIntentId: Date.now(),
              initialResource: "account",
            })
          }
          onSelect={(accountId) => {
            setSelectedAccountId(accountId);
          }}
          selectedAccountId={selectedAccountId}
        />

        <View style={styles.transactionSectionDivider} />

        <View style={styles.transactionSecondarySection}>
          <Pressable
            accessibilityHint="Opens merchant suggestions and search"
            accessibilityRole="button"
            onPress={() => {
              setMerchantSearch("");
              setMerchantPickerOpen(true);
            }}
            style={styles.merchantSelect}
          >
            <View
              style={[
                styles.merchantSelectIcon,
                { backgroundColor: premiumTheme.colors.field },
              ]}
            >
              <Store
                color={premiumTheme.colors.ink}
                size={17}
                strokeWidth={2.4}
              />
            </View>
            <View style={styles.merchantSelectCopy}>
              <Text style={styles.merchantSelectLabel}>Merchant</Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.merchantSelectValue,
                  !merchant && styles.merchantSelectPlaceholder,
                ]}
              >
                {merchant || "Choose or add merchant"}
              </Text>
            </View>
            {selectedMerchantId ? (
              <View style={styles.merchantSelectedBadge}>
                <Check color="#16a34a" size={14} strokeWidth={3} />
              </View>
            ) : null}
            <ChevronRight color="#94a3b8" size={18} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.transactionSecondaryDivider} />

          <TransactionDateField
            grouped
            onSelect={(date) => {
              setOccurredAt(date);
            }}
            value={occurredAt}
          />

          <View style={styles.transactionSecondaryDivider} />

          <Pressable
            accessibilityHint="Shows or hides the note editor"
            accessibilityRole="button"
            onPress={() => setNotesExpanded((current) => !current)}
            style={styles.transactionNoteRow}
          >
            <ReceiptText
              color={notes.trim() ? premiumTheme.colors.ink : "#94a3b8"}
              size={15}
              strokeWidth={2.4}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.transactionNoteRowText,
                notes.trim() && styles.transactionNoteRowTextFilled,
              ]}
            >
              {notes.trim() ? notes.trim().split("\n")[0] : "Add a note"}
            </Text>
            <ChevronRight
              color="#94a3b8"
              size={16}
              strokeWidth={2.5}
              style={{
                transform: [{ rotate: notesExpanded ? "90deg" : "0deg" }],
              }}
            />
          </Pressable>

          {notesExpanded ? (
            <MotiView
              animate={{ opacity: 1, translateY: 0 }}
              from={{ opacity: 0, translateY: -6 }}
              style={styles.transactionInlineNote}
              transition={{
                damping: 18,
                mass: 0.7,
                stiffness: 210,
                type: "spring",
              }}
            >
              <TextInput
                autoFocus
                multiline
                onChangeText={(value) => {
                  setNotes(value);
                }}
                placeholder="Receipt reference or reminder"
                placeholderTextColor="#8b929d"
                style={[styles.transactionInput, styles.notesInput]}
                value={notes}
              />
              <Pressable
                onPress={() => setNotesExpanded(false)}
                style={styles.transactionNoteDoneButton}
              >
                <Check color="#ffffff" size={14} strokeWidth={3} />
                <Text style={styles.transactionNoteDoneButtonText}>Done</Text>
              </Pressable>
            </MotiView>
          ) : null}
        </View>

        {error && <Text style={financeStyles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.transactionSaveDock}>
        <SlideToSaveButton
          disabled={!canSave}
          loading={isSaving}
          onComplete={() => {
            void handleCreate();
          }}
        />
      </View>

      <SavingOverlay
        subtitle="Adding it to your transactions"
        title="Saving transaction"
        visible={isSaving}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setMerchantPickerOpen(false)}
        transparent
        visible={merchantPickerOpen}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            onPress={() => setMerchantPickerOpen(false)}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{
              opacity: 1,
              translateY: 0,
            }}
            from={{
              opacity: 0,
              translateY: 24,
            }}
            style={financeStyles.modalPanel}
            transition={{
              damping: 18,
              mass: 0.8,
              stiffness: 180,
              type: "spring",
            }}
          >
            <View style={styles.merchantPickerContent}>
              <View style={financeStyles.modalHeader}>
                <View style={financeStyles.merchantPickerTitleBlock}>
                  <Text style={financeStyles.merchantPickerTitle}>Choose merchant</Text>
                  <Text style={financeStyles.merchantPickerSubtitle}>
                    Select a saved merchant or enter a new one.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMerchantPickerOpen(false)}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={financeStyles.merchantSearchBar}>
                <Search color="#7b818c" size={18} strokeWidth={2.3} />
                <TextInput
                  autoFocus
                  onChangeText={setMerchantSearch}
                  placeholder="Search or type new merchant"
                  placeholderTextColor="#8b929d"
                  style={financeStyles.merchantSearchInput}
                  value={merchantSearch}
                />
              </View>

              <ScrollView
                contentContainerStyle={styles.merchantPickerList}
                keyboardShouldPersistTaps="handled"
              >
                {filteredMerchants.map((item) => (
                  <MerchantOptionRow
                    key={item.id}
                    merchant={item}
                    onPress={() => selectMerchant(item)}
                    selected={selectedMerchantId === item.id}
                  />
                ))}

                {canUseNewMerchant ? (
                  <Pressable onPress={useNewMerchant} style={styles.newMerchantRow}>
                    <View style={styles.newMerchantIcon}>
                      <Plus color="#0f172a" size={18} strokeWidth={2.8} />
                    </View>
                    <View style={styles.merchantOptionCopy}>
                      <Text style={styles.merchantOptionTitle}>
                        Add "{merchantSearch.trim()}"
                      </Text>
                      <Text style={styles.merchantOptionMeta}>
                        Use as a new merchant for this entry
                      </Text>
                    </View>
                  </Pressable>
                ) : null}

                {filteredMerchants.length === 0 && !canUseNewMerchant ? (
                  <View style={financeStyles.merchantEmptyState}>
                    <Text style={financeStyles.merchantEmptyTitle}>No merchants yet</Text>
                    <Text style={financeStyles.merchantEmptyText}>
                      Type a merchant name to add it to this transaction.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function MerchantOptionRow({
  merchant,
  onPress,
  selected,
}: {
  merchant: CachedMerchant;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.merchantOptionRow,
        selected && styles.merchantOptionRowSelected,
      ]}
    >
      <View style={styles.merchantOptionIcon}>
        <Store color="#0f172a" size={17} strokeWidth={2.4} />
      </View>
      <View style={styles.merchantOptionCopy}>
        <Text numberOfLines={1} style={styles.merchantOptionTitle}>
          {merchant.name}
        </Text>
        <Text numberOfLines={1} style={styles.merchantOptionMeta}>
          {merchant.category?.name ?? "Uncategorized"} · Used{" "}
          {merchant.usage_count ?? 0} times
        </Text>
      </View>
      {selected ? (
        <View style={styles.merchantOptionCheck}>
          <Check color="#ffffff" size={14} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amountInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -0.9,
    minHeight: 52,
    paddingVertical: 0,
  },
  currencyPrefix: {
    color: premiumTheme.colors.secondary,
    fontSize: 21,
    fontWeight: "700",
  },
  merchantOptionCheck: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  merchantOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  merchantOptionIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  merchantOptionMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  merchantOptionRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  merchantOptionRowSelected: {
    backgroundColor: premiumTheme.colors.accentSoft,
  },
  merchantOptionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  merchantPickerContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 28,
  },
  merchantPickerList: {
    gap: 9,
    paddingBottom: 4,
  },
  merchantSelect: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingVertical: 8,
  },
  merchantSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  merchantSelectIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  merchantSelectLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  merchantSelectPlaceholder: {
    color: "#8b929d",
  },
  merchantSelectValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  merchantSelectedBadge: {
    alignItems: "center",
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  newMerchantIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  newMerchantRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.accentSoft,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesInput: {
    minHeight: 84,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  transactionAmountHero: {
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#101828",
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  transactionAmountLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  transactionAmountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  transactionContainer: {
    backgroundColor: "#ffffff",
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  transactionEntryScreen: {
    backgroundColor: "#ffffff",
    flex: 1,
  },
  transactionEntryScroll: {
    backgroundColor: "#ffffff",
    flex: 1,
  },
  transactionInlineNote: {
    gap: 10,
    paddingBottom: 14,
    paddingTop: 2,
  },
  transactionNoteRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingVertical: 4,
  },
  transactionNoteRowText: {
    color: "#8b929d",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  transactionNoteRowTextFilled: {
    color: premiumTheme.colors.ink,
    fontWeight: "700",
  },
  transactionNoteDoneButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 15,
  },
  transactionNoteDoneButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  transactionInput: {
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  transactionSaveDock: {
    backgroundColor: "#ffffff",
    borderTopColor: "#f0f1f3",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: "#0f172a",
    shadowOffset: {
      height: -6,
      width: 0,
    },
    shadowOpacity: 0.035,
    shadowRadius: 16,
  },
  transactionSecondaryDivider: {
    backgroundColor: "#e9ebef",
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  transactionSecondarySection: {
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    shadowColor: "#101828",
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  transactionSectionDivider: {
    backgroundColor: premiumTheme.colors.divider,
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  transactionSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  transactionTypeButton: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 42,
    zIndex: 1,
  },
  transactionTypeIndicator: {
    backgroundColor: "#0f172a",
    borderRadius: 11,
    bottom: 3,
    left: 3,
    position: "absolute",
    top: 3,
  },
  transactionTypeRow: {
    backgroundColor: "#f2f3f5",
    borderRadius: 15,
    flexDirection: "row",
    marginBottom: 1,
    minHeight: 48,
    padding: 3,
  },
  transactionTypeText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  transactionTypeTextActive: {
    color: "#ffffff",
  },
});
