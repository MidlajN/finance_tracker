import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MotiView } from "moti";
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Car,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CreditCard,
  Film,
  Fuel,
  HeartPulse,
  IndianRupee,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Store,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  X,
} from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import type { DimensionValue, TextInputProps } from "react-native";
import { LineChart } from "react-native-chart-kit";
import Svg, { Circle } from "react-native-svg";

import type {
  AccountLike,
  AnalyticsGroup,
  AnalyticsTrendPoint,
  AccountType,
  AssetLike,
  AssetType,
  CachedAccount,
  CachedAsset,
  CachedCategory,
  CachedFinancialEvent,
  CachedGoal,
  CachedInvestment,
  CachedLiability,
  CachedLoan,
  CachedMerchant,
  EventDirection,
  GoalLike,
  GoalStatus,
  InvestmentLike,
  Json,
  LiabilityLike,
  LiabilityType,
  LoanLike,
  LoanType,
  TransactionType,
  CachedTransaction,
} from "@finance/shared-types";
import { normalizeMerchantName } from "@finance/shared-utils";

import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import type {
  FinancialIntelligenceResource,
  RootStackParamList,
} from "../types/navigation";

type TransactionsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Transactions"
>;
type EventReviewScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "EventReview"
>;
type EventsScreenProps = NativeStackScreenProps<RootStackParamList, "Events">;

type TransactionFilter = "all" | "income" | "expense" | "transfer";
type AnalyticsRange = "month" | "3m" | "6m" | "all";

type FinanceScreenIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

const analyticsRangeOptions = [
  {
    label: "Month",
    value: "month",
  },
  {
    label: "3M",
    value: "3m",
  },
  {
    label: "6M",
    value: "6m",
  },
  {
    label: "All",
    value: "all",
  },
] satisfies {
  label: string;
  value: AnalyticsRange;
}[];

export function EventsScreen({ navigation }: EventsScreenProps) {
  const accounts = useOfflineStore((state) => state.accounts);
  const merchants = useOfflineStore((state) => state.merchants);
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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
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
  const canUseNewMerchant =
    merchantSearch.trim().length > 0 &&
    !sortedMerchants.some(
      (item) => item.name.toLowerCase() === merchantSearch.trim().toLowerCase()
    );

  function selectMerchant(nextMerchant: CachedMerchant) {
    setMerchant(nextMerchant.name);
    setSelectedMerchantId(nextMerchant.id);
    setMerchantSearch("");
    setMerchantPickerOpen(false);
    setError(null);
    setSaved(false);
  }

  function useNewMerchant() {
    const trimmedMerchant = merchantSearch.trim();

    if (!trimmedMerchant) {
      return;
    }

    setMerchant(trimmedMerchant);
    setSelectedMerchantId(null);
    setMerchantSearch("");
    setMerchantPickerOpen(false);
    setError(null);
    setSaved(false);
  }

  async function handleCreate() {
    if (savingRef.current) {
      return;
    }

    const parsedAmount = Number(amount);

    if (!merchant.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a merchant and a valid amount.");
      setSaved(false);
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
          merchant_name_raw: merchant.trim(),
          metadata: {
            source: "manual",
            account_id: selectedAccountId,
            account_match: selectedAccountId
              ? {
                  account_id: selectedAccountId,
                  matched_at: new Date().toISOString(),
                  strategy: "manual_entry",
                }
              : null,
          },
          notes: notes.trim() || null,
          occurred_at: new Date().toISOString(),
          status: "pending",
        },
        "manual"
      );
      await synchronize();

      setMerchant("");
      setSelectedMerchantId(null);
      setSelectedAccountId(null);
      setAmount("");
      setNotes("");
      setError(null);
      setSaved(true);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.transactionContainer}>
        <View style={styles.transactionHero}>
          <Text style={styles.transactionKicker}>Manual entry</Text>
          <Text style={styles.transactionTitle}>Add transaction</Text>
          <Text style={styles.transactionSubtitle}>
            Save a clean financial event for the engine to process.
          </Text>
        </View>

        <View style={styles.transactionCard}>
          <View style={styles.transactionCardHeader}>
            <View>
              <Text style={styles.transactionCardTitle}>Details</Text>
              <Text style={styles.transactionCardSubtitle}>
                Merchant, account, amount, and direction
              </Text>
            </View>
            <View style={styles.transactionCardIcon}>
              <Store color="#0f172a" size={18} strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.transactionTypeRow}>
            {[
              {
                label: "Expense",
                value: "debit",
              },
              {
                label: "Income",
                value: "credit",
              },
            ].map((item) => (
              <Pressable
                key={item.value}
                onPress={() => {
                  setDirection(item.value as EventDirection);
                  setSaved(false);
                }}
                style={[
                  styles.transactionTypeButton,
                  direction === item.value && styles.transactionTypeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.transactionTypeText,
                    direction === item.value &&
                      styles.transactionTypeTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => {
              setMerchantSearch("");
              setMerchantPickerOpen(true);
            }}
            style={styles.merchantSelect}
          >
            <View style={styles.merchantSelectIcon}>
              <Store color="#0f172a" size={18} strokeWidth={2.4} />
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
            <Plus color="#0f172a" size={19} strokeWidth={2.7} />
          </Pressable>

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
              setSaved(false);
            }}
            selectedAccountId={selectedAccountId}
          />

          <View style={styles.amountInputWrap}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                setAmount(value);
                setSaved(false);
              }}
              placeholder="0.00"
              placeholderTextColor="#8b929d"
              style={styles.amountInput}
              value={amount}
            />
          </View>

          <TextInput
            multiline
            onChangeText={(value) => {
              setNotes(value);
              setSaved(false);
            }}
            placeholder="Notes (optional)"
            placeholderTextColor="#8b929d"
            style={[styles.transactionInput, styles.notesInput]}
            value={notes}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {saved && (
            <Text style={styles.successText}>Transaction saved for processing.</Text>
          )}

          <Pressable
            disabled={isSaving}
            onPress={handleCreate}
            style={[
              styles.transactionSaveButton,
              isSaving && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.transactionSaveButtonText}>
              {isSaving ? "Saving..." : "Save transaction"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setMerchantPickerOpen(false)}
        transparent
        visible={merchantPickerOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            onPress={() => setMerchantPickerOpen(false)}
            style={styles.modalDismissLayer}
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
            style={styles.modalPanel}
            transition={{
              damping: 18,
              mass: 0.8,
              stiffness: 180,
              type: "spring",
            }}
          >
            <View style={styles.merchantPickerContent}>
              <View style={styles.modalHeader}>
                <View style={styles.merchantPickerTitleBlock}>
                  <Text style={styles.merchantPickerTitle}>Choose merchant</Text>
                  <Text style={styles.merchantPickerSubtitle}>
                    Select a saved merchant or enter a new one.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMerchantPickerOpen(false)}
                  style={styles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={styles.merchantSearchBar}>
                <Search color="#7b818c" size={18} strokeWidth={2.3} />
                <TextInput
                  autoFocus
                  onChangeText={setMerchantSearch}
                  placeholder="Search or type new merchant"
                  placeholderTextColor="#8b929d"
                  style={styles.merchantSearchInput}
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
                  <View style={styles.merchantEmptyState}>
                    <Text style={styles.merchantEmptyTitle}>No merchants yet</Text>
                    <Text style={styles.merchantEmptyText}>
                      Type a merchant name to add it to this transaction.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </MotiView>
        </View>
      </Modal>
    </>
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

function AccountPickerField({
  accounts,
  onAddAccount,
  onSelect,
  selectedAccountId,
}: {
  accounts: CachedAccount[];
  onAddAccount: () => void;
  onSelect: (accountId: string | null) => void;
  selectedAccountId: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );
  const availableAccounts = accounts
    .filter(
      (account) => !account.archived || account.id === selectedAccountId
    )
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name));
  const visual = selectedAccount
    ? getAccountTypeVisual(selectedAccount.account_type)
    : {
        background: "#f1f5f9",
        color: "#64748b",
        Icon: ArrowLeftRight,
      };
  const Icon = visual.Icon;

  function select(accountId: string | null) {
    setVisible(false);
    onSelect(accountId);
  }

  return (
    <>
      <Pressable
        accessibilityHint="Opens the account picker"
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={styles.accountSelect}
      >
        <View
          style={[
            styles.accountSelectIcon,
            {
              backgroundColor: visual.background,
            },
          ]}
        >
          <Icon color={visual.color} size={18} strokeWidth={2.5} />
        </View>
        <View style={styles.accountSelectCopy}>
          <Text style={styles.accountSelectLabel}>Account</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.accountSelectValue,
              !selectedAccount && styles.accountSelectPlaceholder,
            ]}
          >
            {selectedAccount?.name ?? "Unassigned"}
          </Text>
          <Text numberOfLines={1} style={styles.accountSelectMeta}>
            {selectedAccount
              ? formatAccountDescription(selectedAccount)
              : availableAccounts.length > 0
                ? "Choose where this transaction belongs"
                : "Add an account to track its balance"}
          </Text>
        </View>
        <ChevronRight color="#64748b" size={20} strokeWidth={2.4} />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            onPress={() => setVisible(false)}
            style={styles.modalDismissLayer}
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
            style={styles.modalPanel}
            transition={{
              damping: 18,
              mass: 0.8,
              stiffness: 180,
              type: "spring",
            }}
          >
            <View style={styles.accountPickerContent}>
              <View style={styles.modalHeader}>
                <View style={styles.accountPickerTitleBlock}>
                  <Text style={styles.accountPickerTitle}>Choose account</Text>
                  <Text style={styles.accountPickerSubtitle}>
                    Select the account whose balance should include this
                    transaction.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.accountPickerList}
                keyboardShouldPersistTaps="handled"
                style={styles.accountPickerListViewport}
              >
                <AccountOptionRow
                  account={null}
                  onPress={() => select(null)}
                  selected={!selectedAccountId}
                />
                {availableAccounts.map((account) => (
                  <AccountOptionRow
                    account={account}
                    key={account.id}
                    onPress={() => select(account.id)}
                    selected={selectedAccountId === account.id}
                  />
                ))}
              </ScrollView>

              <Pressable
                onPress={() => {
                  setVisible(false);
                  onAddAccount();
                }}
                style={styles.accountPickerAddButton}
              >
                <Plus color="#ffffff" size={18} strokeWidth={2.7} />
                <Text style={styles.accountPickerAddButtonText}>
                  Add new account
                </Text>
              </Pressable>
            </View>
          </MotiView>
        </View>
      </Modal>
    </>
  );
}

