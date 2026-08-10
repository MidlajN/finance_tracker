import { useState } from "react";
import { MotiView } from "moti";
import {
  ArrowLeftRight,
  Check,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { CachedAccount } from "@finance/shared-types";

import { premiumTheme } from "../../theme/premiumTheme";
import { titleCase } from "../../utils/financeFormat";
import { darkenColor, getAccountTypeVisual } from "../../utils/financeVisuals";
import { financeStyles } from "./financeStyles";

export function AccountPickerField({
  accounts,
  onAddAccount,
  onSelect,
  selectedAccountId,
  showHeader = true,
}: {
  accounts: CachedAccount[];
  onAddAccount: () => void;
  onSelect: (accountId: string | null) => void;
  selectedAccountId: string | null;
  showHeader?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );
  const availableAccounts = accounts
    .filter(
      (account) => !account.archived || account.id === selectedAccountId
    )
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name));
  const quickAccounts = availableAccounts.slice(0, 3);

  // Keep a selection made from the full picker visible in the quick row.
  if (
    selectedAccount &&
    !quickAccounts.some((account) => account.id === selectedAccount.id)
  ) {
    if (quickAccounts.length === 0) {
      quickAccounts.push(selectedAccount);
    } else {
      quickAccounts[quickAccounts.length - 1] = selectedAccount;
    }
  }

  function select(accountId: string | null) {
    setVisible(false);
    onSelect(accountId);
  }

  return (
    <>
      <View style={styles.quickAccountSection}>
        {showHeader ? (
          <View style={styles.transactionSectionHeader}>
            <Text style={styles.transactionSectionTitle}>Account</Text>
            <Text
              numberOfLines={1}
              style={styles.transactionSectionSelection}
            >
              {selectedAccount?.name ?? "Unassigned"}
            </Text>
          </View>
        ) : null}

        <View style={styles.quickAccountList}>
          {quickAccounts.map((account) => {
            const accountVisual = getAccountTypeVisual(account.account_type);
            const AccountIcon = accountVisual.Icon;
            const selected = selectedAccountId === account.id;

            return (
              <Pressable
                accessibilityHint={
                  selected ? "Clears the account selection" : undefined
                }
                accessibilityRole="button"
                hitSlop={3}
                key={account.id}
                onPress={() => onSelect(selected ? null : account.id)}
                style={[
                  styles.quickAccountPill,
                  selected && {
                    backgroundColor: `${accountVisual.color}14`,
                    borderColor: `${accountVisual.color}59`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.quickAccountIcon,
                    {
                      backgroundColor: accountVisual.background,
                    },
                  ]}
                >
                  <AccountIcon
                    color={accountVisual.color}
                    size={13}
                    strokeWidth={2.5}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.quickAccountName,
                    selected && {
                      color: darkenColor(accountVisual.color),
                      fontWeight: "700",
                    },
                  ]}
                >
                  {account.name}
                </Text>
                {selected ? (
                  <View
                    style={[
                      styles.quickAccountCheck,
                      {
                        backgroundColor: `${accountVisual.color}99`,
                      },
                    ]}
                  >
                    <Check color="#ffffff" size={10} strokeWidth={3.2} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          {availableAccounts.length === 0 ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={3}
              onPress={onAddAccount}
              style={styles.quickAccountMorePill}
            >
              <Plus
                color={premiumTheme.colors.ink}
                size={14}
                strokeWidth={2.7}
              />
              <Text style={styles.quickAccountMoreText}>Add account</Text>
            </Pressable>
          ) : availableAccounts.length > quickAccounts.length ? (
            <Pressable
              accessibilityHint="Opens all accounts"
              accessibilityRole="button"
              hitSlop={3}
              onPress={() => setVisible(true)}
              style={styles.quickAccountMorePill}
            >
              <SlidersHorizontal color="#64748b" size={14} strokeWidth={2.4} />
              <Text style={styles.quickAccountMoreText}>All</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityHint="Adds a new account"
              accessibilityRole="button"
              hitSlop={3}
              onPress={onAddAccount}
              style={styles.quickAccountMorePill}
            >
              <Plus
                color={premiumTheme.colors.ink}
                size={14}
                strokeWidth={2.7}
              />
            </Pressable>
          )}
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
            animate={{
              opacity: 1,
              translateY: 0,
            }}
            from={{
              opacity: 0,
              translateY: 24,
            }}
            style={financeStyles.modalPanel}
            transition={{
              damping: 18,
              mass: 0.8,
              stiffness: 180,
              type: "spring",
            }}
          >
            <View style={styles.accountPickerContent}>
              <View style={financeStyles.modalHeader}>
                <View style={styles.accountPickerTitleBlock}>
                  <Text style={styles.accountPickerTitle}>Choose account</Text>
                  <Text style={styles.accountPickerSubtitle}>
                    Select the account whose balance should include this
                    transaction.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setVisible(false)}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.accountPickerList}
                keyboardShouldPersistTaps="handled"
                style={styles.accountPickerListViewport}
              >
                <AccountOptionRow
                  account={null}
                  onPress={() => select(null)}
                  selected={!selectedAccountId}
                />
                {availableAccounts.map((account) => (
                  <AccountOptionRow
                    account={account}
                    key={account.id}
                    onPress={() => select(account.id)}
                    selected={selectedAccountId === account.id}
                  />
                ))}
              </ScrollView>

              <Pressable
                onPress={() => {
                  setVisible(false);
                  onAddAccount();
                }}
                style={styles.accountPickerAddButton}
              >
                <Plus color="#ffffff" size={18} strokeWidth={2.7} />
                <Text style={styles.accountPickerAddButtonText}>
                  Add new account
                </Text>
              </Pressable>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function AccountOptionRow({
  account,
  onPress,
  selected,
}: {
  account: CachedAccount | null;
  onPress: () => void;
  selected: boolean;
}) {
  const visual = account
    ? getAccountTypeVisual(account.account_type)
    : {
        background: "#f1f5f9",
        color: "#64748b",
        Icon: ArrowLeftRight,
      };
  const Icon = visual.Icon;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.accountOptionRow,
        selected && styles.accountOptionRowSelected,
      ]}
    >
      <View
        style={[
          styles.accountOptionIcon,
          {
            backgroundColor: visual.background,
          },
        ]}
      >
        <Icon color={visual.color} size={18} strokeWidth={2.5} />
      </View>
      <View style={styles.accountOptionCopy}>
        <Text numberOfLines={1} style={styles.accountOptionTitle}>
          {account?.name ?? "Unassigned"}
        </Text>
        <Text numberOfLines={1} style={styles.accountOptionMeta}>
          {account
            ? formatAccountDescription(account)
            : "Do not update an account balance"}
        </Text>
      </View>
      {selected ? (
        <View style={styles.accountOptionCheck}>
          <Check color="#ffffff" size={14} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

function formatAccountDescription(account: CachedAccount) {
  return [
    titleCase(account.account_type),
    account.institution,
    account.currency,
  ]
    .filter(Boolean)
    .join(" · ");
}

const styles = StyleSheet.create({
  accountOptionCheck: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  accountOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountOptionIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  accountOptionMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  accountOptionRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountOptionRowSelected: {
    backgroundColor: premiumTheme.colors.accentSoft,
  },
  accountOptionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  accountPickerAddButton: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  accountPickerAddButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  accountPickerContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 28,
  },
  accountPickerList: {
    gap: 9,
    paddingBottom: 4,
  },
  accountPickerListViewport: {
    maxHeight: 360,
  },
  accountPickerSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  accountPickerTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
  },
  accountPickerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  quickAccountCheck: {
    alignItems: "center",
    borderRadius: premiumTheme.radius.pill,
    height: 16,
    justifyContent: "center",
    marginLeft: 2,
    width: 16,
  },
  quickAccountIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 23,
    justifyContent: "center",
    width: 23,
  },
  quickAccountList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 1,
    paddingVertical: 2,
  },
  quickAccountMorePill: {
    alignItems: "center",
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 11,
  },
  quickAccountMoreText: {
    color: "#64748b",
    fontSize: 11.5,
    fontWeight: "800",
  },
  quickAccountName: {
    color: premiumTheme.colors.secondary,
    fontSize: 11.5,
    fontWeight: "600",
    maxWidth: 100,
  },
  quickAccountPill: {
    alignItems: "center",
    backgroundColor: "#f5f5f7",
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 1.2,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 7,
    paddingRight: 11,
  },
  quickAccountSection: {
    gap: 11,
  },
  transactionSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionSectionSelection: {
    color: premiumTheme.colors.secondary,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 16,
  },
  transactionSectionTitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
