import { useMemo, useState } from "react";
import { MotiView } from "moti";
import { Check, Plus, Search, X } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CachedCategory } from "@finance/shared-types";

import { financeStyles } from "../components/finance/financeStyles";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumTheme } from "../theme/premiumTheme";
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

// Custom filter-pill shadow (not part of premiumTheme.shadow), so it stays a
// plain style object.
const filterActiveShadow = {
  shadowColor: premiumTheme.colors.ink,
  shadowOffset: {
    height: 5,
    width: 0,
  },
  shadowOpacity: 0.05,
  shadowRadius: 10,
} as const;

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
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerClassName="bg-canvas gap-4 p-5 pb-9"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-start justify-between gap-3.5">
          <View className="min-w-0 flex-1">
            <Text className="mt-1 text-[13px] leading-[19px] text-secondary">
              Organize transactions with system and custom categories.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Add new category"
            accessibilityRole="button"
            className="min-h-[43px] flex-row items-center gap-1.5 rounded-[15px] bg-ink px-3.5 active:opacity-[0.78]"
            onPress={() => setModalVisible(true)}
          >
            <Plus color="#ffffff" size={19} strokeWidth={2.8} />
            <Text className="text-[13px] font-black text-white">New</Text>
          </Pressable>
        </View>

        <View className="min-h-[49px] flex-row items-center gap-2.5 rounded-[16px] bg-field px-3.5">
          <Search color="#94a3b8" size={20} strokeWidth={2.3} />
          <TextInput
            className="min-h-12 flex-1 py-0 text-[14px] text-ink"
            onChangeText={setSearchQuery}
            placeholder="Search categories"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
          />
        </View>

        <View className="flex-row gap-1 rounded-[17px] bg-field p-[5px]">
          {(["all", "system", "custom"] as const).map((item) => (
            <Pressable
              className={`min-h-9 flex-1 items-center justify-center rounded-[13px] ${
                filter === item ? "bg-canvas" : ""
              }`}
              key={item}
              onPress={() => setFilter(item)}
              style={filter === item ? filterActiveShadow : undefined}
            >
              <Text
                className={`text-[12px] font-extrabold ${
                  filter === item ? "text-ink" : "text-secondary"
                }`}
              >
                {titleCase(item)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center justify-between px-[3px]">
          <Text className="text-[12px] font-black uppercase tracking-[0.5px] text-secondary">
            {filter === "all" ? "All categories" : titleCase(filter) + " categories"}
          </Text>
          <Text className="text-[12px] font-black text-secondary">
            {filteredCategories.length}
          </Text>
        </View>

        <View
          className="overflow-hidden rounded-section bg-elevated"
          style={premiumTheme.shadow.floating}
        >
          {filteredCategories.map((category, index) => (
            <CategoryListRow
              category={category}
              key={category.id}
              showDivider={index < filteredCategories.length - 1}
              usageCount={usageByCategoryId.get(category.id) ?? 0}
            />
          ))}
          {filteredCategories.length === 0 ? (
            <View className="items-center p-6">
              <Text className="text-[15px] font-black text-ink">
                No categories found
              </Text>
              <Text className="mt-[5px] text-center text-[13px] text-secondary">
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
            <ScrollView contentContainerClassName="gap-3.5 p-[18px] pb-[30px]">
              <View style={financeStyles.modalHeader}>
                <View className="flex-1">
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
                className="min-h-[52px] rounded-[15px] bg-field px-3.5 text-[15px] font-bold text-ink"
                onChangeText={(value) => {
                  setName(value);
                  setFormError(null);
                }}
                placeholder="Category name"
                placeholderTextColor="#94a3b8"
                value={name}
              />

              <Text className="text-[14px] font-black text-ink">
                Choose an icon
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {categoryIconOptions.map((option) => {
                  const Icon = option.Icon;
                  const selected = icon === option.key;

                  return (
                    <Pressable
                      accessibilityLabel={option.key}
                      className="h-12 w-12 items-center justify-center rounded-[15px] bg-field"
                      key={option.key}
                      onPress={() => setIcon(option.key)}
                      style={
                        selected
                          ? {
                              backgroundColor: color + "14",
                              borderColor: color,
                            }
                          : undefined
                      }
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

              <Text className="text-[14px] font-black text-ink">
                Choose a color
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {categoryColorOptions.map((option) => (
                  <Pressable
                    accessibilityLabel={"Use color " + option}
                    className={`h-[38px] w-[38px] items-center justify-center rounded-full border-[3px] ${
                      color === option ? "border-ink" : "border-white"
                    }`}
                    key={option}
                    onPress={() => setColor(option)}
                    style={{ backgroundColor: option }}
                  >
                    {color === option ? (
                      <Check color="#ffffff" size={17} strokeWidth={3} />
                    ) : null}
                  </Pressable>
                ))}
              </View>

              {formError ? <Text style={financeStyles.error}>{formError}</Text> : null}
              <View className="mt-3.5 flex-row flex-wrap gap-2.5">
                <Pressable
                  className="min-h-[52px] items-center justify-center rounded-full bg-ink px-[18px]"
                  disabled={isSaving}
                  onPress={() => void handleCreateCategory()}
                  style={isSaving ? financeStyles.saveButtonDisabled : undefined}
                >
                  <Text className="text-[16px] font-black text-white">
                    {isSaving ? "Creating..." : "Create category"}
                  </Text>
                </Pressable>
                <Pressable
                  className="rounded-full bg-field px-3.5 py-2.5"
                  disabled={isSaving}
                  onPress={closeModal}
                >
                  <Text className="font-black text-ink">Cancel</Text>
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
      className={`min-h-[68px] flex-row items-center gap-3 px-3.5 ${
        showDivider ? "border-b-hairline border-b-divider" : ""
      }`}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-[15px]"
        style={{ backgroundColor: visual.color + "14" }}
      >
        <Icon color={visual.color} size={21} strokeWidth={2.4} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-black text-ink">{category.name}</Text>
        <Text className="mt-[3px] text-[12px] text-secondary">
          {category.is_system ? "System category" : "Custom category"}
        </Text>
      </View>
      <View
        className="h-8 min-w-8 items-center justify-center rounded-full px-[9px]"
        style={{ backgroundColor: visual.color + "12" }}
      >
        <Text className="text-[12px] font-black" style={{ color: visual.color }}>
          {usageCount}
        </Text>
      </View>
    </View>
  );
}
