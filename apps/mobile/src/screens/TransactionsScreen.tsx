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
  StyleSheet,
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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.transactionsListContainer}
        style={styles.screenScroll}
      >
        <View style={styles.transactionSearchBar}>
          <Search
            color={premiumTheme.colors.secondary}
            size={20}
            strokeWidth={2.2}
          />
          <TextInput
            onChangeText={setSearchQuery}
            placeholder="Search transactions"
            placeholderTextColor={premiumTheme.colors.muted}
            style={styles.transactionSearchInput}
            value={searchQuery}
          />
        </View>

        <View style={styles.transactionFilterRow}>
          <View style={styles.transactionFilterBar}>
            {(["all", "income", "expense"] as const).map(
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

          <Pressable
            accessibilityHint="Filters transactions by date range"
            accessibilityRole="button"
            onPress={openDateFilterMenu}
            ref={dateFilterButtonRef}
            style={({ pressed }) => [
              styles.dateFilterButton,
              dateFilter !== "all" && styles.dateFilterButtonActive,
              pressed && styles.dateFilterButtonPressed,
            ]}
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
          <View style={styles.dateFilterSummary}>
            <Pressable
              accessibilityHint="Removes the date filter"
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => setDateFilter("all")}
              style={({ pressed }) => [
                styles.dateFilterChip,
                pressed && styles.dateFilterChipPressed,
              ]}
            >
              <Text style={styles.dateFilterChipText}>
                {
                  DATE_FILTER_OPTIONS.find(
                    (option) => option.value === dateFilter
                  )?.label
                }
              </Text>
              <View style={styles.dateFilterChipClose}>
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

            <View style={styles.listCard}>
              <View style={styles.listCardInner}>
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
          <View key={group.label || "filtered"} style={styles.transactionGroup}>
            {group.label ? (
              <Text style={styles.transactionGroupTitle}>{group.label}</Text>
            ) : null}
            <View style={styles.listCard}>
              <View style={styles.listCardInner}>
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
          <View style={styles.transactionsEmptyCard}>
            <Text style={styles.transactionsEmptyTitle}>
              {searchQuery.trim() || dateFilter !== "all" || filter !== "all"
                ? "No matching transactions"
                : "No transactions yet"}
            </Text>
            <Text style={styles.transactionsEmptyText}>
              {searchQuery.trim() || dateFilter !== "all" || filter !== "all"
                ? "Try widening the filters or a different search."
                : "Add your first transaction to see it here."}
            </Text>
          </View>
        )}

        {groupedTransactions.length > 0 ? (
          <Text style={styles.transactionsEndText}>End of transactions</Text>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={() => navigation.navigate("Events")}
        style={styles.transactionFab}
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
          onPress={() => setDateFilterMenuAnchor(null)}
          style={styles.dateFilterMenuBackdrop}
        >
          {dateFilterMenuAnchor ? (
            <MotiView
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              from={{ opacity: 0, scale: 0.96, translateY: -6 }}
              style={[
                styles.dateFilterMenu,
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
              <Text style={styles.dateFilterMenuLabel}>Date range</Text>
              {DATE_FILTER_OPTIONS.map((option) => {
                const selected = option.value === dateFilter;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setDateFilter(option.value);
                      setDateFilterMenuAnchor(null);
                    }}
                    style={({ pressed }) => [
                      styles.dateFilterOption,
                      selected && styles.dateFilterOptionSelected,
                      pressed && styles.dateFilterOptionPressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.dateFilterOptionText,
                        selected && styles.dateFilterOptionTextSelected,
                      ]}
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
      onPress={onPress}
      style={({ pressed }) => [
        styles.transactionListRow,
        pressed && styles.transactionListRowPressed,
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
        <View style={styles.transactionListTitleRow}>
          <Text numberOfLines={1} style={styles.transactionListTitle}>
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
        <Text numberOfLines={1} style={styles.transactionListCategory}>
          {accountName ? `${categoryName} · ${accountName}` : categoryName}
        </Text>
      </View>

      <View style={styles.transactionListTrailing}>
        <Text
          style={[
            styles.transactionListAmount,
            signedAmount > 0 && styles.transactionListAmountIncome,
          ]}
        >
          {formatSignedTransactionAmount(signedAmount)}
        </Text>
        <Text style={styles.transactionListTime}>
          {formatTransactionListTimestamp(occurredAt)}
        </Text>
      </View>

      {showDivider ? <View style={styles.rowDivider} /> : null}
    </Pressable>
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
      onPress={onPress}
      style={({ pressed }) => [
        styles.pendingReviewRow,
        pressed && styles.pendingReviewRowPressed,
      ]}
    >
      <View style={styles.pendingReviewIcon}>
        <Store color={premiumTheme.colors.ink} size={19} strokeWidth={2.3} />
      </View>

      <View style={styles.pendingReviewCopy}>
        <View style={styles.pendingReviewTitleRow}>
          <Text
            numberOfLines={1}
            style={[styles.pendingReviewMerchant, styles.pendingReviewMerchantShrink]}
          >
            {event.merchant_name_raw ?? "Unknown merchant"}
          </Text>
          {isLowConfidence ? (
            <View style={styles.pendingReviewFlag}>
              <Text style={styles.pendingReviewFlagText}>Low confidence</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.pendingReviewMeta}>
          {isCredit ? "Income" : "Expense"}
          {accountName ? ` · ${accountName}` : " · Account unassigned"}
        </Text>
      </View>

      <View style={styles.pendingReviewTrailing}>
        <View style={styles.pendingReviewAmountRow}>
          <Text
            style={[
              styles.pendingReviewAmount,
              isCredit && styles.pendingReviewAmountIncome,
            ]}
          >
            {MobileDashboardService.getFormattedBalance(event.amount)}
          </Text>
          <ChevronRight
            color={premiumTheme.colors.muted}
            size={16}
            strokeWidth={2.4}
          />
        </View>
        <Text style={styles.pendingReviewDate}>
          {formatTransactionListTimestamp(event.occurred_at)}
        </Text>
      </View>

      {showDivider ? <View style={styles.rowDivider} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateFilterButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 13,
  },
  dateFilterButtonActive: {
    backgroundColor: premiumTheme.colors.ink,
  },
  dateFilterButtonPressed: {
    opacity: 0.85,
  },
  dateFilterChip: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    minHeight: 32,
    paddingLeft: 13,
    paddingRight: 6,
    ...premiumSurface,
    ...premiumTheme.shadow.soft,
  },
  dateFilterChipClose: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  dateFilterChipPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  dateFilterChipText: {
    color: premiumTheme.colors.ink,
    fontSize: 12.5,
    fontWeight: "700",
  },
  dateFilterMenu: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 6,
    position: "absolute",
    width: 216,
    ...premiumSurface,
    ...premiumTheme.shadow.raised,
  },
  dateFilterMenuBackdrop: {
    flex: 1,
  },
  dateFilterMenuLabel: {
    color: premiumTheme.colors.muted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    textTransform: "uppercase",
  },
  dateFilterOption: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 10,
  },
  dateFilterOptionPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  dateFilterOptionSelected: {
    backgroundColor: premiumTheme.colors.field,
  },
  dateFilterOptionText: {
    color: premiumTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  dateFilterOptionTextSelected: {
    fontWeight: "700",
  },
  dateFilterSummary: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: -6,
  },
  listCard: {
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.section,
    ...premiumSurface,
    ...premiumTheme.shadow.soft,
  },
  listCardInner: {
    borderRadius: premiumTheme.radius.section,
    overflow: "hidden",
  },
  pendingReviewAmount: {
    color: premiumTheme.colors.ink,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  pendingReviewAmountIncome: {
    color: premiumTheme.colors.success,
  },
  pendingReviewAmountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  pendingReviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  pendingReviewCount: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 26,
    minWidth: 26,
    paddingHorizontal: 8,
  },
  pendingReviewCountText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  pendingReviewDate: {
    color: premiumTheme.colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  pendingReviewFlag: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pendingReviewFlagText: {
    color: "#b45309",
    fontSize: 10,
    fontWeight: "700",
  },
  pendingReviewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  pendingReviewIcon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pendingReviewMerchant: {
    color: premiumTheme.colors.ink,
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  pendingReviewMerchantShrink: {
    flexShrink: 1,
  },
  pendingReviewMeta: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  pendingReviewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
  },
  pendingReviewRowPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  pendingReviewSection: {
    gap: 10,
  },
  pendingReviewSubtitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 12.5,
    marginTop: 3,
  },
  pendingReviewTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  pendingReviewTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  pendingReviewTrailing: {
    alignItems: "flex-end",
    marginLeft: 4,
  },
  rowDivider: {
    backgroundColor: premiumTheme.colors.divider,
    bottom: 0,
    height: premiumHairline,
    left: 68,
    position: "absolute",
    right: 0,
  },
  screen: {
    backgroundColor: premiumTheme.colors.canvas,
    flex: 1,
  },
  screenScroll: {
    backgroundColor: premiumTheme.colors.canvas,
    flex: 1,
  },
  transactionFab: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 27,
    bottom: 20,
    height: 54,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    width: 54,
  },
  transactionFilterBar: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  transactionFilterButton: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
  },
  transactionFilterButtonActive: {
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    ...premiumTheme.shadow.soft,
  },
  transactionFilterRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 8,
  },
  transactionFilterText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12.5,
    fontWeight: "700",
  },
  transactionFilterTextActive: {
    color: premiumTheme.colors.ink,
  },
  transactionGroup: {
    gap: 10,
  },
  transactionGroupTitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.9,
    paddingLeft: 2,
    textTransform: "uppercase",
  },
  transactionListAmount: {
    color: premiumTheme.colors.ink,
    fontSize: 14.5,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  transactionListAmountIncome: {
    color: premiumTheme.colors.success,
  },
  transactionListCategory: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  transactionListDetails: {
    flex: 1,
    minWidth: 0,
  },
  transactionListIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  transactionListRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 14,
  },
  transactionListRowPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  transactionListTime: {
    color: premiumTheme.colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  transactionListTitle: {
    color: premiumTheme.colors.ink,
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  transactionListTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  transactionListTrailing: {
    alignItems: "flex-end",
    marginLeft: 4,
  },
  transactionSearchBar: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  transactionSearchInput: {
    color: premiumTheme.colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    minHeight: 48,
    paddingVertical: 0,
  },
  transactionsEmptyCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.section,
    padding: 24,
    ...premiumSurface,
    ...premiumTheme.shadow.soft,
  },
  transactionsEmptyText: {
    color: premiumTheme.colors.secondary,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  transactionsEmptyTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  transactionsEndText: {
    color: premiumTheme.colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  transactionsListContainer: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 18,
    padding: 20,
    paddingBottom: 96,
  },
});