function AccountOptionRow({
  account,
  onPress,
  selected,
}: {
  account: CachedAccount | null;
  onPress: () => void;
  selected: boolean;
}) {
  const visual = account
    ? getAccountTypeVisual(account.account_type)
    : {
        background: "#f1f5f9",
        color: "#64748b",
        Icon: ArrowLeftRight,
      };
  const Icon = visual.Icon;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.accountOptionRow,
        selected && styles.accountOptionRowSelected,
      ]}
    >
      <View
        style={[
          styles.accountOptionIcon,
          {
            backgroundColor: visual.background,
          },
        ]}
      >
        <Icon color={visual.color} size={18} strokeWidth={2.5} />
      </View>
      <View style={styles.accountOptionCopy}>
        <Text numberOfLines={1} style={styles.accountOptionTitle}>
          {account?.name ?? "Unassigned"}
        </Text>
        <Text numberOfLines={1} style={styles.accountOptionMeta}>
          {account
            ? formatAccountDescription(account)
            : "Do not update an account balance"}
        </Text>
      </View>
      {selected ? (
        <View style={styles.accountOptionCheck}>
          <Check color="#ffffff" size={14} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

function formatAccountDescription(account: CachedAccount) {
  return [
    titleCase(account.account_type),
    account.institution,
    account.currency,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function EventReviewScreen({
  navigation,
  route,
}: EventReviewScreenProps) {
  const events = useOfflineStore((state) => state.events);
  const accounts = useOfflineStore((state) => state.accounts);
  const categories = useOfflineStore((state) => state.categories);
  const updateFinancialEvent = useOfflineStore(
    (state) => state.updateFinancialEvent
  );
  const confirmFinancialEvent = useOfflineStore(
    (state) => state.confirmFinancialEvent
  );
  const ignoreFinancialEvent = useOfflineStore(
    (state) => state.ignoreFinancialEvent
  );
  const synchronize = useSyncStore((state) => state.synchronize);
  const event = events.find((item) => item.id === route.params.eventId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | null | undefined
  >(
    undefined
  );
  const [selectedAccountId, setSelectedAccountId] = useState<
    string | null | undefined
  >(undefined);
  const activeCategoryId =
    selectedCategoryId === undefined
      ? getEventRuleCategoryId(event?.metadata)
      : selectedCategoryId;
  const activeAccountId =
    selectedAccountId === undefined
      ? getEventAccountId(event?.metadata)
      : selectedAccountId;
  const selectedAccount = accounts.find(
    (account) => account.id === activeAccountId
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (event && event.status !== "pending") {
      navigation.popTo("Transactions");
    }
  }, [event, navigation]);

  async function handleCategory(categoryId: string | null) {
    if (!event) {
      return;
    }

    setSelectedCategoryId(categoryId);
    setError(null);
    await updateFinancialEvent(event.id, {
      metadata: {
        ...getJsonObject(event.metadata),
        rule_category_id: categoryId,
      },
    });
  }

  async function handleAccount(accountId: string | null) {
    if (!event) {
      return;
    }

    setSelectedAccountId(accountId);
    setError(null);
    await updateFinancialEvent(event.id, {
      metadata: {
        ...getJsonObject(event.metadata),
        account_id: accountId,
        account_match: accountId
          ? {
              account_id: accountId,
              matched_at: new Date().toISOString(),
              strategy: "manual_review",
            }
          : null,
      },
    });
  }

  async function handleConfirm() {
    if (!event || event.status !== "pending" || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await confirmFinancialEvent(event.id);
      await synchronize();
      navigation.popTo("Transactions");
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to confirm this event."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleIgnore() {
    if (!event || event.status !== "pending" || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await ignoreFinancialEvent(event.id);
      await synchronize();
      navigation.popTo("Transactions");
    } catch (ignoreError) {
      setError(
        ignoreError instanceof Error
          ? ignoreError.message
          : "Unable to ignore this event."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!event) {
    return (
      <View style={styles.eventReviewContainer}>
        <View style={styles.eventReviewCard}>
          <Text style={styles.eventReviewTitle}>Event not found</Text>
          <Text style={styles.eventReviewSubtitle}>
            This notification may have already been processed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.eventReviewContainer}>
      <View style={styles.transactionHero}>
        <Text style={styles.transactionKicker}>Review event</Text>
        <Text style={styles.transactionTitle}>Confirm transaction</Text>
        <Text style={styles.transactionSubtitle}>
          Check the account and category before adding this transaction.
        </Text>
      </View>

      <View style={styles.eventReviewSummaryCard}>
        <View style={styles.eventReviewIcon}>
          <Store color="#0f172a" size={20} strokeWidth={2.6} />
        </View>
        <View style={styles.eventReviewSummaryCopy}>
          <Text numberOfLines={1} style={styles.eventReviewMerchant}>
            {event.merchant_name_raw ?? "Unknown merchant"}
          </Text>
          <Text style={styles.eventReviewMeta}>
            {event.direction === "credit" ? "Income" : "Expense"} ·{" "}
            {new Date(event.occurred_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.eventReviewAccountMeta,
              !selectedAccount && styles.eventReviewAccountMetaEmpty,
            ]}
          >
            Account · {selectedAccount?.name ?? "Unassigned"}
          </Text>
        </View>
        <Text style={styles.eventReviewAmount}>
          {MobileDashboardService.getFormattedBalance(event.amount)}
        </Text>
      </View>

      <View style={styles.eventReviewCard}>
        <Text style={styles.eventReviewSectionTitle}>Account</Text>
        <Text style={styles.eventReviewSubtitle}>
          Choose where the money was spent or received. You can override the
          detected account.
        </Text>

        <AccountPickerField
          accounts={accounts}
          onAddAccount={() =>
            navigation.navigate("FinancialIntelligence", {
              formIntentId: Date.now(),
              initialResource: "account",
            })
          }
          onSelect={(accountId) => {
            void handleAccount(accountId);
          }}
          selectedAccountId={activeAccountId}
        />
      </View>

      <View style={styles.eventReviewCard}>
        <Text style={styles.eventReviewSectionTitle}>Category</Text>
        <Text style={styles.eventReviewSubtitle}>
          This category will be used when the event is confirmed.
        </Text>

        <View style={styles.eventReviewCategoryGrid}>
          <Pressable
            onPress={() => {
              void handleCategory(null);
            }}
            style={[
              styles.eventReviewCategoryPill,
              !activeCategoryId && styles.eventReviewCategoryPillActive,
            ]}
          >
            <Text
              style={[
                styles.eventReviewCategoryText,
                !activeCategoryId && styles.eventReviewCategoryTextActive,
              ]}
            >
              Uncategorized
            </Text>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => {
                void handleCategory(category.id);
              }}
              style={[
                styles.eventReviewCategoryPill,
                activeCategoryId === category.id &&
                  styles.eventReviewCategoryPillActive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.eventReviewCategoryText,
                  activeCategoryId === category.id &&
                    styles.eventReviewCategoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.eventReviewActions}>
          <Pressable
            disabled={isSaving}
            onPress={handleIgnore}
            style={[
              styles.eventReviewSecondaryButton,
              isSaving && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.eventReviewSecondaryButtonText}>Ignore</Text>
          </Pressable>
          <Pressable
            disabled={isSaving}
            onPress={handleConfirm}
            style={[
              styles.eventReviewPrimaryButton,
              isSaving && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.eventReviewPrimaryButtonText}>
              {isSaving ? "Saving..." : "Confirm"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export function TransactionsScreen({ navigation }: TransactionsScreenProps) {
  const accounts = useOfflineStore((state) => state.accounts);
  const events = useOfflineStore((state) => state.events);
  const transactions = useOfflineStore((state) => state.transactions);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const accountNamesById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  );
  const pendingEvents = useMemo(
    () =>
      events
        .filter((event) => event.status === "pending")
        .slice()
        .sort(
          (first, second) =>
            new Date(second.occurred_at).getTime() -
            new Date(first.occurred_at).getTime()
        ),
    [events]
  );
  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesFilter =
          filter === "all" || transaction.transaction_type === filter;

        if (!matchesFilter) return false;
        if (!normalizedQuery) return true;

        const searchableText = [
          transaction.merchant?.name,
          transaction.event?.merchant_name_raw,
          transaction.category?.name,
          transaction.account_id
            ? accountNamesById.get(transaction.account_id)
            : null,
          transaction.transaction_type,
          transaction.amount.toString(),
          new Date(transaction.occurred_at).toLocaleDateString("en-IN"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      }),
    [accountNamesById, filter, searchQuery, transactions]
  );
  const groupedTransactions = useMemo(
    () => groupTransactionsByRecency(filteredTransactions),
    [filteredTransactions]
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.transactionsListContainer}
        style={styles.screenScroll}
      >
        <View style={styles.transactionSearchBar}>
          <Search color="#7b818c" size={22} strokeWidth={2.2} />
          <TextInput
            onChangeText={setSearchQuery}
            placeholder="Search transactions"
            placeholderTextColor="#9aa0aa"
            style={styles.transactionSearchInput}
            value={searchQuery}
          />
        </View>

        <View style={styles.transactionFilterBar}>
          {(["all", "income", "expense", "transfer"] as const).map(
            (item) => (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[
                  styles.transactionFilterButton,
                  filter === item && styles.transactionFilterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.transactionFilterText,
                    filter === item && styles.transactionFilterTextActive,
                  ]}
                >
                  {titleCase(item)}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {pendingEvents.length > 0 ? (
          <View style={styles.pendingReviewSection}>
            <View style={styles.pendingReviewHeader}>
              <View>
                <Text style={styles.pendingReviewTitle}>Pending reviews</Text>
                <Text style={styles.pendingReviewSubtitle}>
                  Confirm, correct, or ignore captured transactions.
                </Text>
              </View>
              <View style={styles.pendingReviewCount}>
                <Text style={styles.pendingReviewCountText}>
                  {pendingEvents.length}
                </Text>
              </View>
            </View>

            <View style={styles.pendingReviewCard}>
              {pendingEvents.map((event, index) => {
                const accountId = getEventAccountId(event.metadata);

                return (
                  <PendingEventRow
                    accountName={
                      accountId
                        ? accountNamesById.get(accountId) ?? null
                        : null
                    }
                    event={event}
                    key={event.id}
                    onPress={() =>
                      navigation.navigate("EventReview", {
                        eventId: event.id,
                      })
                    }
                    showDivider={index < pendingEvents.length - 1}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {groupedTransactions.map((group) => (
          <View key={group.label} style={styles.transactionGroup}>
            <Text style={styles.transactionGroupTitle}>{group.label}</Text>
            <View style={styles.transactionGroupCard}>
              {group.transactions.map((transaction, index) => (
                <TransactionListRow
                  accountName={
                    transaction.account_id
                      ? accountNamesById.get(transaction.account_id) ?? null
                      : null
                  }
                  key={transaction.id}
                  amount={transaction.amount}
                  categoryName={transaction.category?.name ?? "Uncategorized"}
                  occurredAt={transaction.occurred_at}
                  showDivider={index < group.transactions.length - 1}
                  transaction={transaction}
                  type={transaction.transaction_type}
                />
              ))}
            </View>
          </View>
        ))}

        {groupedTransactions.length === 0 && pendingEvents.length === 0 && (
          <View style={styles.transactionsEmptyCard}>
            <Text style={styles.transactionsEmptyTitle}>
              {searchQuery.trim() ? "No matching transactions" : "No transactions yet"}
            </Text>
            <Text style={styles.transactionsEmptyText}>
              {searchQuery.trim()
                ? "Try a different merchant, category, amount, or date."
                : "Add your first transaction to see it here."}
            </Text>
          </View>
        )}

        <Text style={styles.transactionsEndText}>No more transactions</Text>
      </ScrollView>

      <Pressable
        onPress={() => navigation.navigate("Events")}
        style={styles.transactionFab}
      >
        <Plus color="#ffffff" size={23} strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}

function TransactionListRow({
  accountName,
  amount,
  categoryName,
  occurredAt,
  showDivider,
  transaction,
  type,
}: {
  accountName: string | null;
  amount: number;
  categoryName: string;
  occurredAt: string;
  showDivider: boolean;
  transaction: CachedTransaction;
  type: TransactionType;
}) {
  const icon = getTransactionIcon(categoryName, type);
  const Icon = icon.Icon;
  const signedAmount = getSignedTransactionAmount(amount, type);
  const merchantDisplay = getTransactionMerchantDisplay(transaction);

  return (
    <View
      style={[
        styles.transactionListRow,
        showDivider && styles.transactionListRowDivider,
      ]}
    >
      <View
        style={[
          styles.transactionListIcon,
          {
            backgroundColor: icon.background,
          },
        ]}
      >
        <Icon color={icon.color} size={19} strokeWidth={2.3} />
      </View>

      <View style={styles.transactionListDetails}>
        <Text numberOfLines={1} style={styles.transactionListTitle}>
          {merchantDisplay.name}
        </Text>
        {merchantDisplay.registered && (
          <Text style={styles.transactionMerchantBadge}>Matched merchant</Text>
        )}
        <Text numberOfLines={1} style={styles.transactionListCategory}>
          {accountName ? `${categoryName} · ${accountName}` : categoryName}
        </Text>
        <Text style={styles.transactionListTime}>
          {formatTransactionTime(occurredAt)}
        </Text>
      </View>

      <Text
        style={[
          styles.transactionListAmount,
          signedAmount > 0 && styles.transactionListAmountIncome,
        ]}
      >
        {formatSignedTransactionAmount(signedAmount)}
      </Text>
    </View>
  );
}

function PendingEventRow({
  accountName,
  event,
  onPress,
  showDivider,
}: {
  accountName: string | null;
  event: CachedFinancialEvent;
  onPress: () => void;
  showDivider: boolean;
}) {
  const isCredit = event.direction === "credit";

  return (
    <Pressable
      accessibilityHint="Opens this captured transaction for review"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pendingReviewRow,
        showDivider && styles.pendingReviewRowDivider,
        pressed && styles.pendingReviewRowPressed,
      ]}
    >
      <View style={styles.pendingReviewIcon}>
        <Store color="#0f172a" size={19} strokeWidth={2.3} />
      </View>

      <View style={styles.pendingReviewCopy}>
        <Text numberOfLines={1} style={styles.pendingReviewMerchant}>
          {event.merchant_name_raw ?? "Unknown merchant"}
        </Text>
        <Text numberOfLines={1} style={styles.pendingReviewMeta}>
          {isCredit ? "Income" : "Expense"}
          {accountName ? ` · ${accountName}` : " · Account unassigned"}
        </Text>
        <Text style={styles.pendingReviewDate}>
          {formatTransactionTime(event.occurred_at)}
        </Text>
      </View>

      <View style={styles.pendingReviewTrailing}>
        <Text
          style={[
            styles.pendingReviewAmount,
            isCredit && styles.pendingReviewAmountIncome,
          ]}
        >
          {MobileDashboardService.getFormattedBalance(event.amount)}
        </Text>
        <ChevronRight color="#94a3b8" size={17} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

type MerchantSort = "name" | "usage" | "recent";

const merchantSortOptions = [
  { label: "Name", value: "name" },
  { label: "Most used", value: "usage" },
  { label: "Recently used", value: "recent" },
] satisfies { label: string; value: MerchantSort }[];

export function MerchantsScreen() {
  const merchants = useOfflineStore((state) => state.merchants);
  const categories = useOfflineStore((state) => state.categories);
  const transactions = useOfflineStore((state) => state.transactions);
  const createMerchant = useOfflineStore((state) => state.createMerchant);
  const updateMerchant = useOfflineStore((state) => state.updateMerchant);
  const synchronize = useSyncStore((state) => state.synchronize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<MerchantSort>("name");
  const [sortVisible, setSortVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingMerchant, setEditingMerchant] =
    useState<CachedMerchant | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const usageByMerchantId = useMemo(() => {
    const usage = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (!transaction.merchant_id) return;
      usage.set(
        transaction.merchant_id,
        (usage.get(transaction.merchant_id) ?? 0) + 1
      );
    });

    return usage;
  }, [transactions]);
  const displayedMerchants = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = merchants.filter((merchant) => {
      const categoryName =
        categories.find((category) => category.id === merchant.category_id)
          ?.name ?? merchant.category?.name ?? "Uncategorized";

      return (
        !normalizedQuery ||
        merchant.name.toLowerCase().includes(normalizedQuery) ||
        categoryName.toLowerCase().includes(normalizedQuery)
      );
    });

    return filtered.slice().sort((first, second) => {
      if (sort === "usage") {
        return (
          getMerchantUsage(second, usageByMerchantId) -
            getMerchantUsage(first, usageByMerchantId) ||
          first.name.localeCompare(second.name)
        );
      }

      if (sort === "recent") {
        const firstTime = Date.parse(first.last_seen_at ?? first.updated_at);
        const secondTime = Date.parse(second.last_seen_at ?? second.updated_at);
        return secondTime - firstTime || first.name.localeCompare(second.name);
      }

      return first.name.localeCompare(second.name);
    });
  }, [categories, merchants, searchQuery, sort, usageByMerchantId]);
  const selectedSort =
    merchantSortOptions.find((option) => option.value === sort)?.label ?? "Name";

  function openEditor(merchant: CachedMerchant | null = null) {
    setEditingMerchant(merchant);
    setMerchantName(merchant?.name ?? "");
    setCategoryId(merchant?.category_id ?? merchant?.category?.id ?? null);
    setFormError(null);
    setEditorVisible(true);
  }

  function closeEditor() {
    if (isSaving) return;
    setEditorVisible(false);
    setEditingMerchant(null);
    setMerchantName("");
    setCategoryId(null);
    setFormError(null);
  }

  async function handleSaveMerchant() {
    const name = merchantName.trim();
    const normalizedName = normalizeMerchantName(name);

    if (!name) {
      setFormError("Enter a merchant name.");
      return;
    }

    if (
      merchants.some(
        (merchant) =>
          merchant.id !== editingMerchant?.id &&
          (merchant.normalized_name ?? normalizeMerchantName(merchant.name)) ===
            normalizedName
      )
    ) {
      setFormError("A merchant with this name already exists.");
      return;
    }

    const selectedCategory =
      categories.find((category) => category.id === categoryId) ?? null;
    const resource = {
      category: selectedCategory
        ? { id: selectedCategory.id, name: selectedCategory.name }
        : null,
      category_id: categoryId,
      name,
      normalized_name: normalizedName,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingMerchant) {
        await updateMerchant(editingMerchant.id, resource);
      } else {
        await createMerchant(resource);
      }
      closeEditorAfterSave();
      void synchronize();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save merchant."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeEditorAfterSave() {
    setEditorVisible(false);
    setEditingMerchant(null);
    setMerchantName("");
    setCategoryId(null);
    setFormError(null);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.merchantsContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.merchantsHero}>
          <Text style={styles.merchantsSubtitle}>
            Manage the merchant records used by your transactions.
          </Text>
          <Pressable
            accessibilityLabel="Add merchant"
            onPress={() => openEditor()}
            style={({ pressed }) => [
              styles.merchantAddButton,
              pressed && styles.merchantAddButtonPressed,
            ]}
          >
            <Plus color="#ffffff" size={23} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.merchantSearchRow}>
          <View style={styles.merchantDirectorySearch}>
            <Search color="#94a3b8" size={20} strokeWidth={2.3} />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Search merchants"
              placeholderTextColor="#94a3b8"
              style={styles.merchantDirectorySearchInput}
              value={searchQuery}
            />
            {searchQuery ? (
              <Pressable
                accessibilityLabel="Clear merchant search"
                onPress={() => setSearchQuery("")}
              >
                <X color="#94a3b8" size={18} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Sort merchants"
            onPress={() => setSortVisible(true)}
            style={styles.merchantSortButton}
          >
            <SlidersHorizontal color="#475569" size={19} strokeWidth={2.2} />
            <Text style={styles.merchantSortButtonText}>Sort</Text>
          </Pressable>
        </View>

        <View style={styles.merchantListHeader}>
          <Text style={styles.merchantListCount}>
            {displayedMerchants.length} {displayedMerchants.length === 1 ? "Merchant" : "Merchants"}
          </Text>
          <Text style={styles.merchantSortLabel}>{selectedSort}</Text>
        </View>

        <View style={styles.merchantDirectoryCard}>
          {displayedMerchants.map((merchant, index) => {
            const category =
              categories.find((item) => item.id === merchant.category_id) ?? null;
            const categoryName = category?.name ?? merchant.category?.name ?? "Uncategorized";
            const visual = category ? getCategoryVisual(category) : null;
            const CategoryIcon = visual?.Icon ?? Store;
            const accent = visual?.color ?? getMerchantAccent(merchant.name);

            return (
              <Pressable
                accessibilityHint="Opens merchant details for editing"
                key={merchant.id}
                onPress={() => openEditor(merchant)}
                style={({ pressed }) => [
                  styles.merchantDirectoryRow,
                  index < displayedMerchants.length - 1 &&
                    styles.merchantDirectoryRowDivider,
                  pressed && styles.merchantDirectoryRowPressed,
                ]}
              >
                <View
                  style={[
                    styles.merchantAvatar,
                    { backgroundColor: accent + "16" },
                  ]}
                >
                  <Text style={[styles.merchantAvatarText, { color: accent }]}>
                    {getMerchantInitials(merchant.name)}
                  </Text>
                </View>
                <View style={styles.merchantDirectoryCopy}>
                  <Text numberOfLines={1} style={styles.merchantDirectoryName}>
                    {merchant.name}
                  </Text>
                  <View style={styles.merchantCategoryLine}>
                    <CategoryIcon color={accent} size={14} strokeWidth={2.4} />
                    <Text numberOfLines={1} style={styles.merchantDirectoryMeta}>
                      {categoryName}
                    </Text>
                  </View>
                </View>
                <View style={styles.merchantUsageBlock}>
                  <Text style={styles.merchantUsageCount}>
                    {getMerchantUsage(merchant, usageByMerchantId)}
                  </Text>
                  <Text style={styles.merchantUsageLabel}>transactions</Text>
                </View>
                <ChevronRight color="#94a3b8" size={20} strokeWidth={2.2} />
              </Pressable>
            );
          })}

          {displayedMerchants.length === 0 ? (
            <View style={styles.merchantDirectoryEmpty}>
              <View style={styles.merchantDirectoryEmptyIcon}>
                <Store color="#6d4aff" size={24} strokeWidth={2.2} />
              </View>
              <Text style={styles.merchantEmptyTitle}>
                {searchQuery.trim() ? "No merchants found" : "No merchants yet"}
              </Text>
              <Text style={styles.merchantEmptyText}>
                {searchQuery.trim()
                  ? "Try a different name or category."
                  : "Add a merchant to keep transaction names consistent."}
              </Text>
              {!searchQuery.trim() ? (
                <Pressable
                  onPress={() => openEditor()}
                  style={styles.merchantEmptyButton}
                >
                  <Plus color="#ffffff" size={17} strokeWidth={2.7} />
                  <Text style={styles.merchantEmptyButtonText}>Add merchant</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSortVisible(false)}
        transparent
        visible={sortVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close sort options"
            onPress={() => setSortVisible(false)}
            style={styles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 24 }}
            style={styles.merchantSortPanel}
            transition={{ duration: 180, type: "timing" }}
          >
            <Text style={styles.sectionTitle}>Sort merchants</Text>
            <Text style={styles.muted}>Choose how this list is ordered.</Text>
            <View style={styles.merchantSortOptions}>
              {merchantSortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setSort(option.value);
                    setSortVisible(false);
                  }}
                  style={[
                    styles.merchantSortOption,
                    sort === option.value && styles.merchantSortOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.merchantSortOptionText,
                      sort === option.value && styles.merchantSortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sort === option.value ? (
                    <Check color="#6d4aff" size={19} strokeWidth={2.8} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </MotiView>
        </View>
      </Modal>

      <Modal
        animationType="none"
        onRequestClose={closeEditor}
        transparent
        visible={editorVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close merchant form"
            onPress={closeEditor}
            style={styles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={styles.modalPanel}
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <View style={styles.rowTitleBlock}>
                  <Text style={styles.sectionTitle}>
                    {editingMerchant ? "Edit merchant" : "New merchant"}
                  </Text>
                  <Text style={styles.muted}>
                    Name the merchant and set its default category.
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close merchant form"
                  disabled={isSaving}
                  onPress={closeEditor}
                  style={styles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={(value) => {
                  setMerchantName(value);
                  setFormError(null);
                }}
                placeholder="Merchant name"
                placeholderTextColor="#94a3b8"
                style={styles.categoryNameInput}
                value={merchantName}
              />

              <Text style={styles.accountSectionLabel}>Default category</Text>
              <ScrollView
                contentContainerStyle={styles.merchantCategoryOptions}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <Pressable
                  onPress={() => setCategoryId(null)}
                  style={[
                    styles.merchantCategoryOption,
                    categoryId === null && styles.merchantCategoryOptionActive,
                  ]}
                >
                  <View style={styles.merchantCategoryOptionIcon}>
                    <Store color="#64748b" size={18} strokeWidth={2.3} />
                  </View>
                  <Text style={styles.merchantCategoryOptionText}>Uncategorized</Text>
                  {categoryId === null ? (
                    <Check color="#6d4aff" size={16} strokeWidth={2.8} />
                  ) : null}
                </Pressable>
                {categories.map((category) => {
                  const visual = getCategoryVisual(category);
                  const Icon = visual.Icon;
                  const selected = categoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setCategoryId(category.id)}
                      style={[
                        styles.merchantCategoryOption,
                        selected && styles.merchantCategoryOptionActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.merchantCategoryOptionIcon,
                          { backgroundColor: visual.color + "14" },
                        ]}
                      >
                        <Icon color={visual.color} size={18} strokeWidth={2.3} />
                      </View>
                      <Text style={styles.merchantCategoryOptionText}>
                        {category.name}
                      </Text>
                      {selected ? (
                        <Check color="#6d4aff" size={16} strokeWidth={2.8} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <View style={styles.merchantFormActions}>
                <Pressable
                  disabled={isSaving}
                  onPress={() => void handleSaveMerchant()}
                  style={({ pressed }) => [
                    styles.merchantFormPrimaryButton,
                    pressed && styles.merchantFormButtonPressed,
                    isSaving && styles.saveButtonDisabled,
                  ]}
                >
                  <Text style={styles.merchantFormPrimaryButtonText}>
                    {isSaving
                      ? "Saving..."
                      : editingMerchant
                        ? "Save changes"
                        : "Create merchant"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isSaving}
                  onPress={closeEditor}
                  style={({ pressed }) => [
                    styles.merchantFormCancelButton,
                    pressed && styles.merchantFormButtonPressed,
                  ]}
                >
                  <Text style={styles.merchantFormCancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

function getMerchantUsage(
  merchant: CachedMerchant,
  usageByMerchantId: Map<string, number>
) {
  return Math.max(
    merchant.usage_count ?? 0,
    usageByMerchantId.get(merchant.id) ?? 0
  );
}

function getMerchantInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "M";
}

function getMerchantAccent(name: string) {
  const colors = ["#6d4aff", "#2563eb", "#16a34a", "#f59e0b", "#db2777"];
  const total = Array.from(name).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0
  );
  return colors[total % colors.length];
}

type CategoryFilter = "all" | "system" | "custom";

const categoryIconOptions = [
  { Icon: Store, key: "store" },
  { Icon: Utensils, key: "utensils" },
  { Icon: ShoppingCart, key: "shopping-cart" },
  { Icon: ShoppingBag, key: "shopping-bag" },
  { Icon: Fuel, key: "fuel" },
  { Icon: Car, key: "car" },
  { Icon: ReceiptText, key: "receipt" },
  { Icon: Film, key: "film" },
  { Icon: HeartPulse, key: "heart-pulse" },
  { Icon: Wallet, key: "wallet" },
  { Icon: Landmark, key: "landmark" },
  { Icon: Smartphone, key: "smartphone" },
  { Icon: ArrowLeftRight, key: "arrow-right-left" },
] as const;

const categoryColorOptions = [
  "#6d4aff",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#db2777",
  "#64748b",
] as const;

export function CategoriesScreen() {
  const categories = useOfflineStore((state) => state.categories);
  const transactions = useOfflineStore((state) => state.transactions);
  const createCategory = useOfflineStore((state) => state.createCategory);
  const synchronize = useSyncStore((state) => state.synchronize);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("store");
  const [color, setColor] = useState<string>("#6d4aff");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const usageByCategoryId = useMemo(() => {
    const usage = new Map<string, number>();

    transactions.forEach((transaction) => {
      const categoryId = transaction.category_id ?? transaction.category?.id;
      if (!categoryId) return;
      usage.set(categoryId, (usage.get(categoryId) ?? 0) + 1);
    });

    return usage;
  }, [transactions]);
  const filteredCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "system" && category.is_system) ||
        (filter === "custom" && !category.is_system);
      const matchesQuery =
        !normalizedQuery ||
        category.name.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [categories, filter, searchQuery]);

  function closeModal() {
    if (isSaving) return;
    setModalVisible(false);
    setName("");
    setIcon("store");
    setColor("#6d4aff");
    setFormError(null);
  }

  async function handleCreateCategory() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError("Enter a category name.");
      return;
    }

    if (
      categories.some(
        (category) => category.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setFormError("A category with this name already exists.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await createCategory({
        color,
        icon,
        name: trimmedName,
      });
      await synchronize();
      setModalVisible(false);
      setName("");
      setIcon("store");
      setColor("#6d4aff");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create category."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.categoriesContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.categoriesHero}>
          <View style={styles.categoriesHeroCopy}>
            <Text style={styles.categoriesTitle}>Categories</Text>
            <Text style={styles.categoriesSubtitle}>
              Organize transactions with system and custom categories.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Add new category"
            accessibilityRole="button"
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.categoryAddButton,
              pressed && styles.categoryAddButtonPressed,
            ]}
          >
            <Plus color="#ffffff" size={19} strokeWidth={2.8} />
            <Text style={styles.categoryAddButtonText}>New</Text>
          </Pressable>
        </View>

        <View style={styles.categorySearchBar}>
          <Search color="#94a3b8" size={20} strokeWidth={2.3} />
          <TextInput
            onChangeText={setSearchQuery}
            placeholder="Search categories"
            placeholderTextColor="#94a3b8"
            style={styles.categorySearchInput}
            value={searchQuery}
          />
        </View>

        <View style={styles.categoryFilterBar}>
          {(["all", "system", "custom"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[
                styles.categoryFilterButton,
                filter === item && styles.categoryFilterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  filter === item && styles.categoryFilterTextActive,
                ]}
              >
                {titleCase(item)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.categoryListHeader}>
          <Text style={styles.categoryListTitle}>
            {filter === "all" ? "All categories" : titleCase(filter) + " categories"}
          </Text>
          <Text style={styles.categoryListCount}>
            {filteredCategories.length}
          </Text>
        </View>

        <View style={styles.categoryListCard}>
          {filteredCategories.map((category, index) => (
            <CategoryListRow
              category={category}
              key={category.id}
              showDivider={index < filteredCategories.length - 1}
              usageCount={usageByCategoryId.get(category.id) ?? 0}
            />
          ))}
          {filteredCategories.length === 0 ? (
            <View style={styles.categoryEmptyState}>
              <Text style={styles.categoryEmptyTitle}>No categories found</Text>
              <Text style={styles.categoryEmptyText}>
                {searchQuery.trim()
                  ? "Try a different search or filter."
                  : "Create a custom category to get started."}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        animationType="none"
        onRequestClose={closeModal}
        transparent
        visible={modalVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close category form"
            onPress={closeModal}
            style={styles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={styles.modalPanel}
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.rowTitleBlock}>
                  <Text style={styles.sectionTitle}>New category</Text>
                  <Text style={styles.muted}>
                    Choose a name and visual style for this category.
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close category form"
                  disabled={isSaving}
                  onPress={closeModal}
                  style={styles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              <TextInput
                autoFocus
                onChangeText={(value) => {
                  setName(value);
                  setFormError(null);
                }}
                placeholder="Category name"
                placeholderTextColor="#94a3b8"
                style={styles.categoryNameInput}
                value={name}
              />

              <Text style={styles.accountSectionLabel}>Choose an icon</Text>
              <View style={styles.categoryOptionGrid}>
                {categoryIconOptions.map((option) => {
                  const Icon = option.Icon;
                  const selected = icon === option.key;

                  return (
                    <Pressable
                      accessibilityLabel={option.key}
                      key={option.key}
                      onPress={() => setIcon(option.key)}
                      style={[
                        styles.categoryIconOption,
                        selected && {
                          backgroundColor: color + "14",
                          borderColor: color,
                        },
                      ]}
                    >
                      <Icon
                        color={selected ? color : "#64748b"}
                        size={21}
                        strokeWidth={2.4}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.accountSectionLabel}>Choose a color</Text>
              <View style={styles.categoryColorOptions}>
                {categoryColorOptions.map((option) => (
                  <Pressable
                    accessibilityLabel={"Use color " + option}
                    key={option}
                    onPress={() => setColor(option)}
                    style={[
                      styles.categoryColorOption,
                      { backgroundColor: option },
                      color === option && styles.categoryColorOptionSelected,
                    ]}
                  >
                    {color === option ? (
                      <Check color="#ffffff" size={17} strokeWidth={3} />
                    ) : null}
                  </Pressable>
                ))}
              </View>

              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <View style={styles.actions}>
                <Pressable
                  disabled={isSaving}
                  onPress={() => void handleCreateCategory()}
                  style={[
                    styles.primaryButton,
                    isSaving && styles.saveButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSaving ? "Creating..." : "Create category"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isSaving}
                  onPress={closeModal}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

function CategoryListRow({
  category,
  showDivider,
  usageCount,
}: {
  category: CachedCategory;
  showDivider: boolean;
  usageCount: number;
}) {
  const visual = getCategoryVisual(category);
  const Icon = visual.Icon;

  return (
    <View
      style={[
        styles.categoryListRow,
        showDivider && styles.categoryListRowDivider,
      ]}
    >
      <View
        style={[
          styles.categoryListIcon,
          { backgroundColor: visual.color + "14" },
        ]}
      >
        <Icon color={visual.color} size={21} strokeWidth={2.4} />
      </View>
      <View style={styles.categoryListCopy}>
        <Text style={styles.categoryListName}>{category.name}</Text>
        <Text style={styles.categoryListMeta}>
          {category.is_system ? "System category" : "Custom category"}
        </Text>
      </View>
      <View
        style={[
          styles.categoryUsageBadge,
          { backgroundColor: visual.color + "12" },
        ]}
      >
        <Text style={[styles.categoryUsageText, { color: visual.color }]}>
          {usageCount}
        </Text>
      </View>
    </View>
  );
}

function getCategoryVisual(category: CachedCategory) {
  const normalizedIcon = category.icon?.toLowerCase();
  const normalizedName = category.name.toLowerCase();
  const configured = categoryIconOptions.find(
    (option) => option.key === normalizedIcon
  );

  if (configured) {
    return {
      color: category.color ?? "#64748b",
      Icon: configured.Icon,
    };
  }

  const transactionVisual = getTransactionIcon(
    category.name,
    normalizedName.includes("salary") ? "income" : "expense"
  );

  return {
    color: category.color ?? transactionVisual.color,
    Icon: transactionVisual.Icon,
  };
}

export function BudgetsScreen() {
  const budgets = useOfflineStore((state) => state.budgets);
  const categories = useOfflineStore((state) => state.categories);
  const transactions = useOfflineStore((state) => state.transactions);
  const createBudget = useOfflineStore((state) => state.createBudget);
  const synchronize = useSyncStore((state) => state.synchronize);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const budgetSavingRef = useRef(false);
  const budgetScrollRef = useRef<ScrollView>(null);
  const budgetFormOffsetRef = useRef(0);
  const budgetCategories = useMemo(
    () =>
      categories.filter((category) => {
        const normalized = category.name.trim().toLowerCase();
        return normalized !== "salary" && normalized !== "transfer";
      }),
    [categories]
  );
  const overview = useMemo(
    () => MobileDashboardService.getBudgetOverview(budgets, transactions),
    [budgets, transactions]
  );
  const selectedCategory = categories.find(
    (category) => category.id === categoryId
  );
  const remainingPercentage =
    overview.totalBudgeted > 0
      ? Math.max(
          0,
          Math.min(100, (overview.remaining / overview.totalBudgeted) * 100)
        )
      : 0;
  const monthDate = new Date(overview.monthStart + "T00:00:00");

  async function handleCreateBudget() {
    if (budgetSavingRef.current) {
      return;
    }

    const amount = Number(budgetAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setBudgetError("Enter a valid budget amount.");
      return;
    }

    if (!categoryId) {
      setBudgetError("Choose a category for this budget.");
      return;
    }

    if (
      overview.budgets.some(
        (item) => item.budget.category_id === categoryId
      )
    ) {
      setBudgetError(
        "A budget already exists for this category this month."
      );
      return;
    }

    budgetSavingRef.current = true;
    setIsSavingBudget(true);

    try {
      await createBudget({
        amount,
        category: selectedCategory ?? null,
        category_id: categoryId,
        month_start: new Date().toISOString().slice(0, 7) + "-01",
      });
      await synchronize();
      setBudgetAmount("");
      setCategoryId(null);
      setBudgetError(null);
    } finally {
      budgetSavingRef.current = false;
      setIsSavingBudget(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.budgetsContainer}
      keyboardShouldPersistTaps="handled"
      ref={budgetScrollRef}
    >
      <View style={styles.budgetsHero}>
        <Text style={styles.budgetsTitle}>Budgets</Text>
        <Text style={styles.budgetsSubtitle}>
          Plan your spending and stay in control.
        </Text>
      </View>

      <View style={styles.budgetSummaryCard}>
        <View style={styles.budgetSummaryMain}>
          <View style={styles.budgetSummaryCopy}>
            <Text style={styles.budgetSummaryLabel}>Remaining this month</Text>
            <Text style={styles.budgetSummaryValue}>
              {MobileDashboardService.getFormattedBalance(overview.remaining)}
            </Text>
            <Text style={styles.budgetSummaryTotal}>
              of{" "}
              {MobileDashboardService.getFormattedBalance(
                overview.totalBudgeted
              )}
            </Text>
          </View>
          <BudgetSummaryRing percentage={remainingPercentage} />
        </View>
        <View style={styles.budgetSummaryFooter}>
          <CalendarDays color="#cbd5e1" size={17} strokeWidth={2.2} />
          <Text style={styles.budgetSummaryDate}>
            {formatMonthRange(monthDate)}
          </Text>
        </View>
      </View>

      <View
        onLayout={(event) => {
          budgetFormOffsetRef.current = event.nativeEvent.layout.y;
        }}
        style={styles.budgetFormCard}
      >
        <View style={styles.budgetFormHeader}>
          <Text style={styles.sectionTitle}>Add budget</Text>
          <Text style={styles.muted}>
            Set a monthly spending limit for a category.
          </Text>
        </View>

        <View style={styles.budgetAmountInputWrap}>
          <IndianRupee color="#0f172a" size={18} strokeWidth={2.5} />
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setBudgetAmount(value);
              setBudgetError(null);
            }}
            placeholder="Enter monthly limit"
            placeholderTextColor="#94a3b8"
            style={styles.budgetAmountInput}
            value={budgetAmount}
          />
        </View>

        <View style={styles.budgetCategoryGrid}>
          {budgetCategories.map((category) => (
            <BudgetCategoryOption
              category={category}
              key={category.id}
              onPress={() => {
                setCategoryId(category.id);
                setBudgetError(null);
              }}
              selected={categoryId === category.id}
            />
          ))}
        </View>

        {budgetCategories.length === 0 && (
          <Text style={styles.muted}>
            Sync categories before creating a budget.
          </Text>
        )}

        {budgetError && <Text style={styles.error}>{budgetError}</Text>}

        <Pressable
          disabled={isSavingBudget}
          onPress={handleCreateBudget}
          style={[
            styles.accountSaveButton,
            isSavingBudget && styles.saveButtonDisabled,
          ]}
        >
          <Text style={styles.accountSaveButtonText}>
            {isSavingBudget ? "Saving..." : "Save Budget"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.budgetListSection}>
        <View style={styles.budgetListHeader}>
          <Text style={styles.sectionTitle}>Your budgets</Text>
          {overview.budgets.length > 0 ? (
            <Text style={styles.budgetListCount}>
              {overview.budgets.length}
            </Text>
          ) : null}
        </View>
        {overview.budgets.length === 0 ? (
          <View style={styles.budgetEmptyCard}>
            <View style={styles.budgetEmptyIcon}>
              <PiggyBank color="#6d4aff" size={30} strokeWidth={2.2} />
            </View>
            <Text style={styles.budgetEmptyTitle}>No budgets yet</Text>
            <Text style={styles.budgetEmptyText}>
              Add a category budget to track monthly spending.
            </Text>
            <Pressable
              onPress={() =>
                budgetScrollRef.current?.scrollTo({
                  animated: true,
                  y: Math.max(budgetFormOffsetRef.current - 12, 0),
                })
              }
              style={styles.budgetEmptyButton}
            >
              <Plus color="#6d4aff" size={17} strokeWidth={2.7} />
              <Text style={styles.budgetEmptyButtonText}>
                Add your first budget
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.budgetListCard}>
            {overview.budgets.map((item, index) => (
              <BudgetProgressRow
                category={
                  categories.find(
                    (category) => category.id === item.budget.category_id
                  ) ?? null
                }
                item={item}
                key={item.budget.id}
                showDivider={index < overview.budgets.length - 1}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function BudgetSummaryRing({ percentage }: { percentage: number }) {
  const size = 86;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, percentage));

  return (
    <View style={[styles.budgetRing, { height: size, width: size }]}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="#263354"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
          stroke="#6d4aff"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress / 100)}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={styles.budgetRingLabel}>
        <Text style={styles.budgetRingValue}>{Math.round(progress)}%</Text>
        <Text style={styles.budgetRingText}>left</Text>
      </View>
    </View>
  );
}

function BudgetCategoryOption({
  category,
  onPress,
  selected,
}: {
  category: CachedCategory;
  onPress: () => void;
  selected: boolean;
}) {
  const visual = getCategoryVisual(category);
  const Icon = visual.Icon;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.budgetCategoryPill,
        selected && styles.budgetCategoryPillActive,
      ]}
    >
      <View
        style={[
          styles.budgetCategoryIcon,
          { backgroundColor: visual.color + "14" },
        ]}
      >
        <Icon color={visual.color} size={16} strokeWidth={2.4} />
      </View>
      <Text numberOfLines={1} style={styles.budgetCategoryText}>
        {category.name}
      </Text>
      {selected ? (
        <Check color="#6d4aff" size={15} strokeWidth={2.8} />
      ) : null}
    </Pressable>
  );
}

function BudgetProgressRow({
  category,
  item,
  showDivider,
}: {
  category: CachedCategory | null;
  item: ReturnType<typeof MobileDashboardService.getBudgetOverview>["budgets"][number];
  showDivider: boolean;
}) {
  const visual = category
    ? getCategoryVisual(category)
    : { color: "#64748b", Icon: Store };
  const Icon = visual.Icon;
  const statusColor =
    item.status === "over_limit"
      ? "#dc2626"
      : item.status === "near_limit"
        ? "#f59e0b"
        : "#16a34a";
  const statusLabel =
    item.status === "over_limit"
      ? "Over limit"
      : item.status === "near_limit"
        ? "Near limit"
        : "On track";
  const progressWidth =
    (Math.max(0, Math.min(100, item.percentage)).toString() +
      "%") as DimensionValue;

  return (
    <View
      style={[
        styles.budgetProgressRow,
        showDivider && styles.budgetProgressRowDivider,
      ]}
    >
      <View style={styles.budgetProgressHeader}>
        <View
          style={[
            styles.budgetProgressIcon,
            { backgroundColor: visual.color + "14" },
          ]}
        >
          <Icon color={visual.color} size={20} strokeWidth={2.4} />
        </View>
        <View style={styles.budgetProgressCopy}>
          <Text style={styles.budgetProgressName}>
            {category?.name ?? item.budget.category?.name ?? "Uncategorized"}
          </Text>
          <Text style={styles.budgetProgressAmount}>
            {MobileDashboardService.getFormattedBalance(item.spent)} of{" "}
            {MobileDashboardService.getFormattedBalance(item.budget.amount)}
          </Text>
        </View>
        <View
          style={[
            styles.budgetStatusBadge,
            { backgroundColor: statusColor + "12" },
          ]}
        >
          <Text style={[styles.budgetStatusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <View style={styles.budgetProgressTrack}>
        <View
          style={[
            styles.budgetProgressFill,
            { backgroundColor: statusColor, width: progressWidth },
          ]}
        />
      </View>
      <View style={styles.budgetProgressFooter}>
        <Text style={styles.budgetProgressPercent}>
          {Math.round(item.percentage)}% used
        </Text>
        <Text style={styles.budgetProgressRemaining}>
          {MobileDashboardService.getFormattedBalance(item.remaining)} left
        </Text>
      </View>
    </View>
  );
}

export function ReportsScreen() {
  const transactions = useOfflineStore((state) => state.transactions);
  const month = new Date().toISOString().slice(0, 7);
  const report = useMemo(
    () => MobileDashboardService.getReport(transactions, "monthly", month),
    [month, transactions]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reports</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Net balance</Text>
        <Text style={styles.summaryValue}>
          {MobileDashboardService.getFormattedBalance(report.netBalance)}
        </Text>
      </View>
      <View style={styles.grid}>
        <ReportMetric label="Income" value={report.totalIncome} />
        <ReportMetric label="Expenses" value={report.totalExpenses} />
      </View>
      <Text style={styles.sectionTitle}>Categories</Text>
      {report.categoryReport.map((group) => (
        <View key={group.name} style={styles.row}>
          <Text style={styles.rowTitle}>{group.name}</Text>
          <Text style={styles.muted}>
            {MobileDashboardService.getFormattedBalance(group.expenses)} •{" "}
            {group.transactionCount} transactions
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("month");
  const transactions = useOfflineStore((state) => state.transactions);
  const filteredTransactions = useMemo(
    () => filterTransactionsForAnalyticsRange(transactions, analyticsRange),
    [analyticsRange, transactions]
  );
  const analytics = useMemo(
    () => MobileDashboardService.getAnalytics(filteredTransactions),
    [filteredTransactions]
  );
  const visibleCashFlow = analytics.cashFlow.slice(-6);
  const visibleCategories = analytics.categoryAnalytics
    .filter((group) => group.expenses > 0)
    .slice(0, 6);
  const latestComparison =
    analytics.monthlyComparisons[analytics.monthlyComparisons.length - 1] ??
    null;
  const chartWidth = Math.max(280, width - 72);
  const pieSize = Math.min(124, Math.max(104, width * 0.29));
  const highestCategory = visibleCategories[0] ?? null;
  const lowestCategory =
    visibleCategories.length > 0
      ? visibleCategories[visibleCategories.length - 1]
      : null;

  return (
    <ScrollView contentContainerStyle={styles.analyticsContainer}>
      <View style={styles.analyticsDatePill}>
        <View style={styles.analyticsDateLeading}>
          <CalendarDays color="#64748b" size={18} strokeWidth={2.3} />
          <Text style={styles.analyticsDateText}>
            {formatAnalyticsRange(filteredTransactions, analyticsRange)}
          </Text>
        </View>
      </View>

      <View style={styles.analyticsRangeSelector}>
        {analyticsRangeOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setAnalyticsRange(option.value)}
            style={[
              styles.analyticsRangeButton,
              analyticsRange === option.value &&
                styles.analyticsRangeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.analyticsRangeText,
                analyticsRange === option.value &&
                  styles.analyticsRangeTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.analyticsMetricRow}>
        <AnalyticsMetricCard
          Icon={ChartNoAxesCombined}
          accent="#7c3aed"
          background="#f5f3ff"
          label="Total Spend"
          trend={formatAnalyticsTrend(
            latestComparison?.expensesChangePercentage,
            "expense"
          )}
          value={analytics.totalExpenses}
        />
        <AnalyticsMetricCard
          Icon={Wallet}
          accent="#16a34a"
          background="#ecfdf5"
          label="Total Income"
          trend={formatAnalyticsTrend(
            latestComparison?.incomeChangePercentage,
            "income"
          )}
          value={analytics.totalIncome}
        />
        <AnalyticsMetricCard
          Icon={IndianRupee}
          accent="#f59e0b"
          background="#fffbeb"
          label="Net Savings"
          trend={formatAnalyticsTrend(
            latestComparison?.netChangePercentage,
            "income"
          )}
          value={analytics.netBalance}
        />
      </View>

      <View style={styles.analyticsChartCard}>
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsSectionTitle}>
            Income vs Expense Trend
          </Text>
          <View style={styles.analyticsLegendRow}>
            <AnalyticsLegendDot color="#0f172a" label="Income" />
            <AnalyticsLegendDot color="#94a3b8" label="Expense" />
          </View>
        </View>
        <CashFlowLineChart points={visibleCashFlow} width={chartWidth} />
      </View>

      <View style={styles.analyticsCategoryCard}>
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsSectionTitle}>
            Spending by Category
          </Text>
        </View>

        <View style={styles.analyticsCategoryBody}>
          <View style={styles.analyticsDonutContainer}>
            <CategoryDonutChart
              categories={visibleCategories}
              size={pieSize}
              total={analytics.totalExpenses}
            />
          </View>

          <View style={styles.analyticsCategoryList}>
            {visibleCategories.length === 0 ? (
              <Text style={styles.analyticsEmptyText}>
                No expense categories yet.
              </Text>
            ) : (
              visibleCategories.map((category, index) => (
                <AnalyticsCategoryRow
                  category={category}
                  color={getAnalyticsCategoryColor(index)}
                  key={category.name}
                />
              ))
            )}
          </View>
        </View>
      </View>

      <View style={styles.analyticsInsightRow}>
        <AnalyticsInsightCard
          Icon={TrendingUp}
          accent="#8b5cf6"
          background="#f3e8ff"
          label="Highest Spending"
          subtitle={highestCategory?.name ?? "No category"}
          value={highestCategory?.expenses ?? 0}
        />
        <AnalyticsInsightCard
          Icon={TrendingDown}
          accent="#14b8a6"
          background="#ccfbf1"
          label="Lowest Spending"
          subtitle={lowestCategory?.name ?? "No category"}
          value={lowestCategory?.expenses ?? 0}
        />
        <AnalyticsInsightCard
          Icon={IndianRupee}
          accent="#ff6b4a"
          background="#fee2e2"
          label="Avg Monthly Spend"
          subtitle={`${formatPercent(analytics.savingsRate)} saved`}
          value={analytics.averageMonthlyExpenses}
        />
      </View>
    </ScrollView>
  );
}

function AnalyticsMetricCard({
  accent,
  background,
  Icon,
  label,
  trend,
  value,
}: {
  accent: string;
  background: string;
  Icon: FinanceScreenIcon;
  label: string;
  trend: AnalyticsTrendDisplay;
  value: number;
}) {
  const TrendIcon = trend.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <View style={styles.analyticsMetricCard}>
      <View style={styles.analyticsMetricHeader}>
        <Text numberOfLines={1} style={styles.analyticsMetricLabel}>
          {label}
        </Text>
        <View
          style={[
            styles.analyticsMetricIcon,
            {
              backgroundColor: background,
            },
          ]}
        >
          <Icon color={accent} size={17} strokeWidth={2.4} />
        </View>
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.analyticsMetricValue}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <View style={styles.analyticsTrendRow}>
        <TrendIcon
          color={trend.color}
          size={13}
          strokeWidth={2.6}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.analyticsTrendText,
            {
              color: trend.color,
            },
          ]}
        >
          {trend.label}
        </Text>
      </View>
    </View>
  );
}

function AnalyticsLegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <View style={styles.analyticsLegendItem}>
      <View
        style={[
          styles.analyticsLegendDot,
          {
            backgroundColor: color,
          },
        ]}
      />
      <Text style={styles.analyticsLegendText}>{label}</Text>
    </View>
  );
}

function CashFlowLineChart({
  points,
  width,
}: {
  points: AnalyticsTrendPoint[];
  width: number;
}) {
  const chartPoints = getCashFlowChartPoints(points);

  return (
    <View style={styles.analyticsLineChartWrap}>
      <LineChart
        bezier
        chartConfig={{
          backgroundGradientFrom: "#ffffff",
          backgroundGradientFromOpacity: 0,
          backgroundGradientTo: "#ffffff",
          backgroundGradientToOpacity: 0,
          color: (opacity = 1) => `rgba(56, 86, 246, ${opacity})`,
          decimalPlaces: 0,
          labelColor: () => "#667085",
          propsForBackgroundLines: {
            stroke: "#e5e7eb",
            strokeDasharray: "4 5",
          },
        }}
        data={{
          labels: chartPoints.map((point) => formatShortPeriod(point.period)),
          datasets: [
            {
              color: () => "#0f172a",
              data: chartPoints.map((point) => point.income),
              strokeWidth: 2.5,
            },
            {
              color: () => "#94a3b8",
              data: chartPoints.map((point) => point.expenses),
              strokeWidth: 2.5,
            },
          ],
        }}
        formatYLabel={(value) => formatCompactAmount(Number(value))}
        fromZero
        height={220}
        segments={4}
        style={styles.analyticsLineChart}
        width={width}
        withDots={false}
        withInnerLines
        withOuterLines={false}
        withShadow={false}
        withVerticalLines={false}
      />
    </View>
  );
}

function CategoryDonutChart({
  categories,
  size,
  total,
}: {
  categories: AnalyticsGroup[];
  size: number;
  total: number;
}) {
  const strokeWidth = Math.max(16, Math.round(size * 0.14));
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = getDonutSegments(categories, total, circumference);

  return (
    <View
      style={[
        styles.analyticsDonutWrap,
        {
          height: size,
          width: size,
        },
      ]}
    >
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment) => (
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="transparent"
            key={segment.name}
            originX={size / 2}
            originY={size / 2}
            r={radius}
            rotation="-90"
            stroke={segment.color}
            strokeDasharray={`${segment.arcLength} ${
              circumference - segment.arcLength
            }`}
            strokeDashoffset={segment.dashOffset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        ))}
      </Svg>
      <View style={styles.analyticsDonutCenter}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.analyticsDonutValue}
        >
          {MobileDashboardService.getFormattedBalance(total)}
        </Text>
        <Text style={styles.analyticsDonutLabel}>Total</Text>
      </View>
    </View>
  );
}

function AnalyticsCategoryRow({
  category,
  color,
}: {
  category: AnalyticsGroup;
  color: string;
}) {
  const categoryIcon = getTransactionIcon(category.name, "expense");
  const Icon = categoryIcon.Icon;

  return (
    <View style={styles.analyticsCategoryRow}>
      <View
        style={[
          styles.analyticsCategoryIcon,
          {
            backgroundColor: color,
          },
        ]}
      >
        <Icon color="#ffffff" size={14} strokeWidth={2.5} />
      </View>
      <Text numberOfLines={1} style={styles.analyticsCategoryName}>
        {category.name}
      </Text>
      <Text style={styles.analyticsCategoryPercent}>
        {Math.round(category.percentageOfExpenses)}%
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.analyticsCategoryAmount}
      >
        {MobileDashboardService.getFormattedBalance(category.expenses)}
      </Text>
    </View>
  );
}

function AnalyticsInsightCard({
  accent,
  background,
  Icon,
  label,
  subtitle,
  value,
}: {
  accent: string;
  background: string;
  Icon: FinanceScreenIcon;
  label: string;
  subtitle: string;
  value: number;
}) {
  return (
    <View style={styles.analyticsInsightCard}>
      <View
        style={[
          styles.analyticsInsightIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Icon color={accent} size={18} strokeWidth={2.5} />
      </View>
      <Text numberOfLines={1} style={styles.analyticsInsightLabel}>
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.analyticsInsightValue}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.analyticsInsightSubtitle,
          {
            color: accent,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

interface AnalyticsTrendDisplay {
  color: string;
  direction: "down" | "up";
  label: string;
}

function formatAnalyticsTrend(
  value: number | null | undefined,
  tone: "expense" | "income"
): AnalyticsTrendDisplay {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return {
      color: "#64748b",
      direction: "up",
      label: "No comparison",
    };
  }

  const direction = value < 0 ? "down" : "up";
  const isFavorable = tone === "expense" ? value <= 0 : value >= 0;

  return {
    color: isFavorable ? "#10b981" : "#f43f5e",
    direction,
    label: `${Math.abs(value).toFixed(1)}% vs prev`,
  };
}

function getDonutSegments(
  categories: AnalyticsGroup[],
  total: number,
  circumference: number
) {
  let consumedArc = 0;

  return categories.map((category, index) => {
    const arcLength =
      total > 0 ? (category.expenses / total) * circumference : 0;
    const segment = {
      arcLength,
      color: getAnalyticsCategoryColor(index),
      dashOffset: -consumedArc,
      name: category.name,
    };

    consumedArc += arcLength;

    return segment;
  });
}

function getCashFlowChartPoints(points: AnalyticsTrendPoint[]) {
  if (points.length >= 2) {
    return points;
  }

  if (points.length === 1) {
    return [emptyPreviousTrendPoint(points[0].period), points[0]];
  }

  const now = new Date();

  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 3 + index, 1);

    return emptyTrendPointForPeriod(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  });
}

function emptyPreviousTrendPoint(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 2, 1);

  return emptyTrendPointForPeriod(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  );
}

function emptyTrendPointForPeriod(period: string): AnalyticsTrendPoint {
  return {
    expenses: 0,
    income: 0,
    net: 0,
    period,
    transactionCount: 0,
  };
}

function filterTransactionsForAnalyticsRange(
  transactions: CachedTransaction[],
  range: AnalyticsRange
) {
  if (range === "all") {
    return transactions;
  }

  const now = new Date();
  const monthOffset = range === "month" ? 0 : range === "3m" ? 2 : 5;
  const start = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

  return transactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurred_at);

    return (
      Number.isFinite(occurredAt.getTime()) &&
      occurredAt >= start &&
      occurredAt <= now
    );
  });
}

function formatAnalyticsRange(
  transactions: CachedTransaction[],
  range: AnalyticsRange
) {
  if (range === "month") {
    return formatMonthRange(new Date());
  }

  if (transactions.length === 0) {
    const now = new Date();
    if (range === "all") {
      return "All transactions";
    }

    return formatRollingRange(now, range);
  }

  const dates = transactions
    .map((transaction) => new Date(transaction.occurred_at))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((first, second) => first.getTime() - second.getTime());

  if (dates.length === 0) {
    return range === "all" ? "All transactions" : formatRollingRange(new Date(), range);
  }

  const first = dates[0];
  const last = dates[dates.length - 1];

  if (
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth()
  ) {
    return formatMonthRange(last);
  }

  return `${first.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })} - ${last.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })}`;
}

function formatRollingRange(date: Date, range: AnalyticsRange) {
  const monthOffset = range === "3m" ? 2 : 5;
  const start = new Date(date.getFullYear(), date.getMonth() - monthOffset, 1);

  return `${start.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })} - ${date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })}`;
}

function formatMonthRange(date: Date) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const monthYear = date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });

  return `1 - ${lastDay} ${monthYear}`;
}

function formatShortPeriod(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
  });
}

function formatCompactAmount(value: number) {
  if (value >= 100000) {
    return `${Math.round(value / 100000)}L`;
  }

  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }

  return value.toFixed(0);
}

function getAnalyticsCategoryColor(index: number) {
  return [
    "#0f172a",
    "#64748b",
    "#ff6b4a",
    "#4ade80",
    "#facc15",
    "#67c7f7",
    "#cbd5e1",
  ][index % 7];
}

type IntelligenceResource = FinancialIntelligenceResource;

type IntelligenceItem =
  | CachedAccount
  | CachedAsset
  | CachedLiability
  | CachedLoan
  | CachedInvestment
  | CachedGoal;

const accountTypeOptions: AccountType[] = [
  "bank",
  "cash",
  "credit_card",
  "digital_wallet",
];

const advancedResourceTabs: IntelligenceResource[] = [
  "asset",
  "liability",
  "investment",
  "goal",
  "loan",
];

const resourceLabels: Record<IntelligenceResource, string> = {
  account: "account",
  asset: "asset",
  goal: "goal",
  investment: "investment",
  liability: "liability",
  loan: "loan",
};

type FinancialIntelligenceScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "FinancialIntelligence"
>;

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDefaultResourceType(resource: IntelligenceResource) {
  if (resource === "account") return "bank";
  if (resource === "asset") return "other";
  if (resource === "liability") return "other";
  if (resource === "loan") return "personal_loan";

  return "";
}

function getResourceHelpText(resource: IntelligenceResource) {
  if (resource === "account") {
    return "Add the places where money is held or owed, such as cash, a bank account, card, or wallet.";
  }

  if (resource === "asset") {
    return "Track owned value outside daily spending, such as deposits, property, gold, mutual funds, or vehicles.";
  }

  if (resource === "liability") {
    return "Track money you owe, such as credit cards, loans, or mortgages.";
  }

  if (resource === "loan") {
    return "Add repayment details for an existing liability.";
  }

  if (resource === "investment") {
    return "Track holdings by symbol, quantity, and price.";
  }

  return "Set a target amount and date for a financial goal.";
}

function getNamePlaceholder(resource: IntelligenceResource) {
  if (resource === "account") return "Account name, e.g. Cash or HDFC Bank";
  if (resource === "investment") return "Symbol, e.g. INFY or NIFTYBEES";
  if (resource === "goal") return "Goal name, e.g. Emergency fund";

  return `${titleCase(resource)} name`;
}

function getTypePlaceholder(resource: IntelligenceResource) {
  if (resource === "account") {
    return "Account type, e.g. bank, cash, credit_card";
  }

  if (resource === "asset") {
    return "Asset type, e.g. mutual_fund, equity, vehicle";
  }

  if (resource === "liability") {
    return "Liability type, e.g. credit_card, personal_loan";
  }

  return "Loan type, e.g. personal_loan";
}

export function FinancialIntelligenceScreen({
  route,
}: FinancialIntelligenceScreenProps) {
  const requestedResource = route.params?.initialResource ?? "account";
  const accounts = useOfflineStore((state) => state.accounts);
  const assets = useOfflineStore((state) => state.assets);
  const liabilities = useOfflineStore((state) => state.liabilities);
  const loans = useOfflineStore((state) => state.loans);
  const investments = useOfflineStore((state) => state.investments);
  const goals = useOfflineStore((state) => state.goals);
  const transactions = useOfflineStore((state) => state.transactions);
  const exchangeRates = useOfflineStore((state) => state.exchangeRates);
  const createAccount = useOfflineStore((state) => state.createAccount);
  const updateAccount = useOfflineStore((state) => state.updateAccount);
  const deleteAccount = useOfflineStore((state) => state.deleteAccount);
  const createAsset = useOfflineStore((state) => state.createAsset);
  const updateAsset = useOfflineStore((state) => state.updateAsset);
  const deleteAsset = useOfflineStore((state) => state.deleteAsset);
  const createLiability = useOfflineStore((state) => state.createLiability);
  const updateLiability = useOfflineStore((state) => state.updateLiability);
  const deleteLiability = useOfflineStore((state) => state.deleteLiability);
  const createLoan = useOfflineStore((state) => state.createLoan);
  const updateLoan = useOfflineStore((state) => state.updateLoan);
  const deleteLoan = useOfflineStore((state) => state.deleteLoan);
  const createInvestment = useOfflineStore((state) => state.createInvestment);
  const updateInvestment = useOfflineStore((state) => state.updateInvestment);
  const deleteInvestment = useOfflineStore((state) => state.deleteInvestment);
  const createGoal = useOfflineStore((state) => state.createGoal);
  const updateGoal = useOfflineStore((state) => state.updateGoal);
  const deleteGoal = useOfflineStore((state) => state.deleteGoal);
  const synchronize = useSyncStore((state) => state.synchronize);
  const lastAppliedFormIntentId = useRef<number | undefined>(undefined);
  const [resource, setResource] =
    useState<IntelligenceResource>(requestedResource);
  const [advancedModalVisible, setAdvancedModalVisible] = useState(
    requestedResource !== "account"
  );
  const [editing, setEditing] = useState<IntelligenceItem | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState(getDefaultResourceType(requestedResource));
  const [currency, setCurrency] = useState("INR");
  const [amount, setAmount] = useState("");
  const [secondaryAmount, setSecondaryAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [liabilityId, setLiabilityId] = useState("");
  const [payments, setPayments] = useState("0");
  const [exchange, setExchange] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSavingResource, setIsSavingResource] = useState(false);
  const resourceSavingRef = useRef(false);
  const overview = useMemo(
    () =>
      MobileDashboardService.getFinancialIntelligenceOverview({
        accounts,
        assets,
        baseCurrency: "INR",
        exchangeRates,
        goals,
        investments,
        liabilities,
        loans,
        transactions,
      }),
    [
      accounts,
      assets,
      exchangeRates,
      goals,
      investments,
      liabilities,
      loans,
      transactions,
    ]
  );
  const totalAccountBalance = overview.accounts.reduce(
    (total, account) => total + account.currentBalance,
    0
  );

  const resetForm = useCallback((nextResource: IntelligenceResource) => {
    setResource(nextResource);
    setEditing(null);
    setName("");
    setType(getDefaultResourceType(nextResource));
    setCurrency("INR");
    setAmount("");
    setSecondaryAmount("");
    setQuantity("1");
    setRate("0");
    setDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setStatus("active");
    setLiabilityId(liabilities[0]?.id ?? "");
    setPayments("0");
    setExchange("");
    setNotes("");
    setError(null);
  }, [liabilities]);

  useEffect(() => {
    const nextResource = route.params?.initialResource;
    const formIntentId = route.params?.formIntentId;

    if (!nextResource || lastAppliedFormIntentId.current === formIntentId) {
      return;
    }

    lastAppliedFormIntentId.current = formIntentId;
    resetForm(nextResource);
    setAdvancedModalVisible(nextResource !== "account");
  }, [
    resetForm,
    route.params?.formIntentId,
    route.params?.initialResource,
  ]);

  function loadForEdit(nextResource: IntelligenceResource, item: IntelligenceItem) {
    resetForm(nextResource);
    setEditing(item);
    setAdvancedModalVisible(nextResource !== "account");

    if (nextResource === "account") {
      const account = item as CachedAccount;
      setName(account.name);
      setType(account.account_type);
      setCurrency(account.currency);
      setAmount(account.opening_balance.toString());
      setNotes(account.institution ?? "");
    }

    if (nextResource === "asset") {
      const asset = item as CachedAsset;
      setName(asset.name);
      setType(asset.asset_type);
      setCurrency(asset.currency);
      setAmount(asset.current_valuation.toString());
      setSecondaryAmount(asset.acquisition_value.toString());
      setQuantity(asset.quantity.toString());
      setDate(asset.acquisition_date);
      setNotes(asset.notes ?? "");
    }

    if (nextResource === "liability") {
      const liability = item as CachedLiability;
      setName(liability.name);
      setType(liability.liability_type);
      setCurrency(liability.currency);
      setAmount(liability.outstanding_balance.toString());
      setSecondaryAmount(liability.original_amount.toString());
      setRate(liability.interest_rate.toString());
      setDate(liability.start_date);
      setEndDate(liability.end_date ?? "");
    }

    if (nextResource === "loan") {
      const loan = item as CachedLoan;
      setType(loan.loan_type);
      setLiabilityId(loan.liability_id);
      setAmount(loan.monthly_payment.toString());
      setSecondaryAmount(loan.interest_accrued.toString());
      setPayments(loan.remaining_payments.toString());
    }

    if (nextResource === "investment") {
      const investment = item as CachedInvestment;
      setName(investment.symbol);
      setCurrency(investment.currency);
      setAmount(investment.average_purchase_price.toString());
      setSecondaryAmount((investment.current_price ?? 0).toString());
      setQuantity(investment.quantity.toString());
      setExchange(investment.exchange ?? "");
    }

    if (nextResource === "goal") {
      const goal = item as CachedGoal;
      setName(goal.name);
      setCurrency(goal.currency);
      setAmount(goal.target_amount.toString());
      setDate(goal.target_date ?? "");
      setStatus(goal.status);
    }
  }

  function editAccount(account: CachedAccount) {
    loadForEdit("account", account);
  }

  function closeAccountEdit() {
    if (!isSavingResource) {
      resetForm("account");
    }
  }

  function parseNumber(value: string, label: string, allowZero = false) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) {
      throw new Error(label);
    }

    return parsed;
  }

  function requireText(value: string, label: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error(label);
    }

    return trimmed;
  }

  async function handleSave() {
    if (resourceSavingRef.current) {
      return;
    }

    resourceSavingRef.current = true;
    setIsSavingResource(true);

    try {
      setError(null);
      const savedResource = resource;

      if (resource === "account") {
        const accountName = requireText(name, "Enter an account name.");
        const accountCurrency = requireText(currency, "Enter a currency.");
        const payload: AccountLike = {
          name: accountName,
          account_type: (type || "bank") as AccountType,
          currency: accountCurrency,
          opening_balance: parseNumber(amount || "0", "Enter an opening balance.", true),
          institution: notes.trim() || null,
          archived: (editing as CachedAccount | null)?.archived ?? false,
        };
        if (editing) {
          await updateAccount(editing.id, payload);
        } else {
          await createAccount(payload);
        }
      }

      if (resource === "asset") {
        const assetName = requireText(name, "Enter an asset name.");
        const assetType = requireText(type, "Enter an asset type.");
        const assetCurrency = requireText(currency, "Enter a currency.");
        const acquisitionDate = requireText(date, "Enter an acquisition date.");
        const payload: AssetLike = {
          name: assetName,
          asset_type: assetType as AssetType,
          currency: assetCurrency,
          quantity: parseNumber(quantity, "Enter a quantity."),
          acquisition_value: parseNumber(
            secondaryAmount || "0",
            "Enter an acquisition value.",
            true
          ),
          current_valuation: parseNumber(amount, "Enter a valuation."),
          acquisition_date: acquisitionDate,
          notes: notes.trim() || null,
        };
        if (editing) {
          await updateAsset(editing.id, payload);
        } else {
          await createAsset(payload);
        }
      }

      if (resource === "liability") {
        const liabilityName = requireText(name, "Enter a liability name.");
        const liabilityType = requireText(type, "Enter a liability type.");
        const liabilityCurrency = requireText(currency, "Enter a currency.");
        const startDate = requireText(date, "Enter a start date.");
        const payload: LiabilityLike = {
          name: liabilityName,
          liability_type: liabilityType as LiabilityType,
          currency: liabilityCurrency,
          outstanding_balance: parseNumber(amount, "Enter a balance."),
          original_amount: parseNumber(secondaryAmount, "Enter an original amount."),
          interest_rate: parseNumber(rate || "0", "Enter an interest rate.", true),
          start_date: startDate,
          end_date: endDate || null,
        };
        if (editing) {
          await updateLiability(editing.id, payload);
        } else {
          await createLiability(payload);
        }
      }

      if (resource === "loan") {
        if (!liabilityId) {
          throw new Error("Create or select a liability first.");
        }
        const loanType = requireText(type, "Enter a loan type.");
        const payload: LoanLike = {
          liability_id: liabilityId,
          loan_type: loanType as LoanType,
          monthly_payment: parseNumber(amount, "Enter a monthly payment."),
          remaining_payments: parseNumber(
            payments || "0",
            "Enter remaining payments.",
            true
          ),
          interest_accrued: parseNumber(
            secondaryAmount || "0",
            "Enter accrued interest.",
            true
          ),
        };
        if (editing) {
          await updateLoan(editing.id, payload);
        } else {
          await createLoan(payload);
        }
      }

      if (resource === "investment") {
        const symbol = requireText(name, "Enter an investment symbol.");
        const investmentCurrency = requireText(currency, "Enter a currency.");
        const payload: InvestmentLike = {
          symbol: symbol.toUpperCase(),
          quantity: parseNumber(quantity, "Enter a quantity."),
          average_purchase_price: parseNumber(amount, "Enter an average price."),
          current_price: secondaryAmount
            ? parseNumber(secondaryAmount, "Enter a current price.", true)
            : null,
          currency: investmentCurrency,
          exchange: exchange.trim() || null,
          purchase_history: (editing as CachedInvestment | null)?.purchase_history ?? [],
        };
        if (editing) {
          await updateInvestment(editing.id, payload);
        } else {
          await createInvestment(payload);
        }
      }

      if (resource === "goal") {
        const goalName = requireText(name, "Enter a goal name.");
        const goalCurrency = requireText(currency, "Enter a currency.");
        const payload: GoalLike = {
          name: goalName,
          target_amount: parseNumber(amount, "Enter a target amount."),
          currency: goalCurrency,
          target_date: date || null,
          status,
        };
        if (editing) {
          await updateGoal(editing.id, payload);
        } else {
          await createGoal(payload);
        }
      }

      await synchronize();
      if (savedResource === "account") {
        resetForm("account");
      } else {
        setAdvancedModalVisible(false);
        resetForm("account");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save resource."
      );
    } finally {
      resourceSavingRef.current = false;
      setIsSavingResource(false);
    }
  }

  async function handleDelete(kind: IntelligenceResource, id: string) {
    if (kind === "account") await deleteAccount(id);
    if (kind === "asset") await deleteAsset(id);
    if (kind === "liability") await deleteLiability(id);
    if (kind === "loan") await deleteLoan(id);
    if (kind === "investment") await deleteInvestment(id);
    if (kind === "goal") await deleteGoal(id);
    await synchronize();
  }

  function openAdvancedForm(nextResource: IntelligenceResource) {
    resetForm(nextResource);
    setAdvancedModalVisible(true);
  }

  function closeAdvancedForm() {
    setAdvancedModalVisible(false);
    resetForm("account");
  }

  function renderResourceFields() {
    return (
      <>
        {resource !== "loan" && (
          <TextInput
            onChangeText={setName}
            placeholder={getNamePlaceholder(resource)}
            style={styles.input}
            value={name}
          />
        )}
        {["asset", "liability", "loan"].includes(resource) && (
          <TextInput
            onChangeText={setType}
            placeholder={getTypePlaceholder(resource)}
            style={styles.input}
            value={type}
          />
        )}
        {resource !== "loan" && (
          <TextInput
            onChangeText={setCurrency}
            placeholder="Currency"
            style={styles.input}
            value={currency}
          />
        )}
        {resource === "loan" && (
          <TextInput
            onChangeText={setLiabilityId}
            placeholder="Linked liability ID"
            style={styles.input}
            value={liabilityId}
          />
        )}
        {["asset", "investment"].includes(resource) && (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setQuantity}
            placeholder="Quantity"
            style={styles.input}
            value={quantity}
          />
        )}
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          placeholder={
            resource === "account"
              ? "Opening balance"
              : resource === "asset"
                ? "Current valuation"
                : resource === "liability"
                  ? "Outstanding balance"
                  : resource === "loan"
                    ? "Monthly payment"
                    : resource === "investment"
                      ? "Average purchase price"
                      : "Target amount"
          }
          style={styles.input}
          value={amount}
        />
        {["asset", "liability", "loan", "investment"].includes(resource) && (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setSecondaryAmount}
            placeholder={
              resource === "asset"
                ? "Acquisition value"
                : resource === "liability"
                  ? "Original amount"
                  : resource === "loan"
                    ? "Interest accrued"
                    : "Current price"
            }
            style={styles.input}
            value={secondaryAmount}
          />
        )}
        {resource === "liability" && (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setRate}
            placeholder="Interest rate"
            style={styles.input}
            value={rate}
          />
        )}
        {resource === "loan" && (
          <TextInput
            keyboardType="number-pad"
            onChangeText={setPayments}
            placeholder="Remaining payments"
            style={styles.input}
            value={payments}
          />
        )}
        {["asset", "liability", "goal"].includes(resource) && (
          <TextInput
            onChangeText={setDate}
            placeholder="Date"
            style={styles.input}
            value={date}
          />
        )}
        {resource === "liability" && (
          <TextInput
            onChangeText={setEndDate}
            placeholder="End date"
            style={styles.input}
            value={endDate}
          />
        )}
        {resource === "goal" && (
          <TextInput
            onChangeText={(value) => setStatus(value as GoalStatus)}
            placeholder="Status"
            style={styles.input}
            value={status}
          />
        )}
        {resource === "investment" && (
          <TextInput
            onChangeText={setExchange}
            placeholder="Exchange"
            style={styles.input}
            value={exchange}
          />
        )}
        {["account", "asset"].includes(resource) && (
          <TextInput
            onChangeText={setNotes}
            placeholder={resource === "account" ? "Institution" : "Notes"}
            style={styles.input}
            value={notes}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.addAccountHeader}>
          <Text style={styles.addAccountTitle}>Add Account</Text>
          <Text style={styles.pageIntro}>
            Start with the money you use every day. Add cash, bank accounts,
            cards, or wallets before turning on optional net worth tracking.
          </Text>
        </View>

        <View style={styles.accountBalanceCard}>
          <View style={styles.accountBalanceCopy}>
            <Text style={styles.accountBalanceLabel}>Total account balance</Text>
            <Text style={styles.accountBalanceValue}>
              {MobileDashboardService.getFormattedBalance(totalAccountBalance)}
            </Text>
            <Text style={styles.accountBalanceHint}>
              Cash, bank, cards and wallets
            </Text>
          </View>
          <View style={styles.balanceIllustration}>
            <View style={styles.illustrationBank}>
              <Landmark color="#0f172a" size={23} strokeWidth={2.6} />
            </View>
            <View style={styles.illustrationCard}>
              <CreditCard color="#ffffff" size={17} strokeWidth={2.6} />
            </View>
            <View style={styles.illustrationCoin}>
              <IndianRupee color="#ffffff" size={11} strokeWidth={3} />
            </View>
          </View>
        </View>

        <View style={styles.accountFormCard}>
          <View style={styles.accountFormModeHeader}>
            <View style={styles.accountFormModeCopy}>
              <Text style={styles.accountFormModeTitle}>New account</Text>
              <Text style={styles.accountFormModeText}>
                Enter the details for the account you want to track.
              </Text>
            </View>
          </View>

          <Text style={styles.accountSectionLabel}>Choose account type</Text>
          <View style={styles.accountTypeGrid}>
            {accountTypeOptions.map((accountType) => (
              <AccountTypeOption
                accountType={accountType}
                active={type === accountType}
                key={accountType}
                onPress={() => setType(accountType)}
              />
            ))}
          </View>

          <View style={styles.accountDivider} />
          <Text style={styles.accountSectionLabel}>Account details</Text>

          <AccountInputField
            icon={<Landmark color="#7b8494" size={18} strokeWidth={2.2} />}
            onChangeText={setName}
            placeholder="Account name"
            supportingText="e.g. Cash or HDFC Bank"
            value={name}
          />
          <AccountInputField
            icon={<IndianRupee color="#7b8494" size={18} strokeWidth={2.4} />}
            onChangeText={setCurrency}
            placeholder="Currency"
            value={currency}
          />
          <AccountInputField
            icon={<CreditCard color="#7b8494" size={18} strokeWidth={2.2} />}
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="Opening balance"
            value={amount}
          />
          <AccountInputField
            icon={<Building2 color="#7b8494" size={18} strokeWidth={2.2} />}
            onChangeText={setNotes}
            placeholder="Institution"
            value={notes}
          />
          {resource === "account" && error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.accountFormActions}>
            <Pressable
              disabled={isSavingResource}
              onPress={() => {
                setResource("account");
                void handleSave();
              }}
              style={[
                styles.accountSaveButton,
                isSavingResource && styles.saveButtonDisabled,
              ]}
            >
              <Text style={styles.accountSaveButtonText}>
                {isSavingResource ? "Saving..." : "Add Account"}
              </Text>
            </Pressable>
          </View>
        </View>

        {overview.accounts.length > 0 && (
          <Text style={styles.sectionTitle}>Your accounts</Text>
        )}
        {overview.accounts.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>No accounts yet</Text>
            <Text style={styles.muted}>
              Add your cash, bank account, card, or wallet to start tracking
              balances.
            </Text>
          </View>
        ) : (
          overview.accounts.map((account) => (
            <ResourceRow
              key={account.account.id}
              title={account.account.name}
              subtitle={`${titleCase(account.account.account_type)} • ${MobileDashboardService.getFormattedBalance(account.currentBalance)}`}
              onEdit={() => editAccount(account.account as CachedAccount)}
              onDelete={() =>
                void handleDelete("account", account.account.id ?? "")
              }
            />
          ))
        )}

        <View style={styles.optionalSection}>
          <View style={styles.optionalHeader}>
            <View style={styles.rowTitleBlock}>
              <Text style={styles.optionalTitle}>Net worth tracking</Text>
              <Text style={styles.optionalText}>
                Add assets, debt, investments, loans, or goals when you want a
                fuller financial picture.
              </Text>
            </View>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          </View>
          <View style={styles.compactMetricRow}>
            <CompactMetric
              label="Net worth"
              value={overview.netWorth.netWorth}
            />
            <CompactMetric
              label="Debt"
              value={overview.netWorth.totalLiabilities}
            />
          </View>
          <View style={styles.optionalActions}>
            {advancedResourceTabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => openAdvancedForm(tab)}
                style={styles.advancedPill}
              >
                <Plus color="#334155" size={14} strokeWidth={2.8} />
                <Text style={styles.segmentText}>{titleCase(tab)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {overview.goals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Goals</Text>
            {overview.goals.map((goal) => (
              <ResourceRow
                key={goal.goal.id}
                title={goal.goal.name}
                subtitle={`${titleCase(goal.goal.status)} • ${formatPercent(goal.progressPercentage)}`}
                onEdit={() => loadForEdit("goal", goal.goal as CachedGoal)}
                onDelete={() => void handleDelete("goal", goal.goal.id ?? "")}
              />
            ))}
          </>
        )}

        {assets.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Assets</Text>
            {assets.map((asset) => (
              <ResourceRow
                key={asset.id}
                title={asset.name}
                subtitle={`${titleCase(asset.asset_type)} • ${MobileDashboardService.getFormattedBalance(asset.current_valuation)}`}
                onEdit={() => loadForEdit("asset", asset)}
                onDelete={() => void handleDelete("asset", asset.id)}
              />
            ))}
          </>
        )}

        {liabilities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Liabilities</Text>
            {liabilities.map((liability) => (
              <ResourceRow
                key={liability.id}
                title={liability.name}
                subtitle={`${titleCase(liability.liability_type)} • ${MobileDashboardService.getFormattedBalance(liability.outstanding_balance)}`}
                onEdit={() => loadForEdit("liability", liability)}
                onDelete={() => void handleDelete("liability", liability.id)}
              />
            ))}
          </>
        )}

        {overview.investments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Investments</Text>
            {overview.investments.map((investment) => (
              <ResourceRow
                key={investment.investment.id}
                title={investment.investment.symbol}
                subtitle={`${MobileDashboardService.getFormattedBalance(investment.marketValue)} • ${MobileDashboardService.getFormattedBalance(investment.gainLoss)}`}
                onEdit={() =>
                  loadForEdit(
                    "investment",
                    investment.investment as CachedInvestment
                  )
                }
                onDelete={() =>
                  void handleDelete("investment", investment.investment.id ?? "")
                }
              />
            ))}
          </>
        )}

        {overview.loans.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Loans</Text>
            {overview.loans.map((loan) => (
              <ResourceRow
                key={loan.loan.id}
                title={titleCase(loan.loan.loan_type)}
                subtitle={`${loan.loan.remaining_payments} payments • ${MobileDashboardService.getFormattedBalance(loan.projectedRemainingPaymentTotal)}`}
                onEdit={() => loadForEdit("loan", loan.loan as CachedLoan)}
                onDelete={() => void handleDelete("loan", loan.loan.id ?? "")}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="none"
        onRequestClose={closeAccountEdit}
        transparent
        visible={Boolean(editing && resource === "account")}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close account editor"
            onPress={closeAccountEdit}
            style={styles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={styles.modalPanel}
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.rowTitleBlock}>
                  <Text style={styles.sectionTitle}>Edit account</Text>
                  <Text style={styles.muted}>
                    Update the prefilled details for{" "}
                    {(editing as CachedAccount | null)?.name ?? "this account"}.
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close account editor"
                  accessibilityRole="button"
                  disabled={isSavingResource}
                  onPress={closeAccountEdit}
                  style={styles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              <Text style={styles.accountSectionLabel}>Choose account type</Text>
              <View style={styles.accountTypeGrid}>
                {accountTypeOptions.map((accountType) => (
                  <AccountTypeOption
                    accountType={accountType}
                    active={type === accountType}
                    key={accountType}
                    onPress={() => setType(accountType)}
                  />
                ))}
              </View>

              <View style={styles.accountDivider} />
              <Text style={styles.accountSectionLabel}>Account details</Text>
              <AccountInputField
                icon={<Landmark color="#7b8494" size={18} strokeWidth={2.2} />}
                onChangeText={setName}
                placeholder="Account name"
                supportingText="e.g. Cash or HDFC Bank"
                value={name}
              />
              <AccountInputField
                icon={<IndianRupee color="#7b8494" size={18} strokeWidth={2.4} />}
                onChangeText={setCurrency}
                placeholder="Currency"
                value={currency}
              />
              <AccountInputField
                icon={<CreditCard color="#7b8494" size={18} strokeWidth={2.2} />}
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                placeholder="Opening balance"
                value={amount}
              />
              <AccountInputField
                icon={<Building2 color="#7b8494" size={18} strokeWidth={2.2} />}
                onChangeText={setNotes}
                placeholder="Institution"
                value={notes}
              />

              {resource === "account" && error ? (
                <Text style={styles.error}>{error}</Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  disabled={isSavingResource}
                  onPress={() => void handleSave()}
                  style={[
                    styles.primaryButton,
                    isSavingResource && styles.saveButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSavingResource ? "Saving..." : "Update Account"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isSavingResource}
                  onPress={closeAccountEdit}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </View>
      </Modal>

      <Modal
        animationType="none"
        onRequestClose={closeAdvancedForm}
        transparent
        visible={advancedModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close"
            onPress={closeAdvancedForm}
            style={styles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={styles.modalPanel}
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.rowTitleBlock}>
                  <Text style={styles.sectionTitle}>
                    {editing ? "Edit" : "Add"} {resourceLabels[resource]}
                  </Text>
                  <Text style={styles.muted}>{getResourceHelpText(resource)}</Text>
                </View>
                <Pressable
                  onPress={closeAdvancedForm}
                  style={styles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              {renderResourceFields()}

              {error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.actions}>
                <Pressable
                  disabled={isSavingResource}
                  onPress={handleSave}
                  style={[
                    styles.primaryButton,
                    isSavingResource && styles.saveButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSavingResource
                      ? "Saving..."
                      : `Save ${resourceLabels[resource]}`}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={closeAdvancedForm}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </View>
      </Modal>
    </>
  );
}

function ResourceRow({
  onDelete,
  onEdit,
  subtitle,
  title,
}: {
  onDelete: () => void;
  onEdit: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleBlock}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.muted}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.dangerButton}>
          <Text style={styles.dangerButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AccountTypeOption({
  accountType,
  active,
  onPress,
}: {
  accountType: AccountType;
  active: boolean;
  onPress: () => void;
}) {
  const visual = getAccountTypeVisual(accountType);
  const Icon = visual.Icon;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.accountTypeCard, active && styles.accountTypeCardActive]}
    >
      <View
        style={[
          styles.accountTypeIcon,
          {
            backgroundColor: visual.background,
          },
        ]}
      >
        <Icon
          color={active ? "#0f172a" : visual.color}
          size={16}
          strokeWidth={2.6}
        />
      </View>
      <Text
        style={[
          styles.accountTypeText,
          active && styles.accountTypeTextActive,
        ]}
      >
        {titleCase(accountType)}
      </Text>
    </Pressable>
  );
}

function AccountInputField({
  icon,
  supportingText,
  style,
  ...props
}: TextInputProps & {
  icon: ReactNode;
  supportingText?: string;
}) {
  return (
    <View style={styles.accountInputRow}>
      <View style={styles.accountInputIcon}>{icon}</View>
      <View style={styles.accountInputTextBlock}>
        <TextInput
          placeholderTextColor="#737d8c"
          style={[styles.accountInput, style]}
          {...props}
        />
        {supportingText && !props.value ? (
          <Text style={styles.accountInputSupport}>{supportingText}</Text>
        ) : null}
      </View>
    </View>
  );
}

function getAccountTypeVisual(accountType: AccountType) {
  if (accountType === "cash") {
    return {
      background: "#dcfce7",
      color: "#22c55e",
      Icon: Wallet,
    };
  }

  if (accountType === "credit_card") {
    return {
      background: "#f3e8ff",
      color: "#a855f7",
      Icon: CreditCard,
    };
  }

  if (accountType === "digital_wallet") {
    return {
      background: "#ffedd5",
      color: "#f97316",
      Icon: Wallet,
    };
  }

  return {
    background: "#f1f5f9",
    color: "#0f172a",
    Icon: Landmark,
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getJsonObject(value: Json | null | undefined) {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? value
    : {};
}

function getEventRuleCategoryId(value: Json | null | undefined) {
  const categoryId = getJsonObject(value).rule_category_id;

  return typeof categoryId === "string" && categoryId.trim()
    ? categoryId
    : null;
}

function getEventAccountId(value: Json | null | undefined) {
  const accountId = getJsonObject(value).account_id;

  return typeof accountId === "string" && accountId.trim()
    ? accountId
    : null;
}

function groupTransactionsByRecency<T extends { occurred_at: string }>(
  transactions: T[]
) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const groups: {
    label: string;
    transactions: T[];
  }[] = [];

  transactions
    .slice()
    .sort(
      (first, second) =>
        new Date(second.occurred_at).getTime() -
        new Date(first.occurred_at).getTime()
    )
    .forEach((transaction) => {
      const date = startOfDay(new Date(transaction.occurred_at));
      let label = "Earlier";

      if (date.getTime() === today.getTime()) {
        label = "Today";
      } else if (date.getTime() === yesterday.getTime()) {
        label = "Yesterday";
      } else if (date >= weekStart) {
        label = "Earlier This Week";
      }

      let group = groups.find((item) => item.label === label);
      if (!group) {
        group = {
          label,
          transactions: [],
        };
        groups.push(group);
      }
      group.transactions.push(transaction);
    });

  return groups;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTransactionTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSignedTransactionAmount(amount: number, type: TransactionType) {
  if (type === "income" || type === "refund") {
    return Math.abs(amount);
  }

  return -Math.abs(amount);
}

function formatSignedTransactionAmount(amount: number) {
  const formatted = MobileDashboardService.getFormattedBalance(Math.abs(amount));

  return `${amount > 0 ? "+" : "-"}${formatted}`;
}

function getTransactionMerchantDisplay(transaction: CachedTransaction) {
  const registeredName = transaction.merchant?.name?.trim();
  const rawName = transaction.event?.merchant_name_raw?.trim();

  if (registeredName) {
    return {
      name: registeredName,
      registered: true,
    };
  }

  if (rawName) {
    return {
      name: rawName,
      registered: false,
    };
  }

  return {
    name: "Unknown merchant",
    registered: false,
  };
}

function getTransactionIcon(categoryName: string, type: TransactionType) {
  const normalized = categoryName.toLowerCase();

  if (type === "income") {
    return {
      background: "#dcfce7",
      color: "#16a34a",
      Icon: Wallet,
    };
  }

  if (type === "transfer") {
    return {
      background: "#f1f5f9",
      color: "#0f172a",
      Icon: ArrowLeftRight,
    };
  }

  if (normalized.includes("food") || normalized.includes("dining")) {
    return {
      background: "#dcfce7",
      color: "#16a34a",
      Icon: Utensils,
    };
  }

  if (normalized.includes("transport") || normalized.includes("fuel")) {
    return {
      background: "#fee2e2",
      color: "#ef4444",
      Icon: Fuel,
    };
  }

  if (normalized.includes("utilities") || normalized.includes("mobile")) {
    return {
      background: "#ede9fe",
      color: "#7c3aed",
      Icon: Smartphone,
    };
  }

  if (normalized.includes("shopping")) {
    return {
      background: "#fef3c7",
      color: "#f59e0b",
      Icon: ShoppingCart,
    };
  }

  if (normalized.includes("bank")) {
    return {
      background: "#f1f5f9",
      color: "#0f172a",
      Icon: Landmark,
    };
  }

  return {
    background: "#f1f5f9",
    color: "#0f172a",
    Icon: Store,
  };
}

function ReportMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
    </View>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.compactMetric}>
      <Text style={styles.compactMetricLabel}>{label}</Text>
      <Text style={styles.compactMetricValue}>
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  analyticsCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  analyticsCategoryAmount: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
    minWidth: 60,
    textAlign: "right",
  },
  analyticsCategoryBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  analyticsCategoryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 22,
    borderWidth: 1,
    gap: 18,
    padding: 14,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.04,
    shadowRadius: 22,
  },
  analyticsCategoryIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  analyticsCategoryList: {
    flex: 1,
    gap: 9,
    justifyContent: "center",
    minWidth: 0,
  },
  analyticsCategoryName: {
    color: "#0f172a",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 0,
  },
  analyticsCategoryPercent: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "900",
    minWidth: 32,
    textAlign: "right",
  },
  analyticsCategoryRow: {
    alignItems: "center",
    borderBottomColor: "#eef1f5",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingVertical: 6,
  },
  analyticsChartCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 14,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.04,
    shadowRadius: 22,
  },
  analyticsContainer: {
    backgroundColor: "#f8fafc",
    gap: 14,
    padding: 16,
    paddingBottom: 104,
  },
  analyticsDateLeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  analyticsDatePill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 15,
  },
  analyticsDateText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  analyticsDonutCenter: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    height: "48%",
    justifyContent: "center",
    left: "26%",
    paddingHorizontal: 8,
    position: "absolute",
    top: "26%",
    width: "48%",
  },
  analyticsDonutContainer: {
    padding: 8,
  },
  analyticsDonutLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  analyticsDonutValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  analyticsDonutWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  analyticsEmptyText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  analyticsInsightCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  analyticsInsightIcon: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    marginBottom: 3,
    width: 34,
  },
  analyticsInsightLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
  },
  analyticsInsightRow: {
    flexDirection: "row",
    gap: 10,
  },
  analyticsInsightSubtitle: {
    fontSize: 11,
    fontWeight: "900",
  },
  analyticsInsightValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  analyticsLegendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  analyticsLegendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  analyticsLegendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  analyticsLegendText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  analyticsLineChart: {
    marginLeft: -18,
    marginTop: 2,
  },
  analyticsLineChartWrap: {
    marginBottom: -4,
    marginLeft: -4,
    overflow: "hidden",
  },
  analyticsMetricCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 112,
    minWidth: 0,
    paddingHorizontal: 11,
    paddingVertical: 12,
    shadowColor: "#111827",
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.035,
    shadowRadius: 16,
  },
  analyticsMetricHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  analyticsMetricIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  analyticsMetricLabel: {
    color: "#64748b",
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    minWidth: 0,
  },
  analyticsMetricRow: {
    flexDirection: "row",
    gap: 10,
  },
  analyticsMetricValue: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  analyticsRangeButton: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
  },
  analyticsRangeButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#111827",
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  analyticsRangeSelector: {
    backgroundColor: "#eef2f7",
    borderRadius: 17,
    flexDirection: "row",
    gap: 4,
    padding: 5,
  },
  analyticsRangeText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
  },
  analyticsRangeTextActive: {
    color: "#0f172a",
  },
  analyticsSectionTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  analyticsTrendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    minWidth: 0,
  },
  analyticsTrendText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "900",
    minWidth: 0,
  },
  analyticsViewAllText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  accountOptionCheck: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  accountOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountOptionIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  accountOptionMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  accountOptionRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountOptionRowSelected: {
    backgroundColor: "#f8fafc",
    borderColor: "#0f172a",
  },
  accountOptionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  accountPickerAddButton: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  accountPickerAddButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  accountPickerContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 28,
  },
  accountPickerList: {
    gap: 9,
    paddingBottom: 4,
  },
  accountPickerListViewport: {
    maxHeight: 360,
  },
  accountPickerSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  accountPickerTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
  },
  accountPickerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  accountSelect: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 68,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  accountSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountSelectIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  accountSelectLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
  },
  accountSelectMeta: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  accountSelectPlaceholder: {
    color: "#8b929d",
  },
  accountSelectValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  accountBalanceCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountBalanceCard: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accountBalanceHint: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },
  accountBalanceLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
  },
  accountBalanceValue: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 7,
  },
  accountDivider: {
    backgroundColor: "#eef2f7",
    height: 1,
  },
  accountFormActions: {
    marginTop: 12,
  },
  accountFormCloseButton: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  accountFormCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
    shadowColor: "#111827",
    shadowOffset: {
      height: 16,
      width: 0,
    },
    shadowOpacity: 0.06,
    shadowRadius: 28,
  },
  accountFormModeCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountFormModeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  accountFormModeText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  accountFormModeTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  accountFormHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  accountFormIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  accountFormText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  accountFormTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  accountInput: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
    minHeight: 20,
    paddingVertical: 0,
  },
  accountInputIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 11,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  accountInputRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  accountInputSupport: {
    color: "#9aa4b5",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  accountInputTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  accountSaveButton: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  accountSaveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  accountSectionLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  accountTypeCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 76,
    minWidth: 0,
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  accountTypeCardActive: {
    borderColor: "#0f172a",
    borderWidth: 1.5,
  },
  accountTypeGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
  },
  accountTypeIcon: {
    alignItems: "center",
    borderRadius: 11,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  accountTypeText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  accountTypeTextActive: {
    color: "#0f172a",
  },
  addAccountHeader: {
    gap: 8,
  },
  addAccountTitle: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
  },
  amount: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  amountInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
    minHeight: 58,
    paddingVertical: 0,
  },
  amountInputWrap: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  budgetCategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  budgetCategoryIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  budgetCategoryPill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 9,
    width: "48%",
  },
  budgetCategoryPillActive: {
    backgroundColor: "#faf9ff",
    borderColor: "#6d4aff",
    borderWidth: 1.5,
  },
  budgetCategoryText: {
    flex: 1,
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
    minWidth: 0,
  },
  budgetAmountInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    minHeight: 52,
    paddingVertical: 0,
  },
  budgetAmountInputWrap: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  budgetEmptyButton: {
    alignItems: "center",
    borderColor: "#c4b5fd",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 7,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  budgetEmptyButtonText: {
    color: "#6d4aff",
    fontSize: 13,
    fontWeight: "900",
  },
  budgetEmptyCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  budgetEmptyIcon: {
    alignItems: "center",
    backgroundColor: "#f2efff",
    borderRadius: 20,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  budgetEmptyText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 5,
    textAlign: "center",
  },
  budgetEmptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },
  budgetFormCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    shadowColor: "#111827",
    shadowOffset: {
      height: 9,
      width: 0,
    },
    shadowOpacity: 0.035,
    shadowRadius: 20,
  },
  budgetFormHeader: {
    gap: 3,
  },
  budgetListCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  budgetListCount: {
    alignItems: "center",
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  budgetListHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetListSection: {
    gap: 10,
  },
  budgetProgressAmount: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  budgetProgressCopy: {
    flex: 1,
    minWidth: 0,
  },
  budgetProgressFill: {
    borderRadius: 999,
    height: "100%",
  },
  budgetProgressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  budgetProgressIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  budgetProgressName: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  budgetProgressPercent: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  budgetProgressRemaining: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
  },
  budgetProgressRow: {
    gap: 10,
    padding: 14,
  },
  budgetProgressRowDivider: {
    borderBottomColor: "#eef2f7",
    borderBottomWidth: 1,
  },
  budgetProgressTrack: {
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    height: 7,
    overflow: "hidden",
  },
  budgetRing: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  budgetRingLabel: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  budgetRingText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700",
  },
  budgetRingValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  budgetStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  budgetStatusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  budgetsContainer: {
    backgroundColor: "#f8fafc",
    gap: 16,
    padding: 16,
    paddingBottom: 36,
  },
  budgetsHero: {
    gap: 4,
  },
  budgetsSubtitle: {
    color: "#64748b",
    fontSize: 13,
  },
  budgetsTitle: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900",
  },
  budgetSummaryCard: {
    backgroundColor: "#0f172a",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  budgetSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  budgetSummaryDate: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "800",
  },
  budgetSummaryFooter: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  budgetSummaryLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  budgetSummaryMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    padding: 17,
  },
  budgetSummaryTotal: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 5,
  },
  budgetSummaryValue: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 5,
  },
  advancedPill: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ee",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  compactMetric: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  compactMetricLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  compactMetricRow: {
    flexDirection: "row",
    gap: 10,
  },
  compactMetricValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },
  container: {
    backgroundColor: "#f8fafc",
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  dangerButton: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "900",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "700",
  },
  eventReviewActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  eventReviewAmount: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  eventReviewCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: "#111827",
    shadowOffset: {
      height: 12,
      width: 0,
    },
    shadowOpacity: 0.04,
    shadowRadius: 22,
  },
  eventReviewCategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eventReviewCategoryPill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    maxWidth: "48%",
    paddingHorizontal: 12,
  },
  eventReviewCategoryPillActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  eventReviewCategoryText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  eventReviewCategoryTextActive: {
    color: "#ffffff",
  },
  eventReviewContainer: {
    backgroundColor: "#f8fafc",
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  eventReviewIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 17,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  eventReviewMerchant: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  eventReviewMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  eventReviewAccountMeta: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  eventReviewAccountMetaEmpty: {
    color: "#94a3b8",
  },
  eventReviewPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 15,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  eventReviewPrimaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  eventReviewSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ee",
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  eventReviewSecondaryButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  eventReviewSectionTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  eventReviewSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  eventReviewSummaryCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  eventReviewSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventReviewTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 16,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  balanceIllustration: {
    alignItems: "center",
    height: 72,
    justifyContent: "center",
    position: "relative",
    width: 88,
  },
  illustrationBank: {
    alignItems: "center",
    backgroundColor: "#dbe4ff",
    borderRadius: 15,
    height: 54,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    top: 4,
    width: 54,
  },
  illustrationCard: {
    alignItems: "center",
    backgroundColor: "#65c783",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 32,
    transform: [{ rotate: "8deg" }],
    width: 40,
  },
  illustrationCoin: {
    alignItems: "center",
    backgroundColor: "#e6c84f",
    borderRadius: 11,
    bottom: 8,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    width: 22,
  },
  list: {
    gap: 14,
  },
  metric: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 15,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 13,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  modalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  modalContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 30,
  },
  modalDismissLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  modalPanel: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "86%",
    overflow: "hidden",
  },
  merchantAddButton: {
    alignItems: "center",
    backgroundColor: "#5636f5",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    shadowColor: "#5636f5",
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    width: 44,
  },
  merchantAddButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  merchantAvatar: {
    alignItems: "center",
    borderRadius: 15,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  merchantAvatarText: {
    fontSize: 15,
    fontWeight: "900",
  },
  merchantCategoryLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 5,
  },
  merchantCategoryOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  merchantCategoryOptionActive: {
    backgroundColor: "#f7f5ff",
    borderColor: "#6d4aff",
  },
  merchantCategoryOptionIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  merchantCategoryOptionText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  merchantCategoryOptions: {
    gap: 9,
    paddingRight: 18,
  },
  merchantDirectoryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#edf0f5",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.035,
    shadowRadius: 18,
  },
  merchantDirectoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  merchantDirectoryEmpty: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 38,
  },
  merchantDirectoryEmptyIcon: {
    alignItems: "center",
    backgroundColor: "#f0edff",
    borderRadius: 19,
    height: 50,
    justifyContent: "center",
    marginBottom: 12,
    width: 50,
  },
  merchantDirectoryMeta: {
    color: "#64748b",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  merchantDirectoryName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  merchantDirectoryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  merchantDirectoryRowDivider: {
    borderBottomColor: "#eef2f7",
    borderBottomWidth: 1,
  },
  merchantDirectoryRowPressed: {
    backgroundColor: "#f8fafc",
  },
  merchantDirectorySearch: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ed",
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  merchantDirectorySearchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 50,
    paddingVertical: 0,
  },
  merchantEmptyButton: {
    alignItems: "center",
    backgroundColor: "#5636f5",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    marginTop: 16,
    minHeight: 42,
    paddingHorizontal: 17,
  },
  merchantEmptyButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  merchantFormActions: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    width: "100%",
  },
  merchantFormButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  merchantFormCancelButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ed",
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    flex: 0.8,
  },
  merchantFormCancelButtonText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "900",
  },
  merchantFormPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#5636f5",
    borderRadius: 17,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
    shadowColor: "#5636f5",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    flex: 1.5,
  },
  merchantFormPrimaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  merchantEmptyState: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#eef2f7",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  merchantEmptyText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  merchantEmptyTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  merchantListCount: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  merchantListHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  merchantsContainer: {
    gap: 18,
    padding: 16,
    paddingBottom: 108,
  },
  merchantsHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  merchantsSubtitle: {
    color: "#64748b",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  merchantSearchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  merchantSortButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ed",
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  merchantSortButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  merchantSortLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
  },
  merchantSortOption: {
    alignItems: "center",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  merchantSortOptionActive: {
    backgroundColor: "#f7f5ff",
    borderColor: "#6d4aff",
  },
  merchantSortOptionText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
  merchantSortOptionTextActive: {
    color: "#5636f5",
  },
  merchantSortOptions: {
    gap: 9,
    marginTop: 18,
  },
  merchantSortPanel: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 30,
  },
  merchantUsageBlock: {
    alignItems: "flex-end",
    minWidth: 62,
  },
  merchantUsageCount: {
    color: "#5636f5",
    fontSize: 16,
    fontWeight: "900",
  },
  merchantUsageLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
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
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  merchantOptionRowSelected: {
    borderColor: "#0f172a",
    backgroundColor: "#f8fafc",
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
  merchantPickerSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  merchantPickerTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
  },
  merchantPickerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  merchantSearchBar: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ee",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  merchantSearchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 48,
    paddingVertical: 0,
  },
  merchantSelect: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  merchantSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  merchantSelectIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  merchantSelectLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
  },
  merchantSelectPlaceholder: {
    color: "#8b929d",
  },
  merchantSelectValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
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
  muted: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 4,
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
    backgroundColor: "#f8fafc",
    borderColor: "#0f172a",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currencyPrefix: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
  },
  notesInput: {
    minHeight: 84,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  optionalSection: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  optionalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  optionalBadgeText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
  },
  optionalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  optionalText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  optionalTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  pageIntro: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 999,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  row: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  rowTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  rowTitleBlock: {
    flex: 1,
  },
  saveButtonDisabled: {
    opacity: 0.62,
  },
  screen: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  screenScroll: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ee",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "900",
  },
  section: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "900",
  },
  successText: {
    color: "#16a34a",
    fontSize: 14,
    fontWeight: "800",
  },
  transactionCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 24,
    borderWidth: 1,
    gap: 13,
    padding: 16,
    shadowColor: "#111827",
    shadowOffset: {
      height: 14,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 24,
  },
  transactionCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionCardIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  transactionCardSubtitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  transactionCardTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  transactionContainer: {
    backgroundColor: "#f8fafc",
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  pendingReviewAmount: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  pendingReviewAmountIncome: {
    color: "#16a34a",
  },
  pendingReviewCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.04,
    shadowRadius: 22,
  },
  pendingReviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  pendingReviewCount: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 27,
    minWidth: 27,
    paddingHorizontal: 8,
  },
  pendingReviewCountText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  pendingReviewDate: {
    color: "#7b818c",
    fontSize: 11,
    marginTop: 3,
  },
  pendingReviewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  pendingReviewIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pendingReviewMerchant: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  pendingReviewMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  pendingReviewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 82,
    paddingHorizontal: 14,
  },
  pendingReviewRowDivider: {
    borderBottomColor: "#eef1f5",
    borderBottomWidth: 1,
  },
  pendingReviewRowPressed: {
    backgroundColor: "#f8fafc",
  },
  pendingReviewSection: {
    gap: 9,
  },
  pendingReviewSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  pendingReviewTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  pendingReviewTrailing: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginLeft: 4,
  },
  transactionFab: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 25,
    bottom: 20,
    height: 50,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: 50,
  },
  transactionFilterBar: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    flexDirection: "row",
    gap: 4,
    padding: 6,
    shadowColor: "#111827",
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
  transactionFilterButton: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
  },
  transactionFilterButtonActive: {
    backgroundColor: "#0f172a",
  },
  transactionFilterText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "800",
  },
  transactionFilterTextActive: {
    color: "#ffffff",
  },
  transactionGroup: {
    gap: 9,
  },
  transactionGroupCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.04,
    shadowRadius: 22,
  },
  transactionGroupTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  transactionHero: {
    gap: 4,
    paddingTop: 2,
  },
  transactionInput: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 16,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  transactionListAmount: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 6,
  },
  transactionListAmountIncome: {
    color: "#16a34a",
  },
  transactionListCategory: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  transactionListDetails: {
    flex: 1,
    minWidth: 0,
  },
  transactionMerchantBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    color: "#16a34a",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  transactionListIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  transactionListRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 76,
    paddingHorizontal: 14,
  },
  transactionListRowDivider: {
    borderBottomColor: "#eef1f5",
    borderBottomWidth: 1,
  },
  transactionListTime: {
    color: "#7b818c",
    fontSize: 12,
    marginTop: 3,
  },
  transactionListTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  transactionsEmptyCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eef1f5",
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  transactionsEmptyText: {
    color: "#7b818c",
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  transactionsEmptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  transactionsEndText: {
    color: "#8b929d",
    fontSize: 12,
    textAlign: "center",
  },
  transactionsListContainer: {
    backgroundColor: "#f8fafc",
    gap: 18,
    padding: 16,
    paddingBottom: 96,
  },
  transactionSearchBar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  transactionSearchInput: {
    color: "#9aa0aa",
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    minHeight: 48,
    paddingVertical: 0,
  },
  transactionSaveButton: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 50,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  transactionSaveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  transactionKicker: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  transactionSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  transactionTitle: {
    color: "#0f172a",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 0,
  },
  transactionTypeButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  transactionTypeButtonActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  transactionTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  transactionTypeText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  transactionTypeTextActive: {
    color: "#ffffff",
  },
  segment: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    minWidth: 92,
    paddingHorizontal: 12,
  },
  segmentActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  segmented: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  summary: {
    backgroundColor: "#111827",
    borderRadius: 22,
    padding: 20,
  },
  summaryLabel: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  summaryValue: {
    color: "#ffffff",
    fontSize: 33,
    fontWeight: "900",
    marginTop: 6,
  },
  categoriesContainer: {
    backgroundColor: "#f8fafc",
    gap: 16,
    padding: 16,
    paddingBottom: 36,
  },
  categoriesHero: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  categoriesHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoriesSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  categoriesTitle: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900",
  },
  categoryAddButton: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 15,
    flexDirection: "row",
    gap: 6,
    minHeight: 43,
    paddingHorizontal: 14,
  },
  categoryAddButtonPressed: {
    opacity: 0.78,
  },
  categoryAddButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  categoryColorOption: {
    alignItems: "center",
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 3,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  categoryColorOptionSelected: {
    borderColor: "#0f172a",
  },
  categoryColorOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryEmptyState: {
    alignItems: "center",
    padding: 24,
  },
  categoryEmptyText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 5,
    textAlign: "center",
  },
  categoryEmptyTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryFilterBar: {
    backgroundColor: "#eef2f7",
    borderRadius: 17,
    flexDirection: "row",
    gap: 4,
    padding: 5,
  },
  categoryFilterButton: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
  },
  categoryFilterButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#111827",
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  categoryFilterText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
  },
  categoryFilterTextActive: {
    color: "#0f172a",
  },
  categoryIconOption: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 15,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  categoryListCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e8edf4",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOffset: {
      height: 9,
      width: 0,
    },
    shadowOpacity: 0.035,
    shadowRadius: 20,
  },
  categoryListCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoryListCount: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
  },
  categoryListHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  categoryListIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  categoryListMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  categoryListName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryListRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 14,
  },
  categoryListRowDivider: {
    borderBottomColor: "#eef2f7",
    borderBottomWidth: 1,
  },
  categoryListTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  categoryNameInput: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 15,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  categoryOptionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categorySearchBar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 49,
    paddingHorizontal: 14,
  },
  categorySearchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    minHeight: 48,
    paddingVertical: 0,
  },
  categoryUsageBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    minWidth: 32,
    paddingHorizontal: 9,
  },
  categoryUsageText: {
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: "#0f172a",
    fontSize: 29,
    fontWeight: "900",
  },
});
