import { useMemo, useRef, useState } from "react";
import { MotiView } from "moti";
import {
  CalendarDays,
  Ellipsis,
  PiggyBank,
  Plus,
  Search,
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
import type { DimensionValue } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { BudgetPeriod, CachedCategory } from "@finance/shared-types";
import { getCurrentMonthStart } from "@finance/shared-utils";

import { CategoryPickerOption } from "../components/finance/CategoryPicker";
import { financeStyles } from "../components/finance/financeStyles";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumHairline, premiumTheme } from "../theme/premiumTheme";
import { formatMonthRange, getFrequentCategoryIds } from "../utils/financeFormat";
import { darkenColor, getCategoryVisual } from "../utils/financeVisuals";

const BUDGET_PERIOD_OPTIONS: {
  label: string;
  value: BudgetPeriod;
}[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" },
];

const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  weekly: "Weekly",
  yearly: "Yearly",
};

function formatLocalIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function BudgetsScreen() {
  const budgets = useOfflineStore((state) => state.budgets);
  const categories = useOfflineStore((state) => state.categories);
  const transactions = useOfflineStore((state) => state.transactions);
  const createBudget = useOfflineStore((state) => state.createBudget);
  const synchronize = useSyncStore((state) => state.synchronize);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("monthly");
  const [budgetAutoRenew, setBudgetAutoRenew] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const budgetSavingRef = useRef(false);
  const [budgetFormVisible, setBudgetFormVisible] = useState(false);
  const [budgetCategorySearch, setBudgetCategorySearch] = useState("");
  const [budgetCategoryPickerVisible, setBudgetCategoryPickerVisible] =
    useState(false);
  const [budgetPickerSearch, setBudgetPickerSearch] = useState("");
  const budgetCategories = useMemo(
    () =>
      categories.filter((category) => {
        const normalized = category.name.trim().toLowerCase();
        return normalized !== "salary" && normalized !== "transfer";
      }),
    [categories]
  );
  const rankedBudgetCategories = useMemo(() => {
    const frequencyRank = new Map(
      getFrequentCategoryIds(transactions).map((id, index) => [id, index])
    );

    return budgetCategories
      .slice()
      .sort((first, second) => {
        const firstRank =
          frequencyRank.get(first.id) ?? Number.MAX_SAFE_INTEGER;
        const secondRank =
          frequencyRank.get(second.id) ?? Number.MAX_SAFE_INTEGER;

        return (
          firstRank - secondRank || first.name.localeCompare(second.name)
        );
      });
  }, [budgetCategories, transactions]);
  const visibleBudgetCategories = useMemo(() => {
    const query = budgetCategorySearch.trim().toLowerCase();

    if (query) {
      return rankedBudgetCategories.filter((category) =>
        category.name.toLowerCase().includes(query)
      );
    }

    const quick = rankedBudgetCategories.slice(0, 7);

    if (
      categoryId &&
      !quick.some((category) => category.id === categoryId)
    ) {
      const selected = rankedBudgetCategories.find(
        (category) => category.id === categoryId
      );

      if (selected) {
        quick[Math.max(quick.length - 1, 0)] = selected;
      }
    }

    return quick;
  }, [budgetCategorySearch, categoryId, rankedBudgetCategories]);
  const pickerBudgetCategories = useMemo(() => {
    const query = budgetPickerSearch.trim().toLowerCase();

    if (!query) {
      return rankedBudgetCategories;
    }

    return rankedBudgetCategories.filter((category) =>
      category.name.toLowerCase().includes(query)
    );
  }, [budgetPickerSearch, rankedBudgetCategories]);
  const showMoreCategoriesTile =
    budgetCategorySearch.trim() === "" &&
    rankedBudgetCategories.length > 7;

  function closeBudgetCategoryPicker() {
    setBudgetCategoryPickerVisible(false);
    setBudgetPickerSearch("");
  }

  function closeBudgetForm() {
    setBudgetFormVisible(false);
    setBudgetCategorySearch("");
    closeBudgetCategoryPicker();
  }

  function addQuickAmount(value: number) {
    const current = Number(budgetAmount);

    setBudgetAmount(
      String((Number.isFinite(current) ? current : 0) + value)
    );
    setBudgetError(null);
  }
  const overview = useMemo(
    () => MobileDashboardService.getBudgetOverview(budgets, transactions),
    [budgets, transactions]
  );
  const selectedCategory = categories.find(
    (category) => category.id === categoryId
  );
  const remainingPercentage =
    overview.totalBudgeted > 0
      ? Math.max(
          0,
          Math.min(100, (overview.remaining / overview.totalBudgeted) * 100)
        )
      : 0;
  const monthDate = new Date(overview.monthStart + "T00:00:00");

  async function handleCreateBudget() {
    if (budgetSavingRef.current) {
      return;
    }

    const amount = Number(budgetAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setBudgetError("Enter a valid budget amount.");
      return;
    }

    if (!categoryId) {
      setBudgetError("Choose a category for this budget.");
      return;
    }

    if (
      overview.budgets.some(
        (item) => item.budget.category_id === categoryId
      )
    ) {
      setBudgetError(
        "An active budget already exists for this category."
      );
      return;
    }

    budgetSavingRef.current = true;
    setIsSavingBudget(true);

    try {
      await createBudget({
        amount,
        auto_renew: budgetAutoRenew,
        category: selectedCategory ?? null,
        category_id: categoryId,
        period: budgetPeriod,
        // Weekly cycles anchor on today; month-based cycles anchor on the
        // calendar month so windows match what users expect.
        starts_on:
          budgetPeriod === "weekly"
            ? formatLocalIsoDate(new Date())
            : getCurrentMonthStart(),
      });
      await synchronize();
      setBudgetAmount("");
      setBudgetPeriod("monthly");
      setBudgetAutoRenew(true);
      setCategoryId(null);
      setBudgetError(null);
      closeBudgetForm();
    } finally {
      budgetSavingRef.current = false;
      setIsSavingBudget(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.budgetsContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.budgetsHero}>
        <Text style={styles.budgetsSubtitle}>
          Plan your spending and stay in control.
        </Text>
      </View>

      <View style={styles.budgetSummaryCard}>
        <View style={styles.budgetSummaryMain}>
          <View style={styles.budgetSummaryCopy}>
            <Text style={styles.budgetSummaryLabel}>Remaining this month</Text>
            <Text style={styles.budgetSummaryValue}>
              {MobileDashboardService.getFormattedBalance(overview.remaining)}
            </Text>
            <Text style={styles.budgetSummaryTotal}>
              of{" "}
              {MobileDashboardService.getFormattedBalance(
                overview.totalBudgeted
              )}
            </Text>
          </View>
          <BudgetSummaryRing percentage={remainingPercentage} />
        </View>
        <View style={styles.budgetSummaryFooter}>
          <CalendarDays color="#cbd5e1" size={17} strokeWidth={2.2} />
          <Text style={styles.budgetSummaryDate}>
            {formatMonthRange(monthDate)}
          </Text>
        </View>
      </View>

      <View style={styles.budgetListSection}>
        <View style={styles.budgetListHeader}>
          <View style={styles.budgetListTitleRow}>
            <Text style={financeStyles.sectionTitle}>Your budgets</Text>
            {overview.budgets.length > 0 ? (
              <Text style={styles.budgetListCount}>
                {overview.budgets.length}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => setBudgetFormVisible(true)}
            style={({ pressed }) => [
              styles.budgetAddButton,
              pressed && financeStyles.saveButtonDisabled,
            ]}
          >
            <Plus color="#ffffff" size={15} strokeWidth={2.7} />
            <Text style={styles.budgetAddButtonText}>Add</Text>
          </Pressable>
        </View>
        {overview.budgets.length === 0 ? (
          <View style={styles.budgetEmptyCard}>
            <View style={styles.budgetEmptyIcon}>
              <PiggyBank
                color={premiumTheme.colors.ink}
                size={30}
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.budgetEmptyTitle}>No budgets yet</Text>
            <Text style={styles.budgetEmptyText}>
              Add a category budget to track monthly spending.
            </Text>
            <Pressable
              onPress={() => setBudgetFormVisible(true)}
              style={styles.budgetEmptyButton}
            >
              <Plus color="#ffffff" size={17} strokeWidth={2.7} />
              <Text style={styles.budgetEmptyButtonText}>
                Add your first budget
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.budgetList}>
            {overview.budgets.map((item) => (
              <BudgetProgressRow
                category={
                  categories.find(
                    (category) => category.id === item.budget.category_id
                  ) ?? null
                }
                item={item}
                key={item.budget.id}
              />
            ))}
          </View>
        )}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeBudgetForm}
        transparent
        visible={budgetFormVisible}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            onPress={closeBudgetForm}
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
            <View style={styles.budgetFormContent}>
              <View style={financeStyles.modalHeader}>
                <View style={financeStyles.merchantPickerTitleBlock}>
                  <Text style={financeStyles.merchantPickerTitle}>Add budget</Text>
                  <Text style={financeStyles.merchantPickerSubtitle}>
                    Set a spending limit that repeats automatically.
                  </Text>
                </View>
                <Pressable
                  onPress={closeBudgetForm}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.budgetFormScroll}
              >
                <View style={styles.budgetLimitCard}>
                  <Text style={styles.budgetLimitLabel}>
                    {BUDGET_PERIOD_LABELS[budgetPeriod]} limit
                  </Text>
                  <View style={styles.budgetLimitRow}>
                    <Text style={styles.budgetLimitCurrency}>₹</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={(value) => {
                        setBudgetAmount(value);
                        setBudgetError(null);
                      }}
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                      style={styles.budgetLimitInput}
                      value={budgetAmount}
                    />
                  </View>
                </View>

                <View style={styles.budgetQuickRow}>
                  {[500, 1000, 2000, 5000].map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => addQuickAmount(value)}
                      style={({ pressed }) => [
                        styles.budgetQuickChip,
                        pressed && financeStyles.saveButtonDisabled,
                      ]}
                    >
                      <Text style={styles.budgetQuickChipText}>
                        +₹{value.toLocaleString("en-IN")}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.budgetPeriodRow}>
                  {BUDGET_PERIOD_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setBudgetPeriod(option.value)}
                      style={[
                        styles.budgetPeriodButton,
                        budgetPeriod === option.value &&
                          styles.budgetPeriodButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.budgetPeriodText,
                          budgetPeriod === option.value &&
                            styles.budgetPeriodTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: budgetAutoRenew }}
                  onPress={() => setBudgetAutoRenew(!budgetAutoRenew)}
                  style={styles.budgetRenewRow}
                >
                  <View style={styles.budgetRenewCopy}>
                    <Text style={styles.budgetRenewTitle}>Auto renew</Text>
                    <Text style={styles.budgetRenewText}>
                      {budgetAutoRenew
                        ? "Repeats automatically each period."
                        : "Runs for one period, then ends."}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.budgetRenewTrack,
                      budgetAutoRenew && styles.budgetRenewTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.budgetRenewKnob,
                        budgetAutoRenew && styles.budgetRenewKnobOn,
                      ]}
                    />
                  </View>
                </Pressable>

                <View style={styles.budgetCategoryHeaderRow}>
                  <Text style={styles.budgetCategoryTitle}>
                    Choose a category
                  </Text>
                  <View style={styles.budgetCategorySearch}>
                    <Search color="#7b818c" size={15} strokeWidth={2.3} />
                    <TextInput
                      onChangeText={setBudgetCategorySearch}
                      placeholder="Search"
                      placeholderTextColor="#8b929d"
                      style={styles.budgetCategorySearchInput}
                      value={budgetCategorySearch}
                    />
                  </View>
                </View>

                <View style={styles.budgetCategoryGrid}>
                  {visibleBudgetCategories.map((category) => (
                    <BudgetCategoryOption
                      category={category}
                      key={category.id}
                      onPress={() => {
                        setCategoryId(category.id);
                        setBudgetError(null);
                      }}
                      selected={categoryId === category.id}
                    />
                  ))}
                  {showMoreCategoriesTile && (
                    <Pressable
                      onPress={() => setBudgetCategoryPickerVisible(true)}
                      style={styles.budgetCategoryItem}
                    >
                      <View
                        style={[
                          styles.budgetCategoryCircle,
                          {
                            backgroundColor: premiumTheme.colors.field,
                          },
                        ]}
                      >
                        <Ellipsis
                          color={premiumTheme.colors.secondary}
                          size={18}
                          strokeWidth={2.4}
                        />
                      </View>
                      <Text style={styles.budgetCategoryLabel}>More</Text>
                    </Pressable>
                  )}
                </View>

                {budgetCategories.length === 0 && (
                  <Text style={financeStyles.muted}>
                    Sync categories before creating a budget.
                  </Text>
                )}

                {visibleBudgetCategories.length === 0 &&
                  budgetCategories.length > 0 && (
                    <Text style={financeStyles.muted}>
                      No category matches this search.
                    </Text>
                  )}

                {budgetError && (
                  <Text style={financeStyles.error}>{budgetError}</Text>
                )}

                <Pressable
                  disabled={isSavingBudget}
                  onPress={handleCreateBudget}
                  style={[
                    financeStyles.accountSaveButton,
                    styles.budgetSaveSpacing,
                    isSavingBudget && financeStyles.saveButtonDisabled,
                  ]}
                >
                  <Text style={financeStyles.accountSaveButtonText}>
                    {isSavingBudget ? "Saving..." : "Save Budget"}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeBudgetCategoryPicker}
        transparent
        visible={budgetCategoryPickerVisible}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            onPress={closeBudgetCategoryPicker}
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
                  <Text style={financeStyles.merchantPickerTitle}>
                    All categories
                  </Text>
                  <Text style={financeStyles.merchantPickerSubtitle}>
                    Choose a category for this budget.
                  </Text>
                </View>
                <Pressable
                  onPress={closeBudgetCategoryPicker}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={financeStyles.merchantSearchBar}>
                <Search color="#7b818c" size={18} strokeWidth={2.3} />
                <TextInput
                  onChangeText={setBudgetPickerSearch}
                  placeholder="Search categories"
                  placeholderTextColor="#8b929d"
                  style={financeStyles.merchantSearchInput}
                  value={budgetPickerSearch}
                />
              </View>

              <ScrollView
                contentContainerStyle={styles.categoryPickerList}
                keyboardShouldPersistTaps="handled"
                style={styles.categoryPickerViewport}
              >
                {pickerBudgetCategories.map((category) => (
                  <CategoryPickerOption
                    category={category}
                    key={category.id}
                    onPress={() => {
                      setCategoryId(category.id);
                      setBudgetError(null);
                      closeBudgetCategoryPicker();
                    }}
                    selected={categoryId === category.id}
                  />
                ))}
                {pickerBudgetCategories.length === 0 ? (
                  <View style={financeStyles.merchantEmptyState}>
                    <Text style={financeStyles.merchantEmptyTitle}>
                      No matching category
                    </Text>
                    <Text style={financeStyles.merchantEmptyText}>
                      Try a different search term.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function BudgetSummaryRing({ percentage }: { percentage: number }) {
  const size = 86;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, percentage));

  return (
    <View style={[styles.budgetRing, { height: size, width: size }]}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="#263354"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
          stroke="#ffffff"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress / 100)}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={styles.budgetRingLabel}>
        <Text style={styles.budgetRingValue}>{Math.round(progress)}%</Text>
        <Text style={styles.budgetRingText}>left</Text>
      </View>
    </View>
  );
}

