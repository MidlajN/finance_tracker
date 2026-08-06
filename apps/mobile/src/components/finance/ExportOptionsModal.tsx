import { useMemo, useState } from "react";
import { MotiView } from "moti";
import { CalendarDays, Download, FileSpreadsheet } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CachedAccount } from "@finance/shared-types";

import { premiumTheme } from "../../theme/premiumTheme";
import { financeStyles } from "./financeStyles";

export interface ExportOptions {
  accountId: string | null;
  from: Date | null;
  to: Date | null;
}

type PeriodKey =
  | "all"
  | "custom"
  | "last_month"
  | "last_3_months"
  | "this_month"
  | "this_year";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_3_months", label: "Last 3 months" },
  { key: "this_year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateInput(value: string) {
  if (!DATE_INPUT_PATTERN.test(value.trim())) {
    return null;
  }

  const date = new Date(value.trim() + "T00:00:00");

  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return end;
}

function resolvePeriod(
  period: PeriodKey,
  customFrom: string,
  customTo: string
): { from: Date | null; to: Date | null } | null {
  const now = new Date();

  if (period === "all") {
    return { from: null, to: null };
  }

  if (period === "this_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: null,
    };
  }

  if (period === "last_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  if (period === "last_3_months") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      to: null,
    };
  }

  if (period === "this_year") {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: null,
    };
  }

  const from = parseDateInput(customFrom);
  const to = parseDateInput(customTo);

  if (!from || !to || from.getTime() > to.getTime()) {
    return null;
  }

  return { from, to: endOfDay(to) };
}

// MotiView is not NativeWind-interop'd, so the popup card keeps a plain
// style object.
const exportCardStyle = {
  alignSelf: "stretch" as const,
  backgroundColor: "#ffffff",
  borderRadius: premiumTheme.radius.surface,
  padding: 22,
  ...premiumTheme.shadow.raised,
};

export function ExportOptionsModal({
  accounts,
  exporting,
  onClose,
  onExport,
  visible,
}: {
  accounts: CachedAccount[];
  exporting: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  visible: boolean;
}) {
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const range = useMemo(
    () => resolvePeriod(period, customFrom, customTo),
    [customFrom, customTo, period]
  );
  const canExport = range !== null && !exporting;

  function requestClose() {
    if (!exporting) {
      onClose();
    }
  }

  function handleExport() {
    if (!range) {
      return;
    }

    onExport({
      accountId,
      from: range.from,
      to: range.to,
    });
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={requestClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center bg-ink/40 p-7"
      >
        <Pressable
          onPress={requestClose}
          style={financeStyles.modalDismissLayer}
        />
        <MotiView
          animate={{ opacity: 1, scale: 1 }}
          from={{ opacity: 0, scale: 0.94 }}
          style={exportCardStyle}
          transition={{
            damping: 17,
            mass: 0.7,
            stiffness: 240,
            type: "spring",
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-control bg-field">
              <FileSpreadsheet
                color={premiumTheme.colors.ink}
                size={19}
                strokeWidth={2.3}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] font-extrabold tracking-[-0.3px] text-ink">
                Export data
              </Text>
              <Text className="mt-0.5 text-[12.5px] leading-[17px] text-secondary">
                Choose what the report covers.
              </Text>
            </View>
          </View>

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[1px] text-secondary">
            Period
          </Text>
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const selected = period === option.key;

              return (
                <Pressable
                  className={`min-h-9 flex-row items-center rounded-xl border-[1.2px] px-2.5 ${
                    selected
                      ? "border-transparent bg-ink"
                      : "border-transparent bg-field"
                  }`}
                  hitSlop={4}
                  key={option.key}
                  onPress={() => setPeriod(option.key)}
                >
                  <Text
                    className={`text-[12px] ${
                      selected
                        ? "font-bold text-white"
                        : "font-semibold text-secondary"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {period === "custom" ? (
            <View className="mt-3 flex-row gap-2.5">
              {(
                [
                  ["From", customFrom, setCustomFrom],
                  ["To", customTo, setCustomTo],
                ] as const
              ).map(([label, value, setValue]) => (
                <View
                  className="min-h-[46px] flex-1 flex-row items-center gap-2 rounded-control bg-field px-3"
                  key={label}
                >
                  <CalendarDays
                    color={premiumTheme.colors.secondary}
                    size={15}
                    strokeWidth={2.3}
                  />
                  <TextInput
                    autoCapitalize="none"
                    className="min-w-0 flex-1 text-[13px] font-semibold text-ink"
                    keyboardType="numbers-and-punctuation"
                    onChangeText={setValue}
                    placeholder={label + " YYYY-MM-DD"}
                    placeholderTextColor={premiumTheme.colors.muted}
                    value={value}
                  />
                </View>
              ))}
            </View>
          ) : null}
          {period === "custom" && range === null ? (
            <Text className="mt-2 text-[11.5px] font-semibold text-danger">
              Enter both dates as YYYY-MM-DD with From before To.
            </Text>
          ) : null}

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[1px] text-secondary">
            Account
          </Text>
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            <Pressable
              className={`min-h-9 flex-row items-center rounded-xl border-[1.2px] border-transparent px-2.5 ${
                accountId === null ? "bg-ink" : "bg-field"
              }`}
              hitSlop={4}
              onPress={() => setAccountId(null)}
            >
              <Text
                className={`text-[12px] ${
                  accountId === null
                    ? "font-bold text-white"
                    : "font-semibold text-secondary"
                }`}
              >
                All accounts
              </Text>
            </Pressable>
            {accounts.map((account) => {
              const selected = accountId === account.id;

              return (
                <Pressable
                  className={`min-h-9 flex-row items-center rounded-xl border-[1.2px] border-transparent px-2.5 ${
                    selected ? "bg-ink" : "bg-field"
                  }`}
                  hitSlop={4}
                  key={account.id}
                  onPress={() =>
                    setAccountId(selected ? null : account.id)
                  }
                >
                  <Text
                    className={`max-w-[120px] text-[12px] ${
                      selected
                        ? "font-bold text-white"
                        : "font-semibold text-secondary"
                    }`}
                    numberOfLines={1}
                  >
                    {account.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-6 flex-row gap-2.5">
            <Pressable
              className="min-h-12 flex-1 items-center justify-center rounded-control bg-field active:opacity-[0.82]"
              disabled={exporting}
              onPress={requestClose}
            >
              <Text className="text-[14px] font-bold text-ink">Cancel</Text>
            </Pressable>
            <Pressable
              className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-control bg-ink ${
                canExport ? "active:opacity-[0.82]" : "opacity-[0.55]"
              }`}
              disabled={!canExport}
              onPress={handleExport}
            >
              <Download color="#ffffff" size={16} strokeWidth={2.5} />
              <Text className="text-[14px] font-extrabold text-white">
                {exporting ? "Exporting..." : "Export"}
              </Text>
            </Pressable>
          </View>
        </MotiView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
