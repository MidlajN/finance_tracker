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
import { premiumTheme } from "../theme/premiumTheme";
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

const pressedControl = "active:opacity-[0.62]";

// Custom dark-card shadow (not part of premiumTheme.shadow), so it stays a
// plain style object.
const summaryCardShadow = {
  shadowColor: "#111827",
  shadowOffset: {
    height: 10,
    width: 0,
  },
  shadowOpacity: 0.12,
  shadowRadius: 24,
} as const;

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
      contentContainerClassName="bg-canvas gap-4 p-5 pb-9"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-1">
        <Text className="text-[13px] text-secondary">
          Plan your spending and stay in control.
        </Text>
      </View>

      <View
        className="overflow-hidden rounded-[22px] bg-ink"
        style={summaryCardShadow}
      >
        <View className="flex-row items-center gap-3.5 p-[17px]">
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] font-bold text-[#cbd5e1]">
              Remaining this month
            </Text>
            <Text className="mt-[5px] text-[27px] font-black text-white">
              {MobileDashboardService.getFormattedBalance(overview.remaining)}
            </Text>
            <Text className="mt-[5px] text-[12px] text-[#cbd5e1]">
              of{" "}
              {MobileDashboardService.getFormattedBalance(
                overview.totalBudgeted
              )}
            </Text>
          </View>
          <BudgetSummaryRing percentage={remainingPercentage} />
        </View>
        <View className="min-h-11 flex-row items-center gap-2 border-t-hairline border-t-white/10 bg-white/[0.04] px-4">
          <CalendarDays color="#cbd5e1" size={17} strokeWidth={2.2} />
          <Text className="text-[12px] font-extrabold text-[#e2e8f0]">
            {formatMonthRange(monthDate)}
          </Text>
        </View>
      </View>

      <View className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text style={financeStyles.sectionTitle}>Your budgets</Text>
            {overview.budgets.length > 0 ? (
              <Text className="items-center overflow-hidden rounded-full bg-[#eef2f7] px-[9px] py-1 text-[12px] font-black text-[#475569]">
                {overview.budgets.length}
              </Text>
            ) : null}
          </View>
          <Pressable
            className={`min-h-9 flex-row items-center gap-[5px] rounded-full bg-ink px-[13px] ${pressedControl}`}
            onPress={() => setBudgetFormVisible(true)}
            style={premiumTheme.shadow.soft}
          >
            <Plus color="#ffffff" size={15} strokeWidth={2.7} />
            <Text className="text-[12px] font-bold text-white">Add</Text>
          </Pressable>
        </View>
        {overview.budgets.length === 0 ? (
          <View
            className="items-center rounded-section border border-border bg-white p-6"
            style={premiumTheme.shadow.soft}
          >
            <View className="h-[58px] w-[58px] items-center justify-center rounded-section bg-field">
              <PiggyBank
                color={premiumTheme.colors.ink}
                size={30}
                strokeWidth={2.2}
              />
            </View>
            <Text className="mt-3 text-[16px] font-black text-ink">
              No budgets yet
            </Text>
            <Text className="mt-[5px] text-center text-[13px] text-secondary">
              Add a category budget to track monthly spending.
            </Text>
            <Pressable
              className="mt-2.5 min-h-11 flex-row items-center justify-center gap-[7px] rounded-full bg-ink px-[18px]"
              onPress={() => setBudgetFormVisible(true)}
            >
              <Plus color="#ffffff" size={17} strokeWidth={2.7} />
              <Text className="text-[13px] font-bold text-white">
                Add your first budget
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2.5">
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
            <View className="max-h-full gap-3.5 px-5 pb-[26px] pt-5">
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
                className="grow-0"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="mb-2.5 gap-1 rounded-[16px] bg-field px-3.5 py-[11px]">
                  <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-secondary">
                    {BUDGET_PERIOD_LABELS[budgetPeriod]} limit
                  </Text>
                  <View className="flex-row items-center gap-[7px]">
                    <Text className="text-[17px] font-bold text-secondary">₹</Text>
                    <TextInput
                      className="min-h-[38px] flex-1 py-0 text-[26px] font-extrabold tracking-[-0.6px] text-ink tabular-nums"
                      keyboardType="decimal-pad"
                      onChangeText={(value) => {
                        setBudgetAmount(value);
                        setBudgetError(null);
                      }}
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                      value={budgetAmount}
                    />
                  </View>
                </View>

                <View className="mb-4 flex-row gap-[7px]">
                  {[500, 1000, 2000, 5000].map((value) => (
                    <Pressable
                      className={`min-h-8 flex-1 items-center justify-center rounded-full bg-field ${pressedControl}`}
                      key={value}
                      onPress={() => addQuickAmount(value)}
                    >
                      <Text className="text-[11px] font-bold text-ink tabular-nums">
                        +₹{value.toLocaleString("en-IN")}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View className="mb-3 flex-row gap-1 rounded-control bg-field p-1">
                  {BUDGET_PERIOD_OPTIONS.map((option) => (
                    <Pressable
                      className={`min-h-[34px] flex-1 items-center justify-center rounded-[10px] border ${
                        budgetPeriod === option.value
                          ? "border-border bg-white"
                          : "border-transparent"
                      }`}
                      key={option.value}
                      onPress={() => setBudgetPeriod(option.value)}
                      style={
                        budgetPeriod === option.value
                          ? premiumTheme.shadow.soft
                          : undefined
                      }
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          budgetPeriod === option.value
                            ? "text-ink"
                            : "text-secondary"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: budgetAutoRenew }}
                  className="mb-4 flex-row items-center gap-3 rounded-[16px] bg-field px-3.5 py-[11px]"
                  onPress={() => setBudgetAutoRenew(!budgetAutoRenew)}
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13.5px] font-bold text-ink">
                      Auto renew
                    </Text>
                    <Text className="mt-0.5 text-[11.5px] text-secondary">
                      {budgetAutoRenew
                        ? "Repeats automatically each period."
                        : "Runs for one period, then ends."}
                    </Text>
                  </View>
                  <View
                    className={`h-[26px] w-11 rounded-full p-0.5 ${
                      budgetAutoRenew ? "bg-ink" : "bg-[#d7dbe3]"
                    }`}
                  >
                    <View
                      className={`h-[22px] w-[22px] rounded-full bg-white ${
                        budgetAutoRenew ? "self-end" : ""
                      }`}
                      style={premiumTheme.shadow.soft}
                    />
                  </View>
                </Pressable>

                <View className="mb-3 flex-row items-center justify-between gap-3">
                  <Text className="text-[15px] font-bold text-ink">
                    Choose a category
                  </Text>
                  <View className="min-h-[34px] max-w-40 flex-1 flex-row items-center gap-[7px] rounded-full bg-field px-3">
                    <Search color="#7b818c" size={15} strokeWidth={2.3} />
                    <TextInput
                      className="flex-1 py-0 text-[12px] font-semibold text-ink"
                      onChangeText={setBudgetCategorySearch}
                      placeholder="Search"
                      placeholderTextColor="#8b929d"
                      value={budgetCategorySearch}
                    />
                  </View>
                </View>

                <View className="mb-1.5 flex-row flex-wrap gap-x-2.5 gap-y-3.5">
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
                      className="w-[22%] items-center gap-[5px]"
                      onPress={() => setBudgetCategoryPickerVisible(true)}
                    >
                      <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-transparent bg-field">
                        <Ellipsis
                          color={premiumTheme.colors.secondary}
                          size={18}
                          strokeWidth={2.4}
                        />
                      </View>
                      <Text className="max-w-full text-[10px] font-semibold text-secondary">
                        More
                      </Text>
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
                  className="mt-4"
                  disabled={isSavingBudget}
                  onPress={handleCreateBudget}
                  style={[
                    financeStyles.accountSaveButton,
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
            <View className="gap-3.5 p-[18px] pb-7">
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
                className="max-h-[370px]"
                contentContainerClassName="gap-[9px] pb-1"
                keyboardShouldPersistTaps="handled"
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
    <View
      className="relative items-center justify-center"
      style={{ height: size, width: size }}
    >
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
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-[18px] font-black text-white">
          {Math.round(progress)}%
        </Text>
        <Text className="text-[10px] font-bold text-[#cbd5e1]">left</Text>
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
      className="w-[22%] items-center gap-[5px]"
      onPress={onPress}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full border-2 border-transparent"
        style={[
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
        className="max-w-full text-[10px] font-semibold text-secondary"
        numberOfLines={1}
        style={
          selected
            ? {
                color: darkenColor(visual.color),
                fontWeight: "700",
              }
            : undefined
        }
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
    <View className="gap-2.5 rounded-[18px] bg-field p-4">
      <View className="flex-row items-center gap-[11px]">
        <View
          className="h-[42px] w-[42px] items-center justify-center rounded-control"
          style={{ backgroundColor: visual.color + "14" }}
        >
          <Icon color={visual.color} size={20} strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[14px] font-black text-ink">
            {category?.name ?? item.budget.category?.name ?? "Uncategorized"}
          </Text>
          <Text className="mt-[3px] text-[12px] text-secondary">
            {MobileDashboardService.getFormattedBalance(item.spent)} of{" "}
            {MobileDashboardService.getFormattedBalance(item.budget.amount)}
          </Text>
          <Text className="mt-0.5 text-[11px] font-semibold text-muted">
            {BUDGET_PERIOD_LABELS[item.budget.period ?? "monthly"]}
            {(item.budget.auto_renew ?? true) ? " · Auto renew ✓" : " · One period"}
          </Text>
        </View>
        <View
          className="rounded-full px-2 py-[5px]"
          style={{ backgroundColor: statusColor + "12" }}
        >
          <Text className="text-[10px] font-black" style={{ color: statusColor }}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <View className="h-[7px] overflow-hidden rounded-full bg-white">
        <View
          className="h-full rounded-full"
          style={{ backgroundColor: statusColor, width: progressWidth }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[11px] font-bold text-secondary">
          {Math.round(item.percentage)}% used
        </Text>
        <Text className="text-[11px] font-extrabold text-[#334155]">
          {MobileDashboardService.getFormattedBalance(item.remaining)} left
        </Text>
      </View>
    </View>
  );
}
