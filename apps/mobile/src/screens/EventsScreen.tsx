import { useEffect, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MotiView } from "moti";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
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
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  CachedAccount,
  CachedMerchant,
  EventDirection,
} from "@finance/shared-types";

import { AccountPickerField } from "../components/finance/AccountPicker";
import { CategoryPickerField } from "../components/finance/CategoryPicker";
import { financeStyles } from "../components/finance/financeStyles";
import { SavingOverlay } from "../components/finance/SavingOverlay";
import { SlideToSaveButton } from "../components/finance/SlideToSaveButton";
import { TransactionDateField } from "../components/finance/TransactionDateField";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import {
  premiumHairline,
  premiumSurface,
  premiumTheme,
} from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";
import { getFrequentCategoryIds } from "../utils/financeFormat";

type EventsScreenProps = NativeStackScreenProps<RootStackParamList, "Events">;

// Animated.View is not NativeWind-interop'd, so the type-toggle indicator
// keeps a plain style object.
const transactionTypeIndicatorStyle = {
  backgroundColor: "#0f172a",
  borderRadius: 11,
  bottom: 3,
  left: 3,
  position: "absolute",
  top: 3,
} as const;

// MotiView is not NativeWind-interop'd, so the inline note keeps a plain
// style object.
const transactionInlineNoteStyle = {
  gap: 10,
  paddingBottom: 14,
  paddingTop: 2,
} as const;

// The dock's upward shadow has no theme token; it stays a style object
// combined with className.
const saveDockShadowStyle = {
  shadowColor: "#0f172a",
  shadowOffset: {
    height: -6,
    width: 0,
  },
  shadowOpacity: 0.035,
  shadowRadius: 16,
} as const;

// Hairline heights have no spacing class (only border widths do).
const hairlineHeightStyle = {
  height: premiumHairline,
} as const;

// MotiView is not NativeWind-interop'd, so the transfer account dropdown
// keeps a plain style object — same recipe as the Transactions screen's
// date-range menu.
const transferAccountMenuStyle = {
  backgroundColor: "#ffffff",
  borderRadius: 18,
  padding: 6,
  position: "absolute",
  ...premiumSurface,
  ...premiumTheme.shadow.raised,
} as const;

