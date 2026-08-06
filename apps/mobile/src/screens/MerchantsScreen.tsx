import { useMemo, useState } from "react";
import { MotiView } from "moti";
import {
  Check,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CachedMerchant } from "@finance/shared-types";
import { normalizeMerchantName } from "@finance/shared-utils";

import { financeStyles } from "../components/finance/financeStyles";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumTheme } from "../theme/premiumTheme";
import { getCategoryVisual } from "../utils/financeVisuals";

type MerchantSort = "name" | "usage" | "recent";

const merchantSortOptions = [
  { label: "Name", value: "name" },
  { label: "Most used", value: "usage" },
  { label: "Recently used", value: "recent" },
] satisfies { label: string; value: MerchantSort }[];

// Custom colored shadows have no Tailwind equivalent, so they stay as plain
// style objects combined with className.
const addButtonShadow = {
  shadowColor: premiumTheme.colors.ink,
  shadowOffset: { height: 7, width: 0 },
  shadowOpacity: 0.22,
  shadowRadius: 12,
} as const;

const primaryButtonShadow = {
  shadowColor: premiumTheme.colors.ink,
  shadowOffset: { height: 8, width: 0 },
  shadowOpacity: 0.18,
  shadowRadius: 14,
} as const;

// MotiView is not NativeWind-interop'd, so the sort panel keeps a plain
// style object.
const merchantSortPanelStyle = {
  backgroundColor: premiumTheme.colors.canvas,
  borderTopLeftRadius: premiumTheme.radius.modal,
  borderTopRightRadius: premiumTheme.radius.modal,
  padding: 18,
  paddingBottom: 30,
} as const;

