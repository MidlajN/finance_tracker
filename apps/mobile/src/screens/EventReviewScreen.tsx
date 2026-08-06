import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MotiView } from "moti";
import {
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Store,
  X,
  Zap,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { matchesRule } from "@finance/finance-core";
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

// MotiView is not NativeWind-interop'd, so the alias editor card keeps a
// plain style object.
const aliasEditorCardStyle = {
  alignSelf: "stretch",
  backgroundColor: "#ffffff",
  borderRadius: premiumTheme.radius.surface,
  padding: 22,
  ...premiumTheme.shadow.raised,
} as const;

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
  const rules = useOfflineStore((state) => state.rules);
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
  const createFinancialRule = useOfflineStore(
    (state) => state.createFinancialRule
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
  const [createRuleEnabled, setCreateRuleEnabled] = useState(false);
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(false);
  const ruleAlreadyCovers = useMemo(() => {
    const raw = event?.merchant_name_raw ?? "";

    if (!raw.trim()) {
      return false;
    }

    return rules.some(
      (rule) => (rule.enabled ?? true) && matchesRule(raw, rule)
    );
  }, [event?.merchant_name_raw, rules]);
  const canOfferRule =
    Boolean(event?.merchant_name_raw?.trim()) &&
    !ruleAlreadyCovers &&
    Boolean(linkedMerchant || activeCategoryId);
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
      if (canOfferRule && createRuleEnabled) {
        await createFinancialRule({
          auto_confirm: autoConfirmEnabled,
          category_id: activeCategoryId ?? null,
          match_operator: "equals",
          match_value: event.merchant_name_raw ?? "",
          merchant_id: event.merchant_id ?? null,
          name:
            linkedMerchant?.name ??
            event.merchant_name_raw ??
            "Untitled rule",
        });
      }

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
      <View className="gap-[18px] bg-canvas p-5 pb-9">
        <View
          className="gap-3.5 rounded-section border border-border bg-white p-4"
          style={premiumTheme.shadow.soft}
        >
          <Text className="text-[21px] font-black text-ink">
            Event not found
          </Text>
          <Text className="text-[13px] leading-[19px] text-secondary">
            This notification may have already been processed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerClassName="gap-[18px] bg-canvas p-5 pb-9">
      <View className="gap-1 pt-0.5">
        <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-secondary">
          Review event
        </Text>
        <Text className="text-[26px] font-black text-ink">
          Confirm transaction
        </Text>
        <Text className="text-[13px] leading-[19px] text-secondary">
          Check the account and category before adding this transaction.
        </Text>
      </View>

      <View className="flex-row items-center gap-3 rounded-section bg-field p-4">
        <View className="h-[46px] w-[46px] items-center justify-center rounded-2xl border border-border bg-white">
          <Store color="#0f172a" size={20} strokeWidth={2.6} />
        </View>
        <View className="min-w-0 flex-1">
          {linkedMerchant ? (
            <>
              <Text
                className="text-[15px] font-extrabold text-ink"
                numberOfLines={1}
              >
                {linkedMerchant.name}
              </Text>
              <Pressable
                className="mt-[2px] max-w-full flex-row items-center gap-1.5 self-start"
                onPress={() => {
                  setAliasDraft(event.merchant_name_raw ?? "");
                  setAliasEditorVisible(true);
                }}
              >
                <Text
                  className="shrink text-[11.5px] font-medium text-secondary"
                  numberOfLines={1}
                >
                  Captured as <Text className="font-semibold text-gray-800">"{event.merchant_name_raw ?? "unknown"}"</Text>
                </Text>
                <Pencil
                  color={premiumTheme.colors.secondary}
                  size={10}
                  strokeWidth={2.4}
                />
              </Pressable>
            </>
          ) : (
            <Pressable
              className="max-w-full flex-row items-center gap-1.5 self-start"
              onPress={() => {
                setAliasDraft(event.merchant_name_raw ?? "");
                setAliasEditorVisible(true);
              }}
            >
              <Text
                className="shrink text-[15px] font-extrabold text-ink"
                numberOfLines={1}
              >
                {event.merchant_name_raw ?? "Unknown merchant"}
              </Text>
              <View className="h-5 w-5 items-center justify-center rounded-full bg-field">
                <Pencil
                  color={premiumTheme.colors.secondary}
                  size={11}
                  strokeWidth={2.4}
                />
              </View>
            </Pressable>
          )}
          <Text className="mt-[3px] text-[12px] font-medium text-secondary">
            {event.direction === "credit" ? "Income" : "Expense"} ·{" "}
            {new Date(event.occurred_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>
          <Text
            className={`mt-[5px] text-[12px] font-bold ${
              selectedAccount ? "text-ink" : "text-muted"
            }`}
            numberOfLines={1}
          >
            Account · {selectedAccount?.name ?? "Unassigned"}
          </Text>
        </View>
        <Text className="ml-2 text-[17px] font-extrabold text-ink tabular-nums">
          {MobileDashboardService.getFormattedBalance(event.amount)}
        </Text>
      </View>

      <View
        className="gap-3 rounded-section border border-border bg-white p-4"
        style={premiumTheme.shadow.soft}
      >
        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-secondary">
          Merchant
        </Text>
        <Pressable
          className="min-h-12 flex-row items-center gap-2.5 rounded-control bg-field px-3.5 active:opacity-[0.62]"
          onPress={() => setMerchantPickerVisible(true)}
        >
          <Store
            color={premiumTheme.colors.ink}
            size={15}
            strokeWidth={2.4}
          />
          <Text
            className={`min-w-0 flex-1 text-[13.5px] font-bold ${
              linkedMerchant ? "text-ink" : "text-muted"
            }`}
            numberOfLines={1}
          >
            {linkedMerchant?.name ?? "Link a merchant"}
          </Text>
          {linkedMerchant ? (
            <View className="h-5 w-5 items-center justify-center rounded-full bg-[#dcfce7]">
              <Check color="#16a34a" size={12} strokeWidth={3} />
            </View>
          ) : null}
          <ChevronRight
            color={premiumTheme.colors.muted}
            size={16}
            strokeWidth={2.4}
          />
        </Pressable>

        <View className="my-1 h-px bg-divider" />

        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-secondary">
          Account
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
          showHeader={false}
        />

        <View className="my-1 h-px bg-divider" />

        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-secondary">
          Category
        </Text>
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

        {canOfferRule ? (
          <>
            <View className="my-1 h-px bg-divider" />

            <Pressable
              className="min-h-11 flex-row items-center gap-2.5 active:opacity-[0.62]"
              onPress={() => {
                setCreateRuleEnabled((enabled) => {
                  if (enabled) {
                    setAutoConfirmEnabled(false);
                  }

                  return !enabled;
                });
              }}
            >
              <Zap
                color={premiumTheme.colors.ink}
                size={15}
                strokeWidth={2.4}
              />
              <View className="min-w-0 flex-1">
                <Text className="text-[13px] font-bold text-ink">
                  Remember for next time
                </Text>
                <Text
                  className="mt-[2px] text-[11px] leading-[15px] font-medium text-secondary"
                  numberOfLines={2}
                >
                  Apply this{" "}
                  {linkedMerchant && activeCategoryId
                    ? "merchant and category"
                    : linkedMerchant
                      ? "merchant"
                      : "category"}{" "}
                  automatically when "{event.merchant_name_raw}" appears
                  again.
                </Text>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full ${
                  createRuleEnabled
                    ? "bg-ink"
                    : "border-[1.5px] border-border bg-white"
                }`}
              >
                {createRuleEnabled ? (
                  <Check color="#ffffff" size={12} strokeWidth={3} />
                ) : null}
              </View>
            </Pressable>

            {createRuleEnabled ? (
              <Pressable
                className="min-h-9 flex-row items-center gap-2.5 pl-[25px] active:opacity-[0.62]"
                onPress={() =>
                  setAutoConfirmEnabled((enabled) => !enabled)
                }
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-bold text-ink">
                    Skip review next time
                  </Text>
                  <Text className="mt-[2px] text-[11px] leading-[15px] font-medium text-secondary">
                    Future captures confirm instantly as transactions.
                  </Text>
                </View>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full ${
                    autoConfirmEnabled
                      ? "bg-ink"
                      : "border-[1.5px] border-border bg-white"
                  }`}
                >
                  {autoConfirmEnabled ? (
                    <Check color="#ffffff" size={12} strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>

      <View className="gap-2.5">
        {error && <Text style={financeStyles.error}>{error}</Text>}

        <View className="flex-row gap-2.5">
          <Pressable
            className={`min-h-[52px] flex-1 items-center justify-center rounded-full bg-field ${
              isSaving ? "opacity-[0.62]" : ""
            }`}
            disabled={isSaving}
            onPress={handleIgnore}
          >
            <Text className="text-[14px] font-bold text-ink">Ignore</Text>
          </Pressable>
          <Pressable
            className={`min-h-[52px] flex-1 items-center justify-center rounded-full bg-ink ${
              isSaving ? "opacity-[0.62]" : ""
            }`}
            disabled={isSaving}
            onPress={handleConfirm}
            style={premiumTheme.shadow.soft}
          >
            <Text className="text-[14px] font-bold text-white">
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
          className="flex-1 items-center justify-center bg-ink/40 p-7"
        >
          <Pressable
            onPress={() => setAliasEditorVisible(false)}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, scale: 1 }}
            from={{ opacity: 0, scale: 0.94 }}
            style={aliasEditorCardStyle}
            transition={{
              damping: 17,
              mass: 0.7,
              stiffness: 240,
              type: "spring",
            }}
          >
            <Text className="text-[17px] font-extrabold tracking-[-0.3px] text-ink">
              Edit captured name
            </Text>
            <Text className="mt-1.5 text-[12.5px] leading-[18px] text-secondary">
              Corrects the raw name on this capture only. Use the Merchant
              section below to link a merchant.
            </Text>

            <View className="mt-4 min-h-12 flex-row items-center gap-[9px] rounded-control bg-field px-3.5">
              <Store color="#7b818c" size={17} strokeWidth={2.3} />
              <TextInput
                autoFocus
                className="flex-1 py-0 text-[14.5px] font-semibold text-ink"
                onChangeText={setAliasDraft}
                onSubmitEditing={() => {
                  void handleSaveAlias();
                }}
                placeholder="Merchant name"
                placeholderTextColor="#8b929d"
                returnKeyType="done"
                value={aliasDraft}
              />
            </View>

            <View className="mt-[18px] flex-row gap-[11px]">
              <Pressable
                className="min-h-12 flex-1 items-center justify-center rounded-control bg-field active:opacity-[0.62]"
                onPress={() => setAliasEditorVisible(false)}
              >
                <Text className="text-[14px] font-bold text-ink">Cancel</Text>
              </Pressable>
              <Pressable
                className={`min-h-12 flex-1 items-center justify-center rounded-control bg-ink active:opacity-[0.62] ${
                  !aliasDraft.trim() || isSavingAlias ? "opacity-[0.62]" : ""
                }`}
                disabled={!aliasDraft.trim() || isSavingAlias}
                onPress={() => {
                  void handleSaveAlias();
                }}
              >
                <Text className="text-[14px] font-extrabold text-white">
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
            <View className="gap-3.5 px-5 pb-6 pt-5">
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
                className="max-h-[380px]"
                contentContainerClassName="gap-1 pb-2"
                keyboardShouldPersistTaps="handled"
              >
                {canCreateMerchant ? (
                  <Pressable
                    className={`min-h-[56px] flex-row items-center gap-3 rounded-control bg-field px-2.5 active:opacity-[0.62] ${
                      isCreatingMerchant ? "opacity-[0.62]" : ""
                    }`}
                    disabled={isCreatingMerchant}
                    onPress={() => {
                      void handleCreateMerchant();
                    }}
                  >
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-ink">
                      <Plus color="#ffffff" size={16} strokeWidth={2.8} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[14px] font-bold text-ink"
                        numberOfLines={1}
                      >
                        {isCreatingMerchant
                          ? "Creating..."
                          : `Create "${trimmedMerchantSearch}"`}
                      </Text>
                      <Text className="mt-0.5 text-[11px] font-medium text-secondary">
                        New merchant, linked to this transaction
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                {visibleMerchants.map(({ merchant, suggested }) => {
                  const selected = merchant.id === event.merchant_id;

                  return (
                    <Pressable
                      className={`min-h-[54px] flex-row items-center gap-3 rounded-control px-2.5 active:opacity-[0.62] ${
                        selected ? "bg-field" : ""
                      }`}
                      key={merchant.id}
                      onPress={() => {
                        void handleMerchant(merchant.id);
                      }}
                    >
                      <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-field">
                        <Text className="text-[13px] font-bold text-ink">
                          {getMerchantInitials(merchant.name)}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-[14px] font-bold text-ink"
                          numberOfLines={1}
                        >
                          {merchant.name}
                        </Text>
                        <Text className="mt-0.5 text-[11px] font-medium text-secondary">
                          {merchant.usage_count ?? 0} transactions
                        </Text>
                      </View>
                      {suggested && !selected ? (
                        <View className="rounded-full bg-field px-[9px] py-1">
                          <Text className="text-[10px] font-bold uppercase tracking-[0.4px] text-secondary">
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
                    className="mt-1.5 min-h-11 flex-row items-center justify-center gap-2 active:opacity-[0.62]"
                    onPress={() => {
                      void handleMerchant(null);
                    }}
                  >
                    <X
                      color={premiumTheme.colors.danger}
                      size={15}
                      strokeWidth={2.6}
                    />
                    <Text className="text-[13px] font-semibold text-danger">
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
