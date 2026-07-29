import { useMemo, useState } from "react";
import { MotiView } from "moti";
import { Check, Plus, Search, X } from "lucide-react-native";
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

import type { CachedCategory } from "@finance/shared-types";

import { financeStyles } from "../components/finance/financeStyles";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumHairline, premiumTheme } from "../theme/premiumTheme";
import { titleCase } from "../utils/financeFormat";
import {
  categoryIconOptions,
  getCategoryVisual,
} from "../utils/financeVisuals";

type CategoryFilter = "all" | "system" | "custom";

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
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            accessibilityLabel="Close category form"
            onPress={closeModal}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={financeStyles.modalPanel}
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={financeStyles.modalHeader}>
                <View style={styles.rowTitleBlock}>
                  <Text style={financeStyles.sectionTitle}>New category</Text>
                  <Text style={financeStyles.muted}>
                    Choose a name and visual style for this category.
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close category form"
                  disabled={isSaving}
                  onPress={closeModal}
                  style={financeStyles.modalCloseButton}
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

              {formError ? <Text style={financeStyles.error}>{formError}</Text> : null}
              <View style={styles.actions}>
                <Pressable
                  disabled={isSaving}
                  onPress={() => void handleCreateCategory()}
                  style={[
                    styles.primaryButton,
                    isSaving && financeStyles.saveButtonDisabled,
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
        </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
  accountSectionLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  categoriesContainer: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 16,
    padding: 20,
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
    backgroundColor: premiumTheme.colors.field,
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
    backgroundColor: premiumTheme.colors.canvas,
    shadowColor: premiumTheme.colors.ink,
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
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 15,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  categoryListCard: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    overflow: "hidden",
    ...premiumTheme.shadow.floating,
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
    minHeight: 68,
    paddingHorizontal: 14,
  },
  categoryListRowDivider: {
    borderBottomColor: premiumTheme.colors.divider,
    borderBottomWidth: premiumHairline,
  },
  categoryListTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
  categoryOptionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categorySearchBar: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
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
  modalContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 30,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
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
  rowTitleBlock: {
    flex: 1,
  },
  screen: {
    backgroundColor: premiumTheme.colors.canvas,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "900",
  },
});
