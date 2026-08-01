import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronRight, Plus, Search, Store } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  CachedFinancialEvent,
  CachedTransaction,
  TransactionType,
} from "@finance/shared-types";

import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { premiumHairline, premiumTheme } from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";
import {
  formatSignedTransactionAmount,
  formatTransactionTime,
  getEventAccountId,
  getSignedTransactionAmount,
  getTransactionMerchantDisplay,
  groupTransactionsByRecency,
  titleCase,
} from "../utils/financeFormat";
import { getTransactionIcon } from "../utils/financeVisuals";

type TransactionsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Transactions"
>;

type TransactionFilter = "all" | "income" | "expense" | "transfer";

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
  const isLowConfidence = (event.confidence ?? 1) < 0.5;

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

const styles = StyleSheet.create({
  pendingReviewAmount: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  pendingReviewAmountIncome: {
    color: "#16a34a",
  },
  pendingReviewCard: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    overflow: "hidden",
    ...premiumTheme.shadow.floating,
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
  pendingReviewMerchantShrink: {
    flexShrink: 1,
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
    minHeight: 74,
    paddingHorizontal: 14,
  },
  pendingReviewRowDivider: {
    borderBottomColor: premiumTheme.colors.divider,
    borderBottomWidth: premiumHairline,
  },
  pendingReviewRowPressed: {
    backgroundColor: premiumTheme.colors.field,
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
  pendingReviewTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  pendingReviewTrailing: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginLeft: 4,
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
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flexDirection: "row",
    gap: 4,
    padding: 6,
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
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    overflow: "hidden",
    ...premiumTheme.shadow.floating,
  },
  transactionGroupTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
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
    minHeight: 70,
    paddingHorizontal: 14,
  },
  transactionListRowDivider: {
    borderBottomColor: premiumTheme.colors.divider,
    borderBottomWidth: premiumHairline,
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
  transactionSearchBar: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
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
  transactionsEmptyCard: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    padding: 22,
    ...premiumTheme.shadow.floating,
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
    backgroundColor: premiumTheme.colors.canvas,
    gap: 18,
    padding: 20,
    paddingBottom: 90,
  },
});
