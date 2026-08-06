import { useMemo, useRef, useState } from "react";
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
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import type {
  CachedFinancialEvent,
  CachedTransaction,
  TransactionType,
} from "@finance/shared-types";

import { TransactionEditModal } from "../components/finance/TransactionEditModal";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import {
  premiumHairline,
  premiumSurface,
  premiumTheme,
} from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";
import {
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
import { getTransactionIcon } from "../utils/financeVisuals";

type TransactionsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Transactions"
>;

type TransactionFilter = "all" | "income" | "expense";

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
  const transactions = useOfflineStore((state) => state.transactions);
  const updateTransaction = useOfflineStore(
    (state) => state.updateTransaction
  );
  const deleteTransaction = useOfflineStore(
    (state) => state.deleteTransaction
  );
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
  const filteredTransactions = useMemo(() => {
    const dateBounds = getDateFilterBounds(dateFilter);

    return transactions.filter((transaction) => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesFilter =
          filter === "all" || transaction.transaction_type === filter;

        if (!matchesFilter) return false;

        if (dateBounds) {
          const occurredAt = new Date(transaction.occurred_at);

          if (occurredAt < dateBounds.start || occurredAt >= dateBounds.end) {
            return false;
          }
        }

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
      });
  }, [accountNamesById, dateFilter, filter, searchQuery, transactions]);
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

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-[18px] bg-canvas p-5 pb-24"
      >
        <View className="min-h-12 flex-row items-center gap-2.5 rounded-control bg-field px-3.5">
          <Search
            color={premiumTheme.colors.secondary}
            size={20}
            strokeWidth={2.2}
          />
          <TextInput
            className="min-h-12 flex-1 py-0 text-[15px] font-medium text-ink"
            onChangeText={setSearchQuery}
            placeholder="Search transactions"
            placeholderTextColor={premiumTheme.colors.muted}
            value={searchQuery}
          />
        </View>

        <View className="flex-row items-stretch gap-2">
          <View className="flex-1 flex-row gap-1 rounded-control bg-field p-1">
            {(["all", "income", "expense"] as const).map(
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
                    className={`text-[12.5px] font-bold ${
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

            <View
              className="rounded-section border border-border bg-white"
              style={premiumTheme.shadow.soft}
            >
              <View className="overflow-hidden rounded-section">
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
          </View>
        ) : null}

        {groupedTransactions.map((group) => (
          <View className="gap-2.5" key={group.label || "filtered"}>
            {group.label ? (
              <Text className="pl-0.5 text-[12px] font-extrabold uppercase tracking-[0.9px] text-secondary">
                {group.label}
              </Text>
            ) : null}
            <View
              className="rounded-section border border-border bg-white"
              style={premiumTheme.shadow.soft}
            >
              <View className="overflow-hidden rounded-section">
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
                    onPress={() => setEditingTransaction(transaction)}
                    showDivider={index < group.transactions.length - 1}
                    transaction={transaction}
                    type={transaction.transaction_type}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}

        {groupedTransactions.length === 0 && pendingEvents.length === 0 && (
          <View
            className="items-center rounded-section border border-border bg-white p-6"
            style={premiumTheme.shadow.soft}
          >
            <Text className="text-[16px] font-extrabold tracking-[-0.3px] text-ink">
              {searchQuery.trim() || dateFilter !== "all" || filter !== "all"
                ? "No matching transactions"
                : "No transactions yet"}
            </Text>
            <Text className="mt-1.5 text-center text-[13.5px] leading-[19px] text-secondary">
              {searchQuery.trim() || dateFilter !== "all" || filter !== "all"
                ? "Try widening the filters or a different search."
                : "Add your first transaction to see it here."}
            </Text>
          </View>
        )}

        {groupedTransactions.length > 0 ? (
          <Text className="text-center text-[12px] font-semibold text-muted">
            End of transactions
          </Text>
        ) : null}
      </ScrollView>

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

function TransactionListRow({
  accountName,
  amount,
  categoryName,
  occurredAt,
  onPress,
  showDivider,
  transaction,
  type,
}: {
  accountName: string | null;
  amount: number;
  categoryName: string;
  occurredAt: string;
  onPress: () => void;
  showDivider: boolean;
  transaction: CachedTransaction;
  type: TransactionType;
}) {
  const icon = getTransactionIcon(categoryName, type);
  const Icon = icon.Icon;
  const signedAmount = getSignedTransactionAmount(amount, type);
  const merchantDisplay = getTransactionMerchantDisplay(
    transaction,
    transaction.category?.name ?? titleCase(type)
  );

  return (
    <Pressable
      accessibilityHint="Opens this transaction for editing"
      accessibilityRole="button"
      className="min-h-[66px] flex-row items-center gap-3 px-3.5 active:bg-field"
      onPress={onPress}
    >
      <View
        className="h-[42px] w-[42px] items-center justify-center rounded-[15px]"
        style={{ backgroundColor: icon.background }}
      >
        <Icon color={icon.color} size={19} strokeWidth={2.3} />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-[5px]">
          <Text
            className="shrink text-[14.5px] font-bold tracking-[-0.2px] text-ink"
            numberOfLines={1}
          >
            {merchantDisplay.name}
          </Text>
          {merchantDisplay.registered && (
            <BadgeCheck
              color={premiumTheme.colors.success}
              size={14}
              strokeWidth={2.4}
            />
          )}
        </View>
        <Text
          className="mt-[3px] text-[12px] font-semibold text-secondary"
          numberOfLines={1}
        >
          {accountName ? `${categoryName} · ${accountName}` : categoryName}
        </Text>
      </View>

      <View className="ml-1 items-end">
        <Text
          className={`text-[14.5px] font-extrabold tracking-[-0.2px] tabular-nums ${
            signedAmount > 0 ? "text-success" : "text-ink"
          }`}
        >
          {formatSignedTransactionAmount(signedAmount)}
        </Text>
        <Text className="mt-[3px] text-[11px] font-semibold text-muted">
          {formatTransactionListTimestamp(occurredAt)}
        </Text>
      </View>

      {showDivider ? <RowDivider /> : null}
    </Pressable>
  );
}

function RowDivider() {
  return (
    <View
      className="absolute bottom-0 left-[68px] right-0 bg-divider"
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
      className="min-h-[68px] flex-row items-center gap-3 px-3.5 active:bg-field"
      onPress={onPress}
    >
      <View className="h-[42px] w-[42px] items-center justify-center rounded-[15px] bg-field">
        <Store color={premiumTheme.colors.ink} size={19} strokeWidth={2.3} />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="shrink text-[14.5px] font-bold tracking-[-0.2px] text-ink"
            numberOfLines={1}
          >
            {event.merchant_name_raw ?? "Unknown merchant"}
          </Text>
          {isLowConfidence ? (
            <View className="rounded-full bg-[#fef3c7] px-[7px] py-0.5">
              <Text className="text-[10px] font-bold text-[#b45309]">
                Low confidence
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          className="mt-[3px] text-[12px] font-semibold text-secondary"
          numberOfLines={1}
        >
          {isCredit ? "Income" : "Expense"}
          {accountName ? ` · ${accountName}` : " · Account unassigned"}
        </Text>
      </View>

      <View className="ml-1 items-end">
        <View className="flex-row items-center gap-0.5">
          <Text
            className={`text-[14px] font-extrabold tabular-nums ${
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
        <Text className="mt-[3px] text-[11px] font-semibold text-muted">
          {formatTransactionListTimestamp(event.occurred_at)}
        </Text>
      </View>

      {showDivider ? <RowDivider /> : null}
    </Pressable>
  );
}