export function MerchantsScreen() {
  const merchants = useOfflineStore((state) => state.merchants);
  const categories = useOfflineStore((state) => state.categories);
  const transactions = useOfflineStore((state) => state.transactions);
  const createMerchant = useOfflineStore((state) => state.createMerchant);
  const updateMerchant = useOfflineStore((state) => state.updateMerchant);
  const merchantAliases = useOfflineStore((state) => state.merchantAliases);
  const addMerchantAlias = useOfflineStore(
    (state) => state.addMerchantAlias
  );
  const deleteMerchantAlias = useOfflineStore(
    (state) => state.deleteMerchantAlias
  );
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
  const [aliasInput, setAliasInput] = useState("");
  const [aliasNotice, setAliasNotice] = useState<string | null>(null);
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

  const editingAliases = editingMerchant
    ? merchantAliases.filter(
        (alias) => alias.merchant_id === editingMerchant.id
      )
    : [];

  async function handleDeleteAlias(aliasId: string) {
    try {
      await deleteMerchantAlias(aliasId);
    } catch {
      // Store exposes the friendly error message.
    }
  }

  async function handleAddAlias() {
    const alias = aliasInput.trim();

    if (!editingMerchant || !alias) {
      return;
    }

    setAliasNotice(null);

    try {
      const added = await addMerchantAlias(editingMerchant.id, alias);

      if (added) {
        setAliasInput("");
      } else {
        setAliasNotice(
          "This alias is already covered by the merchant's name or an existing alias."
        );
      }
    } catch {
      // Store exposes the friendly error message.
    }
  }

  function openEditor(merchant: CachedMerchant | null = null) {
    setEditingMerchant(merchant);
    setMerchantName(merchant?.name ?? "");
    setCategoryId(merchant?.category_id ?? merchant?.category?.id ?? null);
    setFormError(null);
    setAliasInput("");
    setAliasNotice(null);
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
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerClassName="gap-[18px] bg-canvas p-5 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between gap-4">
          <Text className="flex-1 text-[14px] leading-5 text-secondary">
            Manage the merchant records used by your transactions.
          </Text>
          <Pressable
            accessibilityLabel="Add merchant"
            className="h-11 w-11 items-center justify-center rounded-[22px] bg-ink active:opacity-[0.8] active:scale-[0.97]"
            onPress={() => openEditor()}
            style={addButtonShadow}
          >
            <Plus color="#ffffff" size={23} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2.5">
          <View className="min-h-[52px] flex-1 flex-row items-center gap-[9px] rounded-[17px] bg-field px-3.5">
            <Search color="#94a3b8" size={20} strokeWidth={2.3} />
            <TextInput
              className="min-h-[50px] flex-1 py-0 text-[14px] font-bold text-ink"
              onChangeText={setSearchQuery}
              placeholder="Search merchants"
              placeholderTextColor="#94a3b8"
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
            className="min-h-[52px] flex-row items-center gap-[7px] rounded-[17px] bg-field px-3.5"
            onPress={() => setSortVisible(true)}
          >
            <SlidersHorizontal color="#475569" size={19} strokeWidth={2.2} />
            <Text className="text-[13px] font-black text-[#334155]">Sort</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between px-0.5">
          <Text className="text-[15px] font-black text-ink">
            {displayedMerchants.length} {displayedMerchants.length === 1 ? "Merchant" : "Merchants"}
          </Text>
          <Text className="text-[12px] font-extrabold text-secondary">
            {selectedSort}
          </Text>
        </View>

        <View
          className="overflow-hidden rounded-section bg-elevated"
          style={premiumTheme.shadow.floating}
        >
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
                className={`min-h-[70px] flex-row items-center gap-[11px] px-3.5 py-3 active:bg-field ${
                  index < displayedMerchants.length - 1
                    ? "border-b-hairline border-b-divider"
                    : ""
                }`}
                key={merchant.id}
                onPress={() => openEditor(merchant)}
              >
                <View
                  className="h-[46px] w-[46px] items-center justify-center rounded-[15px]"
                  style={{ backgroundColor: accent + "16" }}
                >
                  <Text
                    className="text-[15px] font-black"
                    style={{ color: accent }}
                  >
                    {getMerchantInitials(merchant.name)}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[15px] font-black text-ink"
                    numberOfLines={1}
                  >
                    {merchant.name}
                  </Text>
                  <View className="mt-[5px] flex-row items-center gap-1.5">
                    <CategoryIcon color={accent} size={14} strokeWidth={2.4} />
                    <Text
                      className="shrink text-[12px] font-bold text-secondary"
                      numberOfLines={1}
                    >
                      {categoryName}
                    </Text>
                  </View>
                </View>
                <View className="min-w-[62px] items-end">
                  <Text className="text-[16px] font-black text-[#5636f5]">
                    {getMerchantUsage(merchant, usageByMerchantId)}
                  </Text>
                  <Text className="mt-0.5 text-[10px] font-bold text-muted">
                    transactions
                  </Text>
                </View>
                <ChevronRight color="#94a3b8" size={20} strokeWidth={2.2} />
              </Pressable>
            );
          })}

          {displayedMerchants.length === 0 ? (
            <View className="items-center px-6 py-[38px]">
              <View className="mb-3 h-[50px] w-[50px] items-center justify-center rounded-[19px] bg-[#f0edff]">
                <Store color={premiumTheme.colors.ink} size={24} strokeWidth={2.2} />
              </View>
              <Text style={financeStyles.merchantEmptyTitle}>
                {searchQuery.trim() ? "No merchants found" : "No merchants yet"}
              </Text>
              <Text style={financeStyles.merchantEmptyText}>
                {searchQuery.trim()
                  ? "Try a different name or category."
                  : "Add a merchant to keep transaction names consistent."}
              </Text>
              {!searchQuery.trim() ? (
                <Pressable
                  className="mt-4 min-h-[42px] flex-row items-center gap-[7px] rounded-full bg-ink px-[17px]"
                  onPress={() => openEditor()}
                >
                  <Plus color="#ffffff" size={17} strokeWidth={2.7} />
                  <Text className="text-[13px] font-black text-white">
                    Add merchant
                  </Text>
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
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            accessibilityLabel="Close sort options"
            onPress={() => setSortVisible(false)}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 24 }}
            style={merchantSortPanelStyle}
            transition={{ duration: 180, type: "timing" }}
          >
            <Text style={financeStyles.sectionTitle}>Sort merchants</Text>
            <Text style={financeStyles.muted}>Choose how this list is ordered.</Text>
            <View className="mt-[18px] gap-[9px]">
              {merchantSortOptions.map((option) => (
                <Pressable
                  className={`min-h-[52px] flex-row items-center justify-between rounded-2xl px-3.5 ${
                    sort === option.value ? "bg-accent-soft" : "bg-field"
                  }`}
                  key={option.value}
                  onPress={() => {
                    setSort(option.value);
                    setSortVisible(false);
                  }}
                >
                  <Text
                    className={`text-[14px] font-extrabold ${
                      sort === option.value
                        ? "text-[#5636f5]"
                        : "text-[#334155]"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {sort === option.value ? (
                    <Check color={premiumTheme.colors.ink} size={19} strokeWidth={2.8} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="none"
        onRequestClose={closeEditor}
        transparent
        visible={editorVisible}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            accessibilityLabel="Close merchant form"
            onPress={closeEditor}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={financeStyles.modalPanel}
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView
              contentContainerClassName="gap-3.5 p-[18px] pb-[30px]"
              keyboardShouldPersistTaps="handled"
            >
              <View style={financeStyles.modalHeader}>
                <View className="flex-1">
                  <Text style={financeStyles.sectionTitle}>
                    {editingMerchant ? "Edit merchant" : "New merchant"}
                  </Text>
                  <Text style={financeStyles.muted}>
                    Name the merchant and set its default category.
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close merchant form"
                  disabled={isSaving}
                  onPress={closeEditor}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              <TextInput
                autoCapitalize="words"
                autoFocus
                className="min-h-[52px] rounded-[15px] bg-field px-3.5 text-[15px] font-bold text-ink"
                onChangeText={(value) => {
                  setMerchantName(value);
                  setFormError(null);
                }}
                placeholder="Merchant name"
                placeholderTextColor="#94a3b8"
                value={merchantName}
              />

              <Text className="text-[14px] font-black text-ink">
                Default category
              </Text>
              <ScrollView
                contentContainerClassName="gap-[9px] pr-[18px]"
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <Pressable
                  className={`min-h-12 flex-row items-center gap-2 rounded-2xl px-2.5 ${
                    categoryId === null ? "bg-accent-soft" : "bg-field"
                  }`}
                  onPress={() => setCategoryId(null)}
                >
                  <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#f1f5f9]">
                    <Store color="#64748b" size={18} strokeWidth={2.3} />
                  </View>
                  <Text className="text-[13px] font-extrabold text-[#334155]">
                    Uncategorized
                  </Text>
                  {categoryId === null ? (
                    <Check color={premiumTheme.colors.ink} size={16} strokeWidth={2.8} />
                  ) : null}
                </Pressable>
                {categories.map((category) => {
                  const visual = getCategoryVisual(category);
                  const Icon = visual.Icon;
                  const selected = categoryId === category.id;
                  return (
                    <Pressable
                      className={`min-h-12 flex-row items-center gap-2 rounded-2xl px-2.5 ${
                        selected ? "bg-accent-soft" : "bg-field"
                      }`}
                      key={category.id}
                      onPress={() => setCategoryId(category.id)}
                    >
                      <View
                        className="h-[30px] w-[30px] items-center justify-center rounded-[10px]"
                        style={{ backgroundColor: visual.color + "14" }}
                      >
                        <Icon color={visual.color} size={18} strokeWidth={2.3} />
                      </View>
                      <Text className="text-[13px] font-extrabold text-[#334155]">
                        {category.name}
                      </Text>
                      {selected ? (
                        <Check color={premiumTheme.colors.ink} size={16} strokeWidth={2.8} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {editingMerchant ? (
                <>
                  <Text className="text-[14px] font-black text-ink">
                    Aliases
                  </Text>
                  {editingAliases.length > 0 ? (
                    <View className="gap-[7px]">
                      {editingAliases.map((alias) => (
                        <View
                          className="min-h-[42px] flex-row items-center justify-between gap-2.5 rounded-xl bg-field px-3"
                          key={alias.id}
                        >
                          <Text
                            className="min-w-0 flex-1 text-[13px] font-semibold text-ink"
                            numberOfLines={1}
                          >
                            {alias.alias}
                          </Text>
                          <Pressable
                            accessibilityLabel={`Remove alias ${alias.alias}`}
                            className="h-6 w-6 items-center justify-center rounded-full bg-white"
                            hitSlop={8}
                            onPress={() => {
                              void handleDeleteAlias(alias.id);
                            }}
                            style={({ pressed }) =>
                              pressed
                                ? financeStyles.saveButtonDisabled
                                : undefined
                            }
                          >
                            <X
                              color={premiumTheme.colors.secondary}
                              size={13}
                              strokeWidth={2.6}
                            />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-[12px] leading-[18px] text-secondary">
                      No aliases yet. Aliases are learned automatically when
                      you link captured transactions to this merchant, and
                      make future captures match on their own.
                    </Text>
                  )}

                  <View className="mt-0.5 flex-row items-center gap-2">
                    <TextInput
                      autoCapitalize="none"
                      className="min-h-[42px] flex-1 rounded-xl bg-field px-3 py-0 text-[13px] font-semibold text-ink"
                      onChangeText={(value) => {
                        setAliasInput(value);
                        setAliasNotice(null);
                      }}
                      onSubmitEditing={() => void handleAddAlias()}
                      placeholder="Add an alias, e.g. SWIGGY*ORDER"
                      placeholderTextColor="#94a3b8"
                      returnKeyType="done"
                      value={aliasInput}
                    />
                    <Pressable
                      accessibilityLabel="Add alias"
                      className="h-[38px] w-[38px] items-center justify-center rounded-full bg-ink"
                      disabled={!aliasInput.trim()}
                      onPress={() => void handleAddAlias()}
                      style={({ pressed }) =>
                        pressed || !aliasInput.trim()
                          ? financeStyles.saveButtonDisabled
                          : undefined
                      }
                    >
                      <Plus color="#ffffff" size={16} strokeWidth={2.8} />
                    </Pressable>
                  </View>
                  {aliasNotice ? (
                    <Text className="text-[12px] leading-[17px] text-secondary">
                      {aliasNotice}
                    </Text>
                  ) : null}
                </>
              ) : null}

              {formError ? <Text style={financeStyles.error}>{formError}</Text> : null}
              <View className="mt-2.5 w-full flex-row items-stretch gap-2.5">
                <Pressable
                  className="min-h-[54px] flex-[1.5] items-center justify-center rounded-[17px] bg-ink px-[18px] active:opacity-[0.82] active:scale-[0.995]"
                  disabled={isSaving}
                  onPress={() => void handleSaveMerchant()}
                  style={[
                    primaryButtonShadow,
                    isSaving ? financeStyles.saveButtonDisabled : null,
                  ]}
                >
                  <Text className="text-[16px] font-black text-white">
                    {isSaving
                      ? "Saving..."
                      : editingMerchant
                        ? "Save changes"
                        : "Create merchant"}
                  </Text>
                </Pressable>
                <Pressable
                  className="min-h-[52px] flex-[0.8] items-center justify-center rounded-[17px] bg-field px-[18px] active:opacity-[0.82] active:scale-[0.995]"
                  disabled={isSaving}
                  onPress={closeEditor}
                >
                  <Text className="text-[15px] font-black text-[#334155]">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </KeyboardAvoidingView>
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