export function EventsScreen({ navigation }: EventsScreenProps) {
  const accounts = useOfflineStore((state) => state.accounts);
  const categories = useOfflineStore((state) => state.categories);
  const merchants = useOfflineStore((state) => state.merchants);
  const transactions = useOfflineStore((state) => state.transactions);
  const createFinancialEvent = useOfflineStore(
    (state) => state.createFinancialEvent
  );
  const createMerchant = useOfflineStore((state) => state.createMerchant);
  const synchronize = useSyncStore((state) => state.synchronize);
  const [merchant, setMerchant] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    null
  );
  const [merchantPickerOpen, setMerchantPickerOpen] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [entryType, setEntryType] = useState<
    "expense" | "income" | "transfer"
  >("expense");
  // Manual transfers speak source -> destination; on save each chosen
  // side becomes its own single-account leg (debit from, credit to),
  // matching the engine's one-leg-per-observation model.
  const [transferFromAccountId, setTransferFromAccountId] = useState<
    string | null
  >(null);
  const [transferToAccountId, setTransferToAccountId] = useState<
    string | null
  >(null);
  const direction: EventDirection =
    entryType === "income" ? "credit" : "debit";
  const isTransfer = entryType === "transfer";
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
  const merchantSearchInputRef = useRef<TextInput>(null);
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
      toValue:
        entryType === "expense" ? 0 : entryType === "income" ? 1 : 2,
      useNativeDriver: true,
    }).start();
  }, [entryType, transactionTypePosition]);

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

    // A transfer needs at least one tracked side, and moving money from
    // an account to itself is meaningless.
    if (isTransfer && !transferFromAccountId && !transferToAccountId) {
      setError("Choose at least one account for this transfer.");
      return;
    }

    if (
      isTransfer &&
      transferFromAccountId &&
      transferFromAccountId === transferToAccountId
    ) {
      setError("Pick two different accounts.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      // "Add as new merchant" picked in the picker: create the real
      // merchant entity first so the transaction links to it — a bare
      // merchant_name_raw would leave it unregistered (absent from the
      // Merchants screen, rules, and future picker suggestions).
      // Transfers carry no merchant or category by definition.
      let merchantId = isTransfer ? null : selectedMerchantId;
      const merchantName = isTransfer ? "" : merchant.trim();

      if (!merchantId && merchantName) {
        merchantId = (
          await createMerchant({
            category_id: selectedCategoryId,
            name: merchantName,
          })
        ).id;
      }

      // A manual transfer is entered as source -> destination but stored
      // as up to two single-account legs (debit out of the source,
      // credit into the destination) — the same shape captures produce,
      // so the engine needs no special case.
      const entries: { accountId: string | null; legDirection: EventDirection }[] =
        isTransfer
          ? [
              {
                accountId: transferFromAccountId,
                legDirection: "debit" as const,
              },
              {
                accountId: transferToAccountId,
                legDirection: "credit" as const,
              },
            ].filter((leg) => leg.accountId)
          : [{ accountId: selectedAccountId, legDirection: direction }];

      for (const entry of entries) {
        await createFinancialEvent(
          {
            amount: parsedAmount,
            confidence: 1,
            currency: "INR",
            direction: entry.legDirection,
            merchant_id: merchantId,
            merchant_name_raw: merchantName || null,
            metadata: {
              source: "manual",
              account_id: entry.accountId,
              rule_category_id: isTransfer ? null : selectedCategoryId,
              category_override: categoryManuallySelected,
              // Materialization (local mirror and server RPC) maps the
              // confirmed event to this type instead of deriving it
              // from the direction.
              transaction_type_override: isTransfer ? "transfer" : null,
              account_match: entry.accountId
                ? {
                    account_id: entry.accountId,
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
      }

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
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="bg-white px-5 pb-7 pt-3"
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="mb-px min-h-12 flex-row rounded-[15px] bg-[#f2f3f5] p-[3px]"
          onLayout={(event) =>
            setTransactionTypeWidth(event.nativeEvent.layout.width)
          }
        >
          {transactionTypeWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                transactionTypeIndicatorStyle,
                {
                  transform: [
                    {
                      translateX: transactionTypePosition.interpolate({
                        inputRange: [0, 2],
                        outputRange: [
                          0,
                          ((transactionTypeWidth - 6) * 2) / 3,
                        ],
                      }),
                    },
                  ],
                  width: (transactionTypeWidth - 6) / 3,
                },
              ]}
            />
          ) : null}
          {(
            [
              {
                Icon: TrendingDown,
                label: "Expense",
                value: "expense",
              },
              {
                Icon: TrendingUp,
                label: "Income",
                value: "income",
              },
              {
                Icon: ArrowLeftRight,
                label: "Transfer",
                value: "transfer",
              },
            ] as const
          ).map((item) => {
            const active = entryType === item.value;
            const TypeIcon = item.Icon;

            return (
              <Pressable
                className="z-[1] min-h-[42px] flex-1 flex-row items-center justify-center gap-1.5 rounded-[11px]"
                key={item.value}
                onPress={() => {
                  setEntryType(item.value);
                }}
              >
                <TypeIcon
                  color={active ? "#ffffff" : "#64748b"}
                  size={16}
                  strokeWidth={2.6}
                />
                <Text
                  className={`text-[12px] font-bold ${
                    active ? "text-white" : "text-[#334155]"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>


        <View
          className="mt-4 rounded-section border border-border bg-white px-[18px] py-4"
          style={premiumTheme.shadow.soft}
        >
          <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-secondary">
            {isTransfer
              ? "Amount transferred"
              : direction === "debit"
                ? "Amount spent"
                : "Amount received"}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <Text className="text-[21px] font-bold text-secondary">₹</Text>
            <TextInput
              autoFocus
              className="min-h-[52px] flex-1 py-0 text-[34px] font-extrabold tracking-[-0.9px] text-ink tabular-nums"
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                setAmount(value);
              }}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              value={amount}
            />
          </View>
        </View>

        {!isTransfer ? (
          <>
            <View
              className="my-[18px] bg-divider"
              style={hairlineHeightStyle}
            />

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
          </>
        ) : null}

        <View className="my-[18px] bg-divider" style={hairlineHeightStyle} />

        {isTransfer ? (
          <>
            <View className="flex-row gap-2.5">
              <TransferAccountDropdown
                accounts={accounts}
                excludeAccountId={transferToAccountId}
                label="From"
                onSelect={setTransferFromAccountId}
                selectedAccountId={transferFromAccountId}
              />
              <TransferAccountDropdown
                accounts={accounts}
                excludeAccountId={transferFromAccountId}
                label="To"
                onSelect={setTransferToAccountId}
                selectedAccountId={transferToAccountId}
              />
            </View>

            <Text className="mt-2 text-[12px] font-semibold text-secondary">
              Leave a side as "Not tracked" when that account is outside
              this app.
            </Text>
          </>
        ) : (
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
        )}

        <View className="my-[18px] bg-divider" style={hairlineHeightStyle} />

        <View
          className="rounded-section border border-border bg-white px-3.5"
          style={premiumTheme.shadow.soft}
        >
          {!isTransfer ? (
          <Pressable
            accessibilityHint="Opens merchant suggestions and search"
            accessibilityRole="button"
            className="min-h-[56px] flex-row items-center gap-2.5 py-2"
            onPress={() => {
              setMerchantSearch("");
              setMerchantPickerOpen(true);
            }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-field">
              <Store
                color={premiumTheme.colors.ink}
                size={17}
                strokeWidth={2.4}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-secondary">
                Merchant
              </Text>
              <Text
                className={`mt-[3px] text-[14px] font-bold ${
                  merchant ? "text-ink" : "text-[#8b929d]"
                }`}
                numberOfLines={1}
              >
                {merchant || "Choose or add merchant"}
              </Text>
            </View>
            {selectedMerchantId ? (
              <View className="h-6 w-6 items-center justify-center rounded-xl bg-[#dcfce7]">
                <Check color="#16a34a" size={14} strokeWidth={3} />
              </View>
            ) : null}
            <ChevronRight color="#94a3b8" size={18} strokeWidth={2.5} />
          </Pressable>
          ) : null}

          {!isTransfer ? (
            <View className="ml-11 bg-[#e9ebef]" style={hairlineHeightStyle} />
          ) : null}

          <TransactionDateField
            grouped
            onSelect={(date) => {
              setOccurredAt(date);
            }}
            value={occurredAt}
          />

          <View className="ml-11 bg-[#e9ebef]" style={hairlineHeightStyle} />

          <Pressable
            accessibilityHint="Shows or hides the note editor"
            accessibilityRole="button"
            className="min-h-11 flex-row items-center gap-2 py-1"
            onPress={() => setNotesExpanded((current) => !current)}
          >
            <ReceiptText
              color={notes.trim() ? premiumTheme.colors.ink : "#94a3b8"}
              size={15}
              strokeWidth={2.4}
            />
            <Text
              className={`flex-1 text-[13px] ${
                notes.trim()
                  ? "font-bold text-ink"
                  : "font-semibold text-[#8b929d]"
              }`}
              numberOfLines={1}
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
              style={transactionInlineNoteStyle}
              transition={{
                damping: 18,
                mass: 0.7,
                stiffness: 210,
                type: "spring",
              }}
            >
              <TextInput
                autoFocus
                className="min-h-[84px] rounded-2xl bg-field px-3.5 pt-3.5 text-[14px] font-bold text-ink"
                multiline
                onChangeText={(value) => {
                  setNotes(value);
                }}
                placeholder="Receipt reference or reminder"
                placeholderTextColor="#8b929d"
                style={{ textAlignVertical: "top" }}
                value={notes}
              />
              <Pressable
                className="min-h-[34px] flex-row items-center gap-1.5 self-end rounded-full bg-ink px-[15px]"
                onPress={() => setNotesExpanded(false)}
              >
                <Check color="#ffffff" size={14} strokeWidth={3} />
                <Text className="text-[12px] font-extrabold text-white">
                  Done
                </Text>
              </Pressable>
            </MotiView>
          ) : null}
        </View>

        {error && <Text style={financeStyles.error}>{error}</Text>}
      </ScrollView>

      <View
        className="border-t-hairline border-t-[#f0f1f3] bg-white px-4 pb-3 pt-2.5"
        style={saveDockShadowStyle}
      >
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
        // autoFocus on the TextInput races the modal window on Android —
        // the keyboard opens, then snaps shut when the window attaches.
        // onShow fires after the window owns focus, so focusing here
        // keeps the keyboard up.
        onShow={() => merchantSearchInputRef.current?.focus()}
        transparent
        visible={merchantPickerOpen}
      >
        <KeyboardAvoidingView
          // Android modal windows already resize for the keyboard;
          // "padding" on top of that double-shifts the panel.
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
            <View className="gap-3.5 p-[18px] pb-7">
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
                  onChangeText={setMerchantSearch}
                  placeholder="Search or type new merchant"
                  placeholderTextColor="#8b929d"
                  ref={merchantSearchInputRef}
                  style={financeStyles.merchantSearchInput}
                  value={merchantSearch}
                />
              </View>

              <ScrollView
                contentContainerClassName="gap-[9px] pb-1"
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
                  <Pressable
                    className="min-h-16 flex-row items-center gap-3 rounded-[18px] bg-accent-soft px-3 py-2.5"
                    onPress={useNewMerchant}
                  >
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-[15px] bg-[#f1f5f9]">
                      <Plus color="#0f172a" size={18} strokeWidth={2.8} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[14px] font-black text-ink">
                        Add "{merchantSearch.trim()}"
                      </Text>
                      <Text className="mt-[3px] text-[12px] font-bold text-secondary">
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
      className={`min-h-16 flex-row items-center gap-3 rounded-[18px] px-3 py-2.5 ${
        selected ? "bg-accent-soft" : "bg-field"
      }`}
      onPress={onPress}
    >
      <View className="h-[38px] w-[38px] items-center justify-center rounded-[15px] bg-[#f1f5f9]">
        <Store color="#0f172a" size={17} strokeWidth={2.4} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-black text-ink" numberOfLines={1}>
          {merchant.name}
        </Text>
        <Text
          className="mt-[3px] text-[12px] font-bold text-secondary"
          numberOfLines={1}
        >
          {merchant.category?.name ?? "Uncategorized"} · Used{" "}
          {merchant.usage_count ?? 0} times
        </Text>
      </View>
      {selected ? (
        <View className="h-[26px] w-[26px] items-center justify-center rounded-[13px] bg-success">
          <Check color="#ffffff" size={14} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}


// One side of a manual transfer: a compact select that opens a floating
// dropdown anchored under the trigger — same pattern as the date-range
// filter on the Transactions screen, no bottom sheet.
function TransferAccountDropdown({
  accounts,
  excludeAccountId,
  label,
  onSelect,
  selectedAccountId,
}: {
  accounts: CachedAccount[];
  excludeAccountId: string | null;
  label: string;
  onSelect: (accountId: string | null) => void;
  selectedAccountId: string | null;
}) {
  const [menuAnchor, setMenuAnchor] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<View>(null);
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );
  const options = accounts.filter(
    (account) =>
      (!account.archived || account.id === selectedAccountId) &&
      account.id !== excludeAccountId
  );

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({
        left: x,
        top: y + height + 6,
        width,
      });
    });
  }

  function select(accountId: string | null) {
    setMenuAnchor(null);
    onSelect(accountId);
  }

  return (
    <>
      <Pressable
        accessibilityHint={`Chooses the ${label.toLowerCase()} account`}
        accessibilityRole="button"
        className="min-h-[54px] flex-1 flex-row items-center gap-2 rounded-control bg-field px-3"
        onPress={openMenu}
        ref={triggerRef}
      >
        <View className="min-w-0 flex-1">
          <Text className="text-[9.5px] font-bold uppercase tracking-[0.8px] text-secondary">
            {label}
          </Text>
          <Text
            className={`mt-[2px] text-[13.5px] font-bold ${
              selectedAccount ? "text-ink" : "text-[#8b929d]"
            }`}
            numberOfLines={1}
          >
            {selectedAccount?.name ?? "Not tracked"}
          </Text>
        </View>
        <ChevronDown
          color={premiumTheme.colors.muted}
          size={15}
          strokeWidth={2.5}
        />
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={() => setMenuAnchor(null)}
        transparent
        visible={menuAnchor !== null}
      >
        <Pressable className="flex-1" onPress={() => setMenuAnchor(null)}>
          {menuAnchor ? (
            <MotiView
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              from={{ opacity: 0, scale: 0.96, translateY: -6 }}
              style={[
                transferAccountMenuStyle,
                {
                  left: menuAnchor.left,
                  top: menuAnchor.top,
                  width: menuAnchor.width,
                },
              ]}
              transition={{
                damping: 20,
                mass: 0.6,
                stiffness: 260,
                type: "spring",
              }}
            >
              <Text className="mb-1 mt-1.5 px-2.5 text-[10.5px] font-extrabold uppercase tracking-[1px] text-muted">
                {label} account
              </Text>
              <ScrollView className="max-h-[264px]">
                <TransferAccountMenuRow
                  name="Not tracked"
                  onPress={() => select(null)}
                  selected={!selectedAccountId}
                />
                {options.map((account) => (
                  <TransferAccountMenuRow
                    key={account.id}
                    name={account.name}
                    onPress={() => select(account.id)}
                    selected={selectedAccountId === account.id}
                  />
                ))}
              </ScrollView>
            </MotiView>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

function TransferAccountMenuRow({
  name,
  onPress,
  selected,
}: {
  name: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      className={`min-h-[42px] flex-row items-center justify-between gap-2.5 rounded-xl px-2.5 active:bg-field ${
        selected ? "bg-field" : ""
      }`}
      onPress={onPress}
    >
      <Text
        className={`flex-1 text-[13px] leading-[18px] text-ink ${
          selected ? "font-bold" : "font-semibold"
        }`}
        numberOfLines={1}
      >
        {name}
      </Text>
      {selected ? (
        <Check color={premiumTheme.colors.ink} size={15} strokeWidth={2.8} />
      ) : null}
    </Pressable>
  );
}
