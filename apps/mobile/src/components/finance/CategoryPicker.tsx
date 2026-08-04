import { useMemo, useState } from "react";
import { MotiView } from "moti";
import { Check, Plus, ReceiptText, Search, X } from "lucide-react-native";
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

import { premiumTheme } from "../../theme/premiumTheme";
import { darkenColor, getCategoryVisual } from "../../utils/financeVisuals";
import { financeStyles } from "./financeStyles";

export function CategoryPickerField({
  categories,
  frequentCategoryIds,
  onManageCategories,
  onSelect,
  selectedCategoryId,
  showHeader = true,
}: {
  categories: CachedCategory[];
  frequentCategoryIds: string[];
  onManageCategories: () => void;
  onSelect: (categoryId: string | null) => void;
  selectedCategoryId: string | null;
  showHeader?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ?? null;
  const quickCategories = useMemo(() => {
    const frequencyRank = new Map(
      frequentCategoryIds.map((categoryId, index) => [categoryId, index])
    );
    const quick = categories
      .slice()
      .sort((first, second) => {
        const firstRank = frequencyRank.get(first.id) ?? Number.MAX_SAFE_INTEGER;
        const secondRank =
          frequencyRank.get(second.id) ?? Number.MAX_SAFE_INTEGER;

        return (
          firstRank - secondRank || first.name.localeCompare(second.name)
        );
      })
      .slice(0, 5);

    // A selection made from the full picker must stay visible: swap it
    // into the last quick slot when it is outside the frequent five.
    if (
      selectedCategoryId &&
      !quick.some((category) => category.id === selectedCategoryId)
    ) {
      const selected = categories.find(
        (category) => category.id === selectedCategoryId
      );

      if (selected) {
        if (quick.length === 0) {
          quick.push(selected);
        } else {
          quick[quick.length - 1] = selected;
        }
      }
    }

    return quick;
  }, [categories, frequentCategoryIds, selectedCategoryId]);
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories
      .filter((category) => category.name.toLowerCase().includes(query))
      .slice()
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [categories, search]);

  function select(categoryId: string | null) {
    setVisible(false);
    setSearch("");
    onSelect(categoryId);
  }

  return (
    <>
      <View style={styles.transactionCategoryCard}>
        {showHeader ? (
          <View style={styles.transactionCategoryHeader}>
            <Text style={styles.transactionCategoryTitle}>Category</Text>
            <Text style={styles.transactionCategorySelection}>
              {selectedCategory?.name ?? "Uncategorized"}
            </Text>
          </View>
        ) : null}
        <View style={styles.transactionCategoryChips}>
          {quickCategories.map((category) => {
            const visual = getCategoryVisual(category);
            const CategoryIcon = visual.Icon;
            const selected = selectedCategoryId === category.id;

            return (
              <Pressable
                hitSlop={4}
                key={category.id}
                onPress={() => onSelect(category.id)}
                style={[
                  styles.transactionCategoryChip,
                  selected && {
                    backgroundColor: `${visual.color}14`,
                    borderColor: `${visual.color}59`,
                  },
                ]}
              >
                <CategoryIcon
                  color={visual.color}
                  size={15}
                  strokeWidth={2.4}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.transactionCategoryChipText,
                    selected && {
                      color: darkenColor(visual.color),
                      fontWeight: "700",
                    },
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityHint="Opens all categories"
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => setVisible(true)}
            style={styles.transactionCategoryChip}
          >
            <Plus
              color={premiumTheme.colors.ink}
              size={15}
              strokeWidth={2.6}
            />
            <Text style={styles.transactionCategoryMoreText}>More</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            onPress={() => setVisible(false)}
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
            <View style={styles.categoryPickerContent}>
              <View style={financeStyles.modalHeader}>
                <View style={financeStyles.merchantPickerTitleBlock}>
                  <Text style={financeStyles.merchantPickerTitle}>Choose category</Text>
                  <Text style={financeStyles.merchantPickerSubtitle}>
                    This category will be applied when the transaction is
                    confirmed.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setVisible(false)}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={financeStyles.merchantSearchBar}>
                <Search color="#7b818c" size={18} strokeWidth={2.3} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Search categories"
                  placeholderTextColor="#8b929d"
                  style={financeStyles.merchantSearchInput}
                  value={search}
                />
              </View>

              <ScrollView
                contentContainerStyle={styles.categoryPickerList}
                keyboardShouldPersistTaps="handled"
                style={styles.categoryPickerViewport}
              >
                <CategoryPickerOption
                  category={null}
                  onPress={() => select(null)}
                  selected={!selectedCategoryId}
                />
                {filteredCategories.map((category) => (
                  <CategoryPickerOption
                    category={category}
                    key={category.id}
                    onPress={() => select(category.id)}
                    selected={selectedCategoryId === category.id}
                  />
                ))}
                {filteredCategories.length === 0 ? (
                  <View style={financeStyles.merchantEmptyState}>
                    <Text style={financeStyles.merchantEmptyTitle}>
                      No matching category
                    </Text>
                    <Text style={financeStyles.merchantEmptyText}>
                      Create a category, then return to select it.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              <Pressable
                onPress={() => {
                  setVisible(false);
                  setSearch("");
                  onManageCategories();
                }}
                style={styles.categoryManageButton}
              >
                <Plus color="#ffffff" size={17} strokeWidth={2.8} />
                <Text style={styles.categoryManageButtonText}>
                  Manage categories
                </Text>
              </Pressable>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export function CategoryPickerOption({
  category,
  onPress,
  selected,
}: {
  category: CachedCategory | null;
  onPress: () => void;
  selected: boolean;
}) {
  const visual = category
    ? getCategoryVisual(category)
    : {
        color: "#64748b",
        Icon: ReceiptText,
      };
  const Icon = visual.Icon;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.categoryPickerOption,
        selected && styles.categoryPickerOptionSelected,
      ]}
    >
      <View
        style={[
          styles.categoryPickerOptionIcon,
          { backgroundColor: visual.color + "14" },
        ]}
      >
        <Icon color={visual.color} size={18} strokeWidth={2.5} />
      </View>
      <View style={styles.transactionSelectCopy}>
        <Text style={styles.categoryPickerOptionName}>
          {category?.name ?? "Uncategorized"}
        </Text>
        <Text style={styles.categoryPickerOptionMeta}>
          {category
            ? category.is_system
              ? "System category"
              : "Custom category"
            : "No category assigned"}
        </Text>
      </View>
      {selected ? (
        <View style={styles.merchantOptionCheck}>
          <Check color="#ffffff" size={14} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  categoryManageButton: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
  },
  categoryManageButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  categoryPickerContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 28,
  },
  categoryPickerList: {
    gap: 9,
    paddingBottom: 4,
  },
  categoryPickerOption: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryPickerOptionIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  categoryPickerOptionMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  categoryPickerOptionName: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  categoryPickerOptionSelected: {
    backgroundColor: premiumTheme.colors.accentSoft,
  },
  categoryPickerViewport: {
    maxHeight: 370,
  },
  merchantOptionCheck: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  transactionCategoryCard: {
    gap: 10,
  },
  transactionCategoryChip: {
    alignItems: "center",
    backgroundColor: "#f5f5f7",
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 1.2,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  transactionCategoryChipText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 92,
  },
  transactionCategoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 1,
    paddingVertical: 2,
  },
  transactionCategoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionCategoryMoreText: {
    color: premiumTheme.colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  transactionCategorySelection: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  transactionCategoryTitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  transactionSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
});