function BudgetCategoryOption({
  category,
  onPress,
  selected,
}: {
  category: CachedCategory;
  onPress: () => void;
  selected: boolean;
}) {
  const visual = getCategoryVisual(category);
  const Icon = visual.Icon;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.budgetCategoryItem}
    >
      <View
        style={[
          styles.budgetCategoryCircle,
          {
            backgroundColor: `${visual.color}14`,
          },
          selected && {
            borderColor: visual.color,
          },
        ]}
      >
        <Icon color={visual.color} size={18} strokeWidth={2.3} />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.budgetCategoryLabel,
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
}

function BudgetProgressRow({
  category,
  item,
}: {
  category: CachedCategory | null;
  item: ReturnType<typeof MobileDashboardService.getBudgetOverview>["budgets"][number];
}) {
  const visual = category
    ? getCategoryVisual(category)
    : { color: "#64748b", Icon: Store };
  const Icon = visual.Icon;
  const statusColor =
    item.status === "over_limit"
      ? "#dc2626"
      : item.status === "near_limit"
        ? "#f59e0b"
        : "#16a34a";
  const statusLabel =
    item.status === "over_limit"
      ? "Over limit"
      : item.status === "near_limit"
        ? "Near limit"
        : "On track";
  const progressWidth =
    (Math.max(0, Math.min(100, item.percentage)).toString() +
      "%") as DimensionValue;

  return (
    <View style={styles.budgetProgressRow}>
      <View style={styles.budgetProgressHeader}>
        <View
          style={[
            styles.budgetProgressIcon,
            { backgroundColor: visual.color + "14" },
          ]}
        >
          <Icon color={visual.color} size={20} strokeWidth={2.4} />
        </View>
        <View style={styles.budgetProgressCopy}>
          <Text style={styles.budgetProgressName}>
            {category?.name ?? item.budget.category?.name ?? "Uncategorized"}
          </Text>
          <Text style={styles.budgetProgressAmount}>
            {MobileDashboardService.getFormattedBalance(item.spent)} of{" "}
            {MobileDashboardService.getFormattedBalance(item.budget.amount)}
          </Text>
          <Text style={styles.budgetProgressMeta}>
            {BUDGET_PERIOD_LABELS[item.budget.period ?? "monthly"]}
            {(item.budget.auto_renew ?? true) ? " · Auto renew ✓" : " · One period"}
          </Text>
        </View>
        <View
          style={[
            styles.budgetStatusBadge,
            { backgroundColor: statusColor + "12" },
          ]}
        >
          <Text style={[styles.budgetStatusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <View style={styles.budgetProgressTrack}>
        <View
          style={[
            styles.budgetProgressFill,
            { backgroundColor: statusColor, width: progressWidth },
          ]}
        />
      </View>
      <View style={styles.budgetProgressFooter}>
        <Text style={styles.budgetProgressPercent}>
          {Math.round(item.percentage)}% used
        </Text>
        <Text style={styles.budgetProgressRemaining}>
          {MobileDashboardService.getFormattedBalance(item.remaining)} left
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  budgetAddButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: premiumTheme.radius.pill,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 13,
    ...premiumTheme.shadow.soft,
  },
  budgetAddButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  budgetCategoryCircle: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: premiumTheme.radius.pill,
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  budgetCategoryGrid: {
    columnGap: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    rowGap: 14,
  },
  budgetCategoryHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  budgetCategoryItem: {
    alignItems: "center",
    gap: 5,
    width: "22%",
  },
  budgetCategoryLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "600",
    maxWidth: "100%",
  },
  budgetCategorySearch: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    maxWidth: 160,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  budgetCategorySearchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 0,
  },
  budgetCategoryTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  budgetEmptyButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: premiumTheme.radius.pill,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  budgetEmptyButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  budgetEmptyCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    ...premiumTheme.shadow.soft,
  },
  budgetEmptyIcon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 20,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  budgetEmptyText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 5,
    textAlign: "center",
  },
  budgetEmptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },
  budgetFormContent: {
    gap: 14,
    maxHeight: "100%",
    paddingBottom: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  budgetFormScroll: {
    flexGrow: 0,
  },
  budgetLimitCard: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  budgetLimitCurrency: {
    color: premiumTheme.colors.secondary,
    fontSize: 17,
    fontWeight: "700",
  },
  budgetLimitInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 26,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -0.6,
    minHeight: 38,
    paddingVertical: 0,
  },
  budgetLimitLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  budgetLimitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  budgetList: {
    gap: 10,
  },
  budgetListCount: {
    alignItems: "center",
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  budgetListHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetListSection: {
    gap: 10,
  },
  budgetListTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  budgetProgressAmount: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  budgetProgressCopy: {
    flex: 1,
    minWidth: 0,
  },
  budgetProgressFill: {
    borderRadius: 999,
    height: "100%",
  },
  budgetProgressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  budgetProgressIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  budgetPeriodButton: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
  },
  budgetPeriodButtonActive: {
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    ...premiumTheme.shadow.soft,
  },
  budgetPeriodRow: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
    padding: 4,
  },
  budgetPeriodText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  budgetPeriodTextActive: {
    color: premiumTheme.colors.ink,
  },
  budgetProgressMeta: {
    color: premiumTheme.colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  budgetProgressName: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  budgetProgressPercent: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  budgetProgressRemaining: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
  },
  budgetProgressRow: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    gap: 10,
    padding: 16,
  },
  budgetProgressTrack: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    height: 7,
    overflow: "hidden",
  },
  budgetQuickChip: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
  },
  budgetQuickChipText: {
    color: "#0f172a",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  budgetQuickRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 16,
  },
  budgetRenewCopy: {
    flex: 1,
    minWidth: 0,
  },
  budgetRenewKnob: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    height: 22,
    width: 22,
    ...premiumTheme.shadow.soft,
  },
  budgetRenewKnobOn: {
    alignSelf: "flex-end",
  },
  budgetRenewRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  budgetRenewText: {
    color: premiumTheme.colors.secondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  budgetRenewTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 13.5,
    fontWeight: "700",
  },
  budgetRenewTrack: {
    backgroundColor: "#d7dbe3",
    borderRadius: 999,
    height: 26,
    padding: 2,
    width: 44,
  },
  budgetRenewTrackOn: {
    backgroundColor: premiumTheme.colors.ink,
  },
  budgetRing: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  budgetRingLabel: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  budgetRingText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700",
  },
  budgetRingValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  budgetSaveSpacing: {
    marginTop: 16,
  },
  budgetStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  budgetStatusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  budgetSummaryCard: {
    backgroundColor: "#0f172a",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  budgetSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  budgetSummaryDate: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "800",
  },
  budgetSummaryFooter: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    borderTopWidth: premiumHairline,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  budgetSummaryLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  budgetSummaryMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    padding: 17,
  },
  budgetSummaryTotal: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 5,
  },
  budgetSummaryValue: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 5,
  },
  budgetsContainer: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  budgetsHero: {
    gap: 4,
  },
  budgetsSubtitle: {
    color: "#64748b",
    fontSize: 13,
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
  categoryPickerViewport: {
    maxHeight: 370,
  },
});
