import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MotiView } from "moti";
import {
  Check,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { normalizeMerchantName } from "@finance/shared-utils";

import { AccountPickerField } from "../components/finance/AccountPicker";
import { CategoryPickerField } from "../components/finance/CategoryPicker";
import { financeStyles } from "../components/finance/financeStyles";
import { SavingOverlay } from "../components/finance/SavingOverlay";
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

function getMerchantInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function EventReviewScreen({
  navigation,
  route,
}: EventReviewScreenProps) {
  const events = useOfflineStore((state) => state.events);
  const accounts = useOfflineStore((state) => state.accounts);
  const categories = useOfflineStore((state) => state.categories);
  const merchants = useOfflineStore((state) => state.merchants);
  const transactions = useOfflineStore((state) => state.transactions);
  const assignEventMerchant = useOfflineStore(
    (state) => state.assignEventMerchant
  );
  const createMerchantForEvent = useOfflineStore(
    (state) => state.createMerchantForEvent
  );
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
  const linkedMerchant = merchants.find(
    (merchant) => merchant.id === event?.merchant_id
  );
  const [merchantPickerVisible, setMerchantPickerVisible] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [isCreatingMerchant, setIsCreatingMerchant] = useState(false);
  const [aliasEditorVisible, setAliasEditorVisible] = useState(false);
  const [aliasDraft, setAliasDraft] = useState("");
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const visibleMerchants = useMemo(() => {
    const query = merchantSearch.trim().toLowerCase();
    const normalizedRaw = normalizeMerchantName(
      event?.merchant_name_raw ?? ""
    );
    const isSuggested = (name: string, normalizedName?: string | null) => {
      const normalized = normalizeMerchantName(normalizedName ?? name);

      return (
        normalized.length >= 4 &&
        normalizedRaw.length > 0 &&
        normalizedRaw.includes(normalized)
      );
    };
    const ranked = merchants
      .slice()
      .map((merchant) => ({
        merchant,
        suggested: isSuggested(merchant.name, merchant.normalized_name),
      }))
      .sort(
        (first, second) =>
          Number(second.suggested) - Number(first.suggested) ||
          (second.merchant.usage_count ?? 0) -
            (first.merchant.usage_count ?? 0) ||
          first.merchant.name.localeCompare(second.merchant.name)
      );

    if (!query) {
      return ranked;
    }

    return ranked.filter(({ merchant }) =>
      merchant.name.toLowerCase().includes(query)
    );
  }, [event?.merchant_name_raw, merchantSearch, merchants]);
  const trimmedMerchantSearch = merchantSearch.trim();
  const canCreateMerchant =
    trimmedMerchantSearch.length > 0 &&
    !merchants.some(
      (merchant) =>
        normalizeMerchantName(
          merchant.normalized_name ?? merchant.name
        ) === normalizeMerchantName(trimmedMerchantSearch)
    );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<"confirm" | "ignore" | null>(
    null
  );

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

  async function handleMerchant(merchantId: string | null) {
    if (!event) {
      return;
    }

    setMerchantPickerVisible(false);
    setMerchantSearch("");
    setError(null);
    await assignEventMerchant(
      event.id,
      merchantId,
      event.merchant_name_raw
    );
  }

  async function handleCreateMerchant() {
    if (!event || !canCreateMerchant || isCreatingMerchant) {
      return;
    }

    setIsCreatingMerchant(true);
    setError(null);

    try {
      await createMerchantForEvent(
        event.id,
        trimmedMerchantSearch,
        event.merchant_name_raw
      );
      setMerchantPickerVisible(false);
      setMerchantSearch("");
    } finally {
      setIsCreatingMerchant(false);
    }
  }

  async function handleSaveAlias() {
    const trimmed = aliasDraft.trim();

    if (!event || !trimmed || isSavingAlias) {
      return;
    }

    if (trimmed === event.merchant_name_raw) {
      setAliasEditorVisible(false);
      return;
    }

    setIsSavingAlias(true);
    setError(null);

    try {
      await updateFinancialEvent(event.id, {
        merchant_name_raw: trimmed,
      });
      setAliasEditorVisible(false);
    } finally {
      setIsSavingAlias(false);
    }
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
    setSavingAction("confirm");
    setError(null);

    try {
      await confirmFinancialEvent(event.id);
      await synchronize();
      // Close the overlay Modal BEFORE navigating: unmounting a screen
      // that still hosts an open Modal intermittently crashes the app on
      // Android during the stack transition.
      setIsSaving(false);
      setSavingAction(null);
      setTimeout(() => navigation.popTo("Transactions"), 80);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to confirm this event."
      );
      setIsSaving(false);
      setSavingAction(null);
    }
  }

  async function handleIgnore() {
    if (!event || event.status !== "pending" || isSaving) {
      return;
    }

    setIsSaving(true);
    setSavingAction("ignore");
    setError(null);

    try {
      await ignoreFinancialEvent(event.id);
      await synchronize();
      setIsSaving(false);
      setSavingAction(null);
      setTimeout(() => navigation.popTo("Transactions"), 80);
    } catch (ignoreError) {
      setError(
        ignoreError instanceof Error
          ? ignoreError.message
          : "Unable to ignore this event."
      );
      setIsSaving(false);
      setSavingAction(null);
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
          <Pressable
            onPress={() => {
              setAliasDraft(event.merchant_name_raw ?? "");
              setAliasEditorVisible(true);
            }}
            style={styles.eventReviewMerchantRow}
          >
            <Text numberOfLines={1} style={styles.eventReviewMerchant}>
              {linkedMerchant?.name ??
                event.merchant_name_raw ??
                "Unknown merchant"}
            </Text>
            <View style={styles.eventReviewMerchantEdit}>
              <Pencil
                color={premiumTheme.colors.secondary}
                size={11}
                strokeWidth={2.4}
              />
            </View>
          </Pressable>
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
            <Store
              color={premiumTheme.colors.ink}
              size={14}
              strokeWidth={2.3}
            />
          </View>
          <Text style={styles.eventReviewSectionTitle}>Merchant</Text>
        </View>

        <Pressable
          onPress={() => setMerchantPickerVisible(true)}
          style={({ pressed }) => [
            styles.merchantLinkRow,
            pressed && financeStyles.saveButtonDisabled,
          ]}
        >
          <View style={styles.merchantLinkCopy}>
            <Text
              numberOfLines={1}
              style={[
                styles.merchantLinkName,
                !linkedMerchant && styles.merchantLinkNameEmpty,
              ]}
            >
              {linkedMerchant?.name ?? "Not linked"}
            </Text>
            <Text numberOfLines={1} style={styles.merchantLinkMeta}>
              {linkedMerchant
                ? `Captured as ${event.merchant_name_raw ?? "unknown"}`
                : "Link a merchant so future captures match automatically."}
            </Text>
          </View>
          {linkedMerchant ? (
            <View style={styles.merchantLinkedBadge}>
              <Check color="#16a34a" size={13} strokeWidth={3} />
            </View>
          ) : null}
          <ChevronRight
            color={premiumTheme.colors.muted}
            size={18}
            strokeWidth={2.4}
          />
        </Pressable>
      </View>

      <View style={styles.eventReviewCard}>
        <View style={styles.eventReviewSectionHeader}>
          <View style={styles.eventReviewSectionIcon}>
            <CreditCard
              color={premiumTheme.colors.ink}
              size={14}
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
              size={14}
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

      <Modal
        animationType="fade"
        onRequestClose={() => setAliasEditorVisible(false)}
        transparent
        visible={aliasEditorVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.aliasEditorBackdrop}
        >
          <Pressable
            onPress={() => setAliasEditorVisible(false)}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, scale: 1 }}
            from={{ opacity: 0, scale: 0.94 }}
            style={styles.aliasEditorCard}
            transition={{
              damping: 17,
              mass: 0.7,
              stiffness: 240,
              type: "spring",
            }}
          >
            <Text style={styles.aliasEditorTitle}>Edit captured name</Text>
            <Text style={styles.aliasEditorSubtitle}>
              Corrects the raw name on this capture only. Use the Merchant
              section below to link a merchant.
            </Text>

            <View style={styles.aliasEditorInputWrap}>
              <Store color="#7b818c" size={17} strokeWidth={2.3} />
              <TextInput
                autoFocus
                onChangeText={setAliasDraft}
                onSubmitEditing={() => {
                  void handleSaveAlias();
                }}
                placeholder="Merchant name"
                placeholderTextColor="#8b929d"
                returnKeyType="done"
                style={styles.aliasEditorInput}
                value={aliasDraft}
              />
            </View>

            <View style={styles.aliasEditorFooter}>
              <Pressable
                onPress={() => setAliasEditorVisible(false)}
                style={({ pressed }) => [
                  styles.aliasEditorCancelButton,
                  pressed && financeStyles.saveButtonDisabled,
                ]}
              >
                <Text style={styles.aliasEditorCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!aliasDraft.trim() || isSavingAlias}
                onPress={() => {
                  void handleSaveAlias();
                }}
                style={({ pressed }) => [
                  styles.aliasEditorSaveButton,
                  (pressed || !aliasDraft.trim() || isSavingAlias) &&
                    financeStyles.saveButtonDisabled,
                ]}
              >
                <Text style={styles.aliasEditorSaveText}>
                  {isSavingAlias ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setMerchantPickerVisible(false);
          setMerchantSearch("");
        }}
        transparent
        visible={merchantPickerVisible}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            onPress={() => {
              setMerchantPickerVisible(false);
              setMerchantSearch("");
            }}
            style={financeStyles.modalDismissLayer}
          />
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
            <View style={styles.merchantPickerContent}>
              <View style={financeStyles.modalHeader}>
                <View style={financeStyles.merchantPickerTitleBlock}>
                  <Text style={financeStyles.merchantPickerTitle}>
                    Link merchant
                  </Text>
                  <Text style={financeStyles.merchantPickerSubtitle}>
                    "{event.merchant_name_raw ?? "This capture"}" will match
                    this merchant automatically next time.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setMerchantPickerVisible(false);
                    setMerchantSearch("");
                  }}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={financeStyles.merchantSearchBar}>
                <Search color="#7b818c" size={18} strokeWidth={2.3} />
                <TextInput
                  onChangeText={setMerchantSearch}
                  placeholder="Search or type a new merchant"
                  placeholderTextColor="#8b929d"
                  style={financeStyles.merchantSearchInput}
                  value={merchantSearch}
                />
              </View>

              <ScrollView
                contentContainerStyle={styles.merchantPickerList}
                keyboardShouldPersistTaps="handled"
                style={styles.merchantPickerViewport}
              >
                {canCreateMerchant ? (
                  <Pressable
                    disabled={isCreatingMerchant}
                    onPress={() => {
                      void handleCreateMerchant();
                    }}
                    style={({ pressed }) => [
                      styles.merchantCreateRow,
                      (pressed || isCreatingMerchant) &&
                        financeStyles.saveButtonDisabled,
                    ]}
                  >
                    <View style={styles.merchantCreateIcon}>
                      <Plus color="#ffffff" size={16} strokeWidth={2.8} />
                    </View>
                    <View style={styles.merchantPickerRowCopy}>
                      <Text
                        numberOfLines={1}
                        style={styles.merchantPickerRowName}
                      >
                        {isCreatingMerchant
                          ? "Creating..."
                          : `Create "${trimmedMerchantSearch}"`}
                      </Text>
                      <Text style={styles.merchantPickerRowMeta}>
                        New merchant, linked to this transaction
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                {visibleMerchants.map(({ merchant, suggested }) => {
                  const selected = merchant.id === event.merchant_id;

                  return (
                    <Pressable
                      key={merchant.id}
                      onPress={() => {
                        void handleMerchant(merchant.id);
                      }}
                      style={({ pressed }) => [
                        styles.merchantPickerRow,
                        selected && styles.merchantPickerRowSelected,
                        pressed && financeStyles.saveButtonDisabled,
                      ]}
                    >
                      <View style={styles.merchantAvatar}>
                        <Text style={styles.merchantAvatarText}>
                          {getMerchantInitials(merchant.name)}
                        </Text>
                      </View>
                      <View style={styles.merchantPickerRowCopy}>
                        <Text
                          numberOfLines={1}
                          style={styles.merchantPickerRowName}
                        >
                          {merchant.name}
                        </Text>
                        <Text style={styles.merchantPickerRowMeta}>
                          {merchant.usage_count ?? 0} transactions
                        </Text>
                      </View>
                      {suggested && !selected ? (
                        <View style={styles.merchantSuggestedBadge}>
                          <Text style={styles.merchantSuggestedText}>
                            Suggested
                          </Text>
                        </View>
                      ) : null}
                      {selected ? (
                        <Check
                          color={premiumTheme.colors.ink}
                          size={16}
                          strokeWidth={2.8}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
                {visibleMerchants.length === 0 && !canCreateMerchant ? (
                  <View style={financeStyles.merchantEmptyState}>
                    <Text style={financeStyles.merchantEmptyTitle}>
                      No merchants yet
                    </Text>
                    <Text style={financeStyles.merchantEmptyText}>
                      Type a name above to create your first merchant.
                    </Text>
                  </View>
                ) : null}
                {linkedMerchant ? (
                  <Pressable
                    onPress={() => {
                      void handleMerchant(null);
                    }}
                    style={({ pressed }) => [
                      styles.merchantUnlinkRow,
                      pressed && financeStyles.saveButtonDisabled,
                    ]}
                  >
                    <X
                      color={premiumTheme.colors.danger}
                      size={15}
                      strokeWidth={2.6}
                    />
                    <Text style={styles.merchantUnlinkText}>
                      Remove merchant link
                    </Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

      <SavingOverlay
        subtitle={
          savingAction === "ignore"
            ? "Removing it from your pending reviews"
            : "Adding it to your transactions"
        }
        title={
          savingAction === "ignore"
            ? "Ignoring transaction"
            : "Confirming transaction"
        }
        visible={isSaving && savingAction !== null}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  merchantLinkCopy: {
    flex: 1,
    minWidth: 0,
  },
  merchantLinkMeta: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  merchantLinkName: {
    color: premiumTheme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  merchantLinkNameEmpty: {
    color: premiumTheme.colors.muted,
  },
  merchantLinkRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  merchantLinkedBadge: {
    alignItems: "center",
    backgroundColor: "#dcfce7",
    borderRadius: premiumTheme.radius.pill,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  merchantPickerContent: {
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  merchantPickerList: {
    gap: 4,
    paddingBottom: 8,
  },
  merchantPickerRow: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 10,
  },
  merchantPickerRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  merchantAvatar: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  merchantAvatarText: {
    color: premiumTheme.colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  merchantCreateIcon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: premiumTheme.radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  merchantCreateRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 10,
  },
  merchantSuggestedBadge: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  merchantSuggestedText: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  merchantUnlinkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 6,
    minHeight: 44,
  },
  merchantUnlinkText: {
    color: premiumTheme.colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  merchantPickerRowMeta: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  merchantPickerRowName: {
    color: premiumTheme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  merchantPickerRowSelected: {
    backgroundColor: premiumTheme.colors.field,
  },
  merchantPickerViewport: {
    maxHeight: 380,
  },
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
  aliasEditorBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  aliasEditorCancelButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  aliasEditorCancelText: {
    color: premiumTheme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  aliasEditorCard: {
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.surface,
    padding: 22,
    ...premiumTheme.shadow.raised,
  },
  aliasEditorFooter: {
    flexDirection: "row",
    gap: 11,
    marginTop: 18,
  },
  aliasEditorInput: {
    color: premiumTheme.colors.ink,
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    paddingVertical: 0,
  },
  aliasEditorInputWrap: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  aliasEditorSaveButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  aliasEditorSaveText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  aliasEditorSubtitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
  },
  aliasEditorTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  eventReviewMerchant: {
    color: "#0f172a",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  eventReviewMerchantEdit: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  eventReviewMerchantRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    maxWidth: "100%",
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
    borderRadius: 10,
    height: 29,
    justifyContent: "center",
    width: 29,
  },
  eventReviewSectionTitle: {
    color: "#0f172a",
    fontSize: 14,
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
