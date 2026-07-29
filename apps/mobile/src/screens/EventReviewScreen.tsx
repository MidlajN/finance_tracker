import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CreditCard, LayoutGrid, Store } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AccountPickerField } from "../components/finance/AccountPicker";
import { CategoryPickerField } from "../components/finance/CategoryPicker";
import { financeStyles } from "../components/finance/financeStyles";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumTheme } from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";
import {
  getEventAccountId,
  getEventRuleCategoryId,
  getFrequentCategoryIds,
  getJsonObject,
} from "../utils/financeFormat";

type EventReviewScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "EventReview"
>;

export function EventReviewScreen({
  navigation,
  route,
}: EventReviewScreenProps) {
  const events = useOfflineStore((state) => state.events);
  const accounts = useOfflineStore((state) => state.accounts);
  const categories = useOfflineStore((state) => state.categories);
  const transactions = useOfflineStore((state) => state.transactions);
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
  const frequentCategoryIds = useMemo(
    () => getFrequentCategoryIds(transactions),
    [transactions]
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
        category_override: true,
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
        <View style={styles.eventReviewSectionHeader}>
          <View style={styles.eventReviewSectionIcon}>
            <CreditCard
              color={premiumTheme.colors.ink}
              size={17}
              strokeWidth={2.3}
            />
          </View>
          <Text style={styles.eventReviewSectionTitle}>Account</Text>
        </View>

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
          showHeader={false}
        />
      </View>

      <View style={styles.eventReviewCard}>
        <View style={styles.eventReviewSectionHeader}>
          <View style={styles.eventReviewSectionIcon}>
            <LayoutGrid
              color={premiumTheme.colors.ink}
              size={17}
              strokeWidth={2.3}
            />
          </View>
          <Text style={styles.eventReviewSectionTitle}>Category</Text>
        </View>

        <CategoryPickerField
          categories={categories}
          frequentCategoryIds={frequentCategoryIds}
          onManageCategories={() => navigation.navigate("Categories")}
          onSelect={(categoryId) => {
            void handleCategory(categoryId);
          }}
          selectedCategoryId={activeCategoryId ?? null}
          showHeader={false}
        />

        {error && <Text style={financeStyles.error}>{error}</Text>}

        <View style={styles.eventReviewActions}>
          <Pressable
            disabled={isSaving}
            onPress={handleIgnore}
            style={[
              styles.eventReviewSecondaryButton,
              isSaving && financeStyles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.eventReviewSecondaryButtonText}>Ignore</Text>
          </Pressable>
          <Pressable
            disabled={isSaving}
            onPress={handleConfirm}
            style={[
              styles.eventReviewPrimaryButton,
              isSaving && financeStyles.saveButtonDisabled,
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

const styles = StyleSheet.create({
  eventReviewAccountMeta: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  eventReviewAccountMetaEmpty: {
    color: "#94a3b8",
  },
  eventReviewActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  eventReviewAmount: {
    color: "#0f172a",
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    marginLeft: 8,
  },
  eventReviewCard: {
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...premiumTheme.shadow.soft,
  },
  eventReviewContainer: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  eventReviewIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  eventReviewMerchant: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  eventReviewMeta: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  eventReviewPrimaryButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: premiumTheme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    ...premiumTheme.shadow.soft,
  },
  eventReviewPrimaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  eventReviewSecondaryButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  eventReviewSecondaryButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  eventReviewSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  eventReviewSectionIcon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  eventReviewSectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  eventReviewSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  eventReviewSummaryCard: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    padding: 16,
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
  transactionHero: {
    gap: 4,
    paddingTop: 2,
  },
  transactionKicker: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  transactionSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  transactionTitle: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0,
  },
});
