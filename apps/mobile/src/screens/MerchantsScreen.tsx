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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CachedMerchant } from "@finance/shared-types";
import { normalizeMerchantName } from "@finance/shared-utils";

import { financeStyles } from "../components/finance/financeStyles";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumHairline, premiumTheme } from "../theme/premiumTheme";
import { getCategoryVisual } from "../utils/financeVisuals";

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
            style={styles.merchantSortPanel}
            transition={{ duration: 180, type: "timing" }}
          >
            <Text style={financeStyles.sectionTitle}>Sort merchants</Text>
            <Text style={financeStyles.muted}>Choose how this list is ordered.</Text>
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
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={financeStyles.modalHeader}>
                <View style={styles.rowTitleBlock}>
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
                    <Check color={premiumTheme.colors.ink} size={16} strokeWidth={2.8} />
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
                        <Check color={premiumTheme.colors.ink} size={16} strokeWidth={2.8} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {editingMerchant ? (
                <>
                  <Text style={styles.accountSectionLabel}>Aliases</Text>
                  {editingAliases.length > 0 ? (
                    <View style={styles.aliasList}>
                      {editingAliases.map((alias) => (
                        <View key={alias.id} style={styles.aliasRow}>
                          <Text
                            numberOfLines={1}
                            style={styles.aliasText}
                          >
                            {alias.alias}
                          </Text>
                          <Pressable
                            accessibilityLabel={`Remove alias ${alias.alias}`}
                            hitSlop={8}
                            onPress={() => {
                              void handleDeleteAlias(alias.id);
                            }}
                            style={({ pressed }) => [
                              styles.aliasRemoveButton,
                              pressed &&
                                financeStyles.saveButtonDisabled,
                            ]}
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
                    <Text style={styles.aliasEmptyText}>
                      No aliases yet. Aliases are learned automatically when
                      you link captured transactions to this merchant, and
                      make future captures match on their own.
                    </Text>
                  )}

                  <View style={styles.aliasAddRow}>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(value) => {
                        setAliasInput(value);
                        setAliasNotice(null);
                      }}
                      onSubmitEditing={() => void handleAddAlias()}
                      placeholder="Add an alias, e.g. SWIGGY*ORDER"
                      placeholderTextColor="#94a3b8"
                      returnKeyType="done"
                      style={styles.aliasAddInput}
                      value={aliasInput}
                    />
                    <Pressable
                      accessibilityLabel="Add alias"
                      disabled={!aliasInput.trim()}
                      onPress={() => void handleAddAlias()}
                      style={({ pressed }) => [
                        styles.aliasAddButton,
                        (pressed || !aliasInput.trim()) &&
                          financeStyles.saveButtonDisabled,
                      ]}
                    >
                      <Plus color="#ffffff" size={16} strokeWidth={2.8} />
                    </Pressable>
                  </View>
                  {aliasNotice ? (
                    <Text style={styles.aliasNoticeText}>{aliasNotice}</Text>
                  ) : null}
                </>
              ) : null}

              {formError ? <Text style={financeStyles.error}>{formError}</Text> : null}
              <View style={styles.merchantFormActions}>
                <Pressable
                  disabled={isSaving}
                  onPress={() => void handleSaveMerchant()}
                  style={({ pressed }) => [
                    styles.merchantFormPrimaryButton,
                    pressed && styles.merchantFormButtonPressed,
                    isSaving && financeStyles.saveButtonDisabled,
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

const styles = StyleSheet.create({
  accountSectionLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  categoryNameInput: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 15,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  merchantAddButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    shadowColor: premiumTheme.colors.ink,
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
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  merchantCategoryOptionActive: {
    backgroundColor: premiumTheme.colors.accentSoft,
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
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    overflow: "hidden",
    ...premiumTheme.shadow.floating,
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
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  merchantDirectoryRowDivider: {
    borderBottomColor: premiumTheme.colors.divider,
    borderBottomWidth: premiumHairline,
  },
  merchantDirectoryRowPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  merchantDirectorySearch: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 17,
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
    backgroundColor: premiumTheme.colors.ink,
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
  aliasAddButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: premiumTheme.radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  aliasAddInput: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 12,
    color: premiumTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  aliasAddRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  aliasEmptyText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  aliasNoticeText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  aliasList: {
    gap: 7,
  },
  aliasRemoveButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.pill,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  aliasRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  aliasText: {
    color: premiumTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    minWidth: 0,
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
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 17,
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
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 17,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
    shadowColor: premiumTheme.colors.ink,
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
  merchantSearchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  merchantSortButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 17,
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
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  merchantSortOptionActive: {
    backgroundColor: premiumTheme.colors.accentSoft,
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
    backgroundColor: premiumTheme.colors.canvas,
    borderTopLeftRadius: premiumTheme.radius.modal,
    borderTopRightRadius: premiumTheme.radius.modal,
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
  merchantsContainer: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 18,
    padding: 20,
    paddingBottom: 32,
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
  modalContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 30,
  },
  rowTitleBlock: {
    flex: 1,
  },
  screen: {
    backgroundColor: premiumTheme.colors.canvas,
    flex: 1,
  },
});
