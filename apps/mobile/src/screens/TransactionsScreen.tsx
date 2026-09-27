import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MotiView } from "moti";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react-native";
import {
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  type SectionListRenderItem,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import type {
  CachedFinancialEvent,
  CachedTransaction,
} from "@finance/shared-types";

import { TransactionEditModal } from "../components/finance/TransactionEditModal";
import { TransactionIcon } from "../components/finance/TransactionIcon";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import {
  premiumHairline,
  premiumSurface,
  premiumTheme,
} from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";
import {
  formatNeutralTransactionAmount,
  formatSignedTransactionAmount,
  formatTransactionListTimestamp,
  getEventAccountId,
  getFrequentCategoryIds,
  getSignedTransactionAmount,
  getTransactionMerchantDisplay,
  groupTransactionsByRecency,
  startOfDay,
  titleCase,
} from "../utils/financeFormat";

type TransactionsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Transactions"
>;

type TransactionFilter = "all" | "income" | "expense" | "transfer";

// Captured events pile up between reviews; a long queue would push the
// actual history screens down, so the list previews only the newest few.
const PENDING_PREVIEW_COUNT = 3;

type TransactionSection = {
  data: CachedTransaction[];
  key: string;
  label: string;
};

type TransactionDateFilter =
  | "all"
  | "today"
  | "week"
  | "month"
  | "lastMonth"
  | "threeMonths";

const DATE_FILTER_OPTIONS: {
  label: string;
  value: TransactionDateFilter;
}[] = [
  { label: "All time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "week" },
  { label: "This month", value: "month" },
  { label: "Last month", value: "lastMonth" },
  { label: "Last 3 months", value: "threeMonths" },
];

// MotiView is not NativeWind-interop'd, so the dropdown keeps a plain style
// object.
const dateFilterMenuStyle = {
  backgroundColor: "#ffffff",
  borderRadius: 18,
  padding: 6,
  position: "absolute",
  width: 216,
  ...premiumSurface,
  ...premiumTheme.shadow.raised,
} as const;

// The FAB's shadow is bespoke (not a premiumTheme preset), so it stays a
// plain style object.
const fabShadowStyle = {
  // elevation drives the Android shadow; the shadow* props are iOS-only.
  elevation: 10,
  shadowColor: "#111827",
  shadowOffset: {
    height: 10,
    width: 0,
  },
  shadowOpacity: 0.28,
  shadowRadius: 16,
} as const;

// SectionList is not NativeWind-interop'd (its inner VirtualizedList skips
// the wrapped export), so the list keeps plain style objects.
const transactionListStyle = {
  backgroundColor: premiumTheme.colors.canvas,
  flex: 1,
} as const;

const transactionListContentStyle = {
  backgroundColor: premiumTheme.colors.canvas,
  paddingBottom: 96,
  paddingHorizontal: 20,
  paddingTop: 20,
} as const;

function getDateFilterBounds(
  filter: TransactionDateFilter
): { end: Date; start: Date } | null {
  if (filter === "all") return null;

  const now = new Date();
  const today = startOfDay(now);
  const dayAfterToday = new Date(today);
  dayAfterToday.setDate(today.getDate() + 1);

  if (filter === "today") {
    return { end: dayAfterToday, start: today };
  }

  if (filter === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { end: dayAfterToday, start };
  }

  if (filter === "month") {
    return {
      end: dayAfterToday,
      start: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }

  if (filter === "lastMonth") {
    return {
      end: new Date(now.getFullYear(), now.getMonth(), 1),
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    };
  }

  return {
    end: dayAfterToday,
    start: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
  };
}

export function TransactionsScreen({ navigation }: TransactionsScreenProps) {
  const accounts = useOfflineStore((state) => state.accounts);
  const categories = useOfflineStore((state) => state.categories);
  const events = useOfflineStore((state) => state.events);
  const merchants = useOfflineStore((state) => state.merchants);
  const createMerchant = useOfflineStore((state) => state.createMerchant);
  const transactions = useOfflineStore((state) => state.transactions);
  const updateTransaction = useOfflineStore(
    (state) => state.updateTransaction
  );
  const deleteTransaction = useOfflineStore(
    (state) => state.deleteTransaction
  );
  const synchronize = useSyncStore((state) => state.synchronize);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>("all");
  const [dateFilterMenuAnchor, setDateFilterMenuAnchor] = useState<{
    right: number;
    top: number;
  } | null>(null);
  const dateFilterButtonRef = useRef<View>(null);
  const windowDimensions = useWindowDimensions();

  function openDateFilterMenu() {
    dateFilterButtonRef.current?.measureInWindow((x, y, width, height) => {
      setDateFilterMenuAnchor({
        right: Math.max(windowDimensions.width - (x + width), 12),
        top: y + height + 8,
      });
    });
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<CachedTransaction | null>(null);
  const frequentCategoryIds = useMemo(
    () => getFrequentCategoryIds(transactions),
    [transactions]
  );
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
  const visiblePendingEvents = pendingExpanded
    ? pendingEvents
    : pendingEvents.slice(0, PENDING_PREVIEW_COUNT);
  const hiddenPendingCount = pendingEvents.length - visiblePendingEvents.length;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searching = normalizedQuery.length > 0;
  // Built once per data change (only while searching), not per keystroke:
  // locale date formatting across the whole history is the costly part.
  const searchIndex = useMemo(() => {
    if (!searching) return null;

    return new Map(
      transactions.map((transaction) => [
        transaction.id,
        [
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
          .toLowerCase(),
      ])
    );
  }, [accountNamesById, searching, transactions]);
  const filteredTransactions = useMemo(() => {
    const dateBounds = getDateFilterBounds(dateFilter);

    return transactions.filter((transaction) => {
      const matchesFilter =
        filter === "all" || transaction.transaction_type === filter;

      if (!matchesFilter) return false;

      if (dateBounds) {
        const occurredAt = new Date(transaction.occurred_at);

        if (occurredAt < dateBounds.start || occurredAt >= dateBounds.end) {
          return false;
        }
      }

      if (!searchIndex) return true;

      return (
        searchIndex.get(transaction.id)?.includes(normalizedQuery) ?? false
      );
    });
  }, [dateFilter, filter, normalizedQuery, searchIndex, transactions]);
  // Recency headings ("Today", "Earlier This Week") only make sense against
  // the full history. With a date range applied they turn redundant or
  // misleading, so the range shows one flat list instead.
  const groupedTransactions = useMemo(() => {
    if (dateFilter === "all") {
      return groupTransactionsByRecency(filteredTransactions);
    }

    if (filteredTransactions.length === 0) return [];

    return [
      {
        label: "",
        transactions: filteredTransactions
          .slice()
          .sort(
            (first, second) =>
              new Date(second.occurred_at).getTime() -
              new Date(first.occurred_at).getTime()
          ),
      },
    ];
  }, [dateFilter, filteredTransactions]);
  const sections = useMemo<TransactionSection[]>(
    () =>
      groupedTransactions.map((group) => ({
        data: group.transactions,
        key: group.label || "filtered",
        label: group.label,
      })),
    [groupedTransactions]
  );
  const hasFilters = searching || dateFilter !== "all" || filter !== "all";

  const renderTransaction = useCallback<
    SectionListRenderItem<CachedTransaction, TransactionSection>
  >(
    ({ index, item, section }) => (
      <TransactionListRow
        accountName={
          item.account_id
            ? accountNamesById.get(item.account_id) ?? null
            : null
        }
        isFirst={index === 0}
        isLast={index === section.data.length - 1}
        onPress={setEditingTransaction}
        transaction={item}
      />
    ),
    [accountNamesById]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await synchronize();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-canvas">
      <SectionList<CachedTransaction, TransactionSection>
        contentContainerStyle={transactionListContentStyle}
        initialNumToRender={14}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(transaction) => transaction.id}
        ListFooterComponent={
          sections.length === 0 && pendingEvents.length === 0 ? (
            <View
              className="mt-[18px] items-center rounded-section border border-border bg-white p-6"
              style={premiumTheme.shadow.soft}
            >
              <Text className="text-[16px] font-extrabold tracking-[-0.3px] text-ink">
                {hasFilters
                  ? "No matching transactions"
                  : "No transactions yet"}
              </Text>
              <Text className="mt-1.5 text-center text-[13.5px] leading-[19px] text-secondary">
                {hasFilters
                  ? "Try widening the filters or a different search."
                  : "Add your first transaction to see it here."}
              </Text>
            </View>
          ) : sections.length > 0 ? (
            <Text className="mt-[18px] text-center text-[12px] font-semibold text-muted">
              End of transactions
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <View className="gap-[18px]">
            <View className="min-h-12 flex-row items-center gap-2.5 rounded-control bg-field px-3.5">
              <Search
                color={premiumTheme.colors.secondary}
                size={14}
                strokeWidth={2.2}
              />
              <TextInput
                className="min-h-12 flex-1 py-0 text-[12px] font-medium text-ink"
                onChangeText={setSearchQuery}
                placeholder="Search transactions"
                placeholderTextColor={premiumTheme.colors.muted}
                value={searchQuery}
              />
            </View>

            <View className="flex-row items-stretch gap-2">
              <View className="flex-1 flex-row gap-1 rounded-control bg-field p-1">
                {(["all", "income", "expense", "transfer"] as const).map(
                  (item) => (
                    <Pressable
                      className={`min-h-[34px] flex-1 items-center justify-center rounded-[10px] border ${
                        filter === item
                          ? "border-border bg-white"
                          : "border-transparent"
                      }`}
                      key={item}
                      onPress={() => setFilter(item)}
                      style={
                        filter === item ? premiumTheme.shadow.soft : undefined
                      }
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          filter === item ? "text-ink" : "text-secondary"
                        }`}
                      >
                        {titleCase(item)}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Pressable
                accessibilityHint="Filters transactions by date range"
                accessibilityRole="button"
                className={`min-h-[42px] flex-row items-center justify-center gap-[3px] rounded-control px-[13px] active:opacity-85 ${
                  dateFilter !== "all" ? "bg-ink" : "bg-field"
                }`}
                onPress={openDateFilterMenu}
                ref={dateFilterButtonRef}
              >
                <CalendarDays
                  color={
                    dateFilter !== "all"
                      ? "#ffffff"
                      : premiumTheme.colors.secondary
                  }
                  size={16}
                  strokeWidth={2.3}
                />
                <ChevronDown
                  color={
                    dateFilter !== "all"
                      ? "#ffffff"
                      : premiumTheme.colors.secondary
                  }
                  size={14}
                  strokeWidth={2.5}
                />
              </Pressable>
            </View>

            {dateFilter !== "all" ? (
              <View className="-mt-1.5 flex-row items-center">
                <Pressable
                  accessibilityHint="Removes the date filter"
                  accessibilityRole="button"
                  className="min-h-8 flex-row items-center gap-[7px] rounded-full border border-border bg-white pl-[13px] pr-1.5 active:bg-field"
                  hitSlop={6}
                  onPress={() => setDateFilter("all")}
                  style={premiumTheme.shadow.soft}
                >
                  <Text className="text-[12.5px] font-bold text-ink">
                    {
                      DATE_FILTER_OPTIONS.find(
                        (option) => option.value === dateFilter
                      )?.label
                    }
                  </Text>
                  <View className="h-5 w-5 items-center justify-center rounded-full bg-field">
                    <X
                      color={premiumTheme.colors.secondary}
                      size={11}
                      strokeWidth={2.8}
                    />
                  </View>
                </Pressable>
              </View>
            ) : null}

            {pendingEvents.length > 0 ? (
              <View className="gap-2.5">
                <View className="flex-row items-start justify-between gap-3">
                  <View>
                    <Text className="text-[17px] font-extrabold tracking-[-0.3px] text-ink">
                      Pending reviews
                    </Text>
                    <Text className="mt-[3px] text-[12.5px] text-secondary">
                      Confirm, correct, or ignore captured transactions.
                    </Text>
                  </View>
                  <View className="min-h-[26px] min-w-[26px] items-center justify-center rounded-full bg-ink px-2">
                    <Text className="text-[12px] font-extrabold text-white">
                      {pendingEvents.length}
                    </Text>
                  </View>
                </View>

                {/* Same flush list as the transaction groups below, so
                    both sections share one icon column. */}
                <View className="overflow-hidden rounded-section bg-white">
                  <View>
                    {visiblePendingEvents.map((event, index) => {
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
                          showDivider={
                            index < visiblePendingEvents.length - 1 ||
                            hiddenPendingCount > 0 ||
                            pendingExpanded
                          }
                        />
                      );
                    })}
                    {hiddenPendingCount > 0 || pendingExpanded ? (
                      <Pressable
                        accessibilityRole="button"
                        className="min-h-11 flex-row items-center gap-3 active:bg-field"
                        onPress={() =>
                          setPendingExpanded((current) => !current)
                        }
                      >
                        <View className="h-9 w-9 items-center justify-center">
                          <ChevronDown
                            color={premiumTheme.colors.secondary}
                            size={16}
                            strokeWidth={2.4}
                            style={{
                              transform: [
                                {
                                  rotate: pendingExpanded ? "180deg" : "0deg",
                                },
                              ],
                            }}
                          />
                        </View>
                        <Text className="text-[12px] font-bold text-ink">
                          {pendingExpanded
                            ? "Show fewer"
                            : `Show ${hiddenPendingCount} more to review`}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        }
        maxToRenderPerBatch={12}
        refreshControl={
          <RefreshControl
            colors={[premiumTheme.colors.ink]}
            onRefresh={() => void handleRefresh()}
            refreshing={refreshing}
          />
        }
        renderItem={renderTransaction}
        renderSectionHeader={({ section }) =>
          section.label ? (
            <Text className="pb-2 pl-0.5 pt-[26px] text-[10px] font-bold uppercase tracking-[0.9px] text-secondary">
              {section.label}
            </Text>
          ) : (
            <View className="h-[18px]" />
          )
        }
        sections={sections}
        stickySectionHeadersEnabled={false}
        style={transactionListStyle}
        windowSize={7}
      />

      <Pressable
        className="absolute bottom-5 right-5 h-[54px] w-[54px] shadow-xl items-center justify-center rounded-[27px] bg-ink"
        onPress={() => navigation.navigate("Events")}
        style={fabShadowStyle}
      >
        <Plus color="#ffffff" size={23} strokeWidth={2.8} />
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={() => setDateFilterMenuAnchor(null)}
        transparent
        visible={dateFilterMenuAnchor !== null}
      >
        <Pressable
          className="flex-1"
          onPress={() => setDateFilterMenuAnchor(null)}
        >
          {dateFilterMenuAnchor ? (
            <MotiView
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              from={{ opacity: 0, scale: 0.96, translateY: -6 }}
              style={[
                dateFilterMenuStyle,
                {
                  right: dateFilterMenuAnchor.right,
                  top: dateFilterMenuAnchor.top,
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
                Date range
              </Text>
              {DATE_FILTER_OPTIONS.map((option) => {
                const selected = option.value === dateFilter;

                return (
                  <Pressable
                    className={`min-h-[42px] flex-row items-center justify-between gap-2.5 rounded-xl px-2.5 active:bg-field ${
                      selected ? "bg-field" : ""
                    }`}
                    key={option.value}
                    onPress={() => {
                      setDateFilter(option.value);
                      setDateFilterMenuAnchor(null);
                    }}
                  >
                    <Text
                      className={`flex-1 text-[13px] leading-[18px] text-ink ${
                        selected ? "font-bold" : "font-semibold"
                      }`}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {selected ? (
                      <Check
                        color={premiumTheme.colors.ink}
                        size={15}
                        strokeWidth={2.8}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </MotiView>
          ) : null}
        </Pressable>
      </Modal>

      {editingTransaction ? (
        <TransactionEditModal
          accounts={accounts}
          categories={categories}
          frequentCategoryIds={frequentCategoryIds}
          merchants={merchants}
          onCreateMerchant={(name) => createMerchant({ name })}
          onAddAccount={() =>
            navigation.navigate("FinancialIntelligence", {
              initialResource: "account",
            })
          }
          onClose={() => setEditingTransaction(null)}
          onDelete={() =>
            deleteTransaction(
              editingTransaction.id,
              editingTransaction.event_id
            )
          }
          onManageCategories={() => {
            setEditingTransaction(null);
            navigation.navigate("Categories");
          }}
          onSave={(updates) =>
            updateTransaction(editingTransaction.id, updates)
          }
          transaction={editingTransaction}
        />
      ) : null}
    </View>
  );
}

// Virtualized rows render one at a time, so each row paints its own slice
// of the section card: rounded top on the first, rounded bottom and no
// divider on the last. Memoized so a background sync re-renders only rows
// whose data changed.
const TransactionListRow = memo(function TransactionListRow({
  accountName,
  isFirst,
  isLast,
  onPress,
  transaction,
}: {
  accountName: string | null;
  isFirst: boolean;
  isLast: boolean;
  onPress: (transaction: CachedTransaction) => void;
  transaction: CachedTransaction;
}) {
  const { amount, occurred_at: occurredAt, transaction_type: type } =
    transaction;
  const categoryName =
    type === "transfer"
      ? "Transfer"
      : transaction.category?.name ?? "Uncategorized";
  const isTransfer = type === "transfer";
  const signedAmount = getSignedTransactionAmount(amount, type);
  const merchantDisplay = getTransactionMerchantDisplay(
    transaction,
    transaction.category?.name ?? titleCase(type)
  );

  return (
    <View
      className={`overflow-hidden bg-white ${
        isFirst ? "rounded-t-section" : ""
      } ${isLast ? "rounded-b-section" : ""}`}
    >
      <Pressable
        accessibilityHint="Opens this transaction for editing"
        accessibilityRole="button"
        className="py-1.5 flex-row items-center gap-3 active:bg-field"
        onPress={() => onPress(transaction)}
      >
        <TransactionIcon category={transaction.category} type={type} />

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-[5px]">
            <Text
              className="shrink text-[12px] font-bold tracking-[-0.2px] text-ink"
              numberOfLines={1}
            >
              {merchantDisplay.name}
            </Text>
            {merchantDisplay.registered && (
              <BadgeCheck
                color={premiumTheme.colors.success}
                size={10}
                strokeWidth={2.4}
              />
            )}
          </View>
          <Text
            className="text-[10px] font-semibold text-secondary"
            numberOfLines={1}
          >
            {accountName ? `${categoryName} · ${accountName}` : categoryName}
          </Text>
        </View>

        <View className="ml-1 items-end">
          <Text
            className={`text-[12px] font-extrabold tracking-[-0.2px] tabular-nums ${
              isTransfer
                ? "text-secondary"
                : signedAmount > 0
                  ? "text-success"
                  : "text-ink"
            }`}
          >
            {isTransfer
              ? formatNeutralTransactionAmount(amount)
              : formatSignedTransactionAmount(signedAmount)}
          </Text>
          <Text className="mt-[3px] text-[10px] font-semibold text-muted">
            {formatTransactionListTimestamp(occurredAt)}
          </Text>
        </View>

        {isLast ? null : <RowDivider />}
      </Pressable>
    </View>
  );
});

function RowDivider() {
  return (
    <View
      className="absolute bottom-0 left-12 right-0 bg-divider"
      // hairlineWidth is a runtime value with no height class, so it stays
      // inline.
      style={{ height: premiumHairline }}
    />
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
  const isLowConfidence = (event.confidence ?? 1) < 0.5;

  return (
    <Pressable
      accessibilityHint="Opens this captured transaction for review"
      accessibilityRole="button"
      className="py-1.5 flex-row items-center gap-3 active:bg-field"
      onPress={onPress}
    >
      {/* Not categorised until reviewed: a neutral tile in the shared
          TransactionIcon geometry. */}
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-field">
        <Store
          color={premiumTheme.colors.secondary}
          size={16}
          strokeWidth={2.2}
        />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="shrink text-[12px] font-bold tracking-[-0.2px] text-ink"
            numberOfLines={1}
          >
            {event.merchant_name_raw ?? "Unknown merchant"}
          </Text>
          {isLowConfidence ? (
            <View className="rounded-full bg-[#fef3c7] px-[7px] py-0.5">
              <Text className="text-[9px] font-bold text-[#b45309]">
                Low confidence
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          className="text-[10px] font-semibold text-secondary"
          numberOfLines={1}
        >
          {isCredit ? "Income" : "Expense"}
          {accountName ? ` · ${accountName}` : " · Account unassigned"}
        </Text>
      </View>

      <View className="ml-1 items-end">
        <View className="flex-row items-center gap-0.5">
          <Text
            className={`text-[12px] font-extrabold tabular-nums ${
              isCredit ? "text-success" : "text-ink"
            }`}
          >
            {MobileDashboardService.getFormattedBalance(event.amount)}
          </Text>
          <ChevronRight
            color={premiumTheme.colors.muted}
            size={16}
            strokeWidth={2.4}
          />
        </View>
        <Text className="mt-[3px] text-[10px] font-semibold text-muted">
          {formatTransactionListTimestamp(event.occurred_at)}
        </Text>
      </View>

      {showDivider ? <RowDivider /> : null}
    </Pressable>
  );
}
