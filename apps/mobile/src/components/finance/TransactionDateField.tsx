import { useMemo, useState } from "react";
import { MotiView } from "moti";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { premiumTheme } from "../../theme/premiumTheme";
import {
  formatTransactionDate,
  getCalendarDays,
  isCurrentMonth,
  isFutureLocalDay,
  isSameLocalDay,
} from "../../utils/financeFormat";
import { financeStyles } from "./financeStyles";

export function TransactionDateField({
  grouped = false,
  onSelect,
  value,
}: {
  grouped?: boolean;
  onSelect: (date: Date) => void;
  value: Date;
}) {
  const [visible, setVisible] = useState(false);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1)
  );
  const calendarDays = useMemo(
    () => getCalendarDays(monthCursor),
    [monthCursor]
  );

  function selectDate(date: Date) {
    const nextDate = new Date(date);
    nextDate.setHours(
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      0
    );
    onSelect(nextDate);
    setVisible(false);
  }

  return (
    <>
      <Pressable
        accessibilityHint="Opens the transaction date picker"
        accessibilityRole="button"
        onPress={() => {
          setMonthCursor(new Date(value.getFullYear(), value.getMonth(), 1));
          setVisible(true);
        }}
        style={[
          styles.transactionSelect,
          grouped && styles.transactionGroupedRowLast,
        ]}
      >
        <View
          style={[
            styles.transactionSelectIcon,
            { backgroundColor: "#eef2ff" },
          ]}
        >
          <CalendarDays color="#4f46e5" size={17} strokeWidth={2.5} />
        </View>
        <View style={styles.transactionSelectCopy}>
          <Text
            style={[
              styles.transactionSelectLabel,
              grouped && styles.transactionSelectLabelGrouped,
            ]}
          >
            {grouped ? "Date" : "Transaction date"}
          </Text>
          <Text
            style={[
              styles.transactionSelectValue,
              grouped && styles.transactionSelectValueGrouped,
            ]}
          >
            {formatTransactionDate(value)}
          </Text>
        </View>
        <ChevronRight color="#94a3b8" size={18} strokeWidth={2.4} />
      </Pressable>

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
            style={styles.datePickerPanel}
            transition={{
              damping: 18,
              mass: 0.8,
              stiffness: 180,
              type: "spring",
            }}
          >
            <View style={styles.datePickerHeader}>
              <View>
                <Text style={financeStyles.merchantPickerTitle}>Transaction date</Text>
                <Text style={financeStyles.merchantPickerSubtitle}>
                  Choose when this transaction occurred.
                </Text>
              </View>
              <Pressable
                onPress={() => setVisible(false)}
                style={financeStyles.modalCloseButton}
              >
                <X color="#0f172a" size={20} strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={styles.datePickerMonthRow}>
              <Pressable
                onPress={() =>
                  setMonthCursor(
                    new Date(
                      monthCursor.getFullYear(),
                      monthCursor.getMonth() - 1,
                      1
                    )
                  )
                }
                style={styles.datePickerNavButton}
              >
                <ChevronLeft color="#0f172a" size={19} strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.datePickerMonth}>
                {monthCursor.toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                disabled={isCurrentMonth(monthCursor)}
                onPress={() =>
                  setMonthCursor(
                    new Date(
                      monthCursor.getFullYear(),
                      monthCursor.getMonth() + 1,
                      1
                    )
                  )
                }
                style={[
                  styles.datePickerNavButton,
                  isCurrentMonth(monthCursor) &&
                    styles.datePickerNavButtonDisabled,
                ]}
              >
                <ChevronRight color="#0f172a" size={19} strokeWidth={2.5} />
              </Pressable>
            </View>

            <View style={styles.datePickerGrid}>
              {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                <Text
                  key={`${label}-${index}`}
                  style={styles.datePickerWeekday}
                >
                  {label}
                </Text>
              ))}
              {calendarDays.map((date, index) => {
                const selected = date ? isSameLocalDay(date, value) : false;
                const future = date ? isFutureLocalDay(date) : false;

                return (
                  <View key={date?.toISOString() ?? `blank-${index}`} style={styles.datePickerCell}>
                    {date ? (
                      <Pressable
                        disabled={future}
                        onPress={() => selectDate(date)}
                        style={[
                          styles.datePickerDay,
                          selected && styles.datePickerDaySelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.datePickerDayText,
                            future && styles.datePickerDayTextDisabled,
                            selected && styles.datePickerDayTextSelected,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={() => selectDate(new Date())}
              style={styles.datePickerTodayButton}
            >
              <Text style={styles.datePickerTodayButtonText}>Select today</Text>
            </Pressable>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  datePickerCell: {
    alignItems: "center",
    flexBasis: "14.285%",
    height: 42,
    justifyContent: "center",
  },
  datePickerDay: {
    alignItems: "center",
    borderRadius: 16,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  datePickerDaySelected: {
    backgroundColor: "#0f172a",
  },
  datePickerDayText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  datePickerDayTextDisabled: {
    color: "#cbd5e1",
  },
  datePickerDayTextSelected: {
    color: "#ffffff",
  },
  datePickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  datePickerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  datePickerMonth: {
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  datePickerMonthRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  datePickerNavButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  datePickerNavButtonDisabled: {
    opacity: 0.35,
  },
  datePickerPanel: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 18,
    padding: 18,
    paddingBottom: 30,
  },
  datePickerTodayButton: {
    alignItems: "center",
    backgroundColor: "#eef2ff",
    borderRadius: 15,
    justifyContent: "center",
    minHeight: 48,
  },
  datePickerTodayButtonText: {
    color: "#4338ca",
    fontSize: 14,
    fontWeight: "900",
  },
  datePickerWeekday: {
    color: "#94a3b8",
    flexBasis: "14.285%",
    fontSize: 11,
    fontWeight: "900",
    paddingVertical: 7,
    textAlign: "center",
  },
  transactionGroupedRowLast: {
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    minHeight: 56,
    paddingHorizontal: 0,
  },
  transactionSelect: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flexDirection: "row",
    gap: 11,
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  transactionSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  transactionSelectIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  transactionSelectLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
  },
  transactionSelectLabelGrouped: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  transactionSelectValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  transactionSelectValueGrouped: {
    fontWeight: "700",
    marginTop: 3,
  },
});
