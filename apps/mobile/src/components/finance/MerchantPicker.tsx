import { useMemo, useRef, useState } from "react";
import { MotiView } from "moti";
import { Check, ChevronRight, Plus, Search, Store, X } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CachedMerchant } from "@finance/shared-types";

import { premiumTheme } from "../../theme/premiumTheme";
import { financeStyles } from "./financeStyles";

export function MerchantPickerField({
  merchants,
  onCreateMerchant,
  onSelect,
  selectedMerchantId,
  showHeader = true,
}: {
  merchants: CachedMerchant[];
  onCreateMerchant?: (name: string) => Promise<CachedMerchant>;
  onSelect: (merchantId: string | null) => void;
  selectedMerchantId: string | null;
  showHeader?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const selectedMerchant = merchants.find(
    (merchant) => merchant.id === selectedMerchantId
  );
  const sortedMerchants = useMemo(
    () =>
      merchants
        .slice()
        .sort(
          (first, second) =>
            (second.usage_count ?? 0) - (first.usage_count ?? 0) ||
            first.name.localeCompare(second.name)
        ),
    [merchants]
  );
  const query = search.trim().toLowerCase();
  const filteredMerchants = query
    ? sortedMerchants
        .filter((item) => item.name.toLowerCase().includes(query))
        .slice(0, 8)
    : sortedMerchants.slice(0, 8);
  const canCreate =
    Boolean(onCreateMerchant) &&
    search.trim().length > 0 &&
    !sortedMerchants.some(
      (item) => item.name.toLowerCase() === search.trim().toLowerCase()
    );

  function close() {
    setVisible(false);
    setSearch("");
  }

  function select(merchantId: string | null) {
    close();
    onSelect(merchantId);
  }

  async function createAndSelect() {
    const name = search.trim();

    if (!onCreateMerchant || !name || busy) {
      return;
    }

    setBusy(true);

    try {
      const merchant = await onCreateMerchant(name);

      select(merchant.id);
    } catch {
      // The store surfaces the error banner; keep the picker open so the
      // user can retry or pick an existing merchant.
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.section}>
        {showHeader ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Merchant</Text>
            <Text numberOfLines={1} style={styles.sectionSelection}>
              {selectedMerchant?.name ?? "None"}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityHint="Opens merchant suggestions and search"
          accessibilityRole="button"
          onPress={() => setVisible(true)}
          style={styles.fieldRow}
        >
          <View style={styles.fieldIcon}>
            <Store
              color={premiumTheme.colors.secondary}
              size={15}
              strokeWidth={2.4}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.fieldValue,
              !selectedMerchant && styles.fieldPlaceholder,
            ]}
          >
            {selectedMerchant?.name ?? "Link a merchant"}
          </Text>
          <ChevronRight
            color={premiumTheme.colors.muted}
            size={16}
            strokeWidth={2.4}
          />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={close}
        // autoFocus races the modal window on Android (keyboard opens,
        // then snaps shut when the window attaches); focus after onShow.
        onShow={() => searchInputRef.current?.focus()}
        transparent
        visible={visible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={financeStyles.modalBackdrop}
        >
          <Pressable onPress={close} style={financeStyles.modalDismissLayer} />
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
            <View style={styles.pickerContent}>
              <View style={financeStyles.modalHeader}>
                <View style={financeStyles.merchantPickerTitleBlock}>
                  <Text style={financeStyles.merchantPickerTitle}>
                    Choose merchant
                  </Text>
                  <Text style={financeStyles.merchantPickerSubtitle}>
                    Select a saved merchant or enter a new one.
                  </Text>
                </View>
                <Pressable
                  onPress={close}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={financeStyles.merchantSearchBar}>
                <Search color="#7b818c" size={18} strokeWidth={2.3} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Search or type new merchant"
                  placeholderTextColor="#8b929d"
                  ref={searchInputRef}
                  style={financeStyles.merchantSearchInput}
                  value={search}
                />
              </View>

              <ScrollView
                contentContainerStyle={styles.pickerList}
                keyboardShouldPersistTaps="handled"
                style={styles.pickerListViewport}
              >
                <MerchantOptionRow
                  merchant={null}
                  onPress={() => select(null)}
                  selected={!selectedMerchantId}
                />
                {filteredMerchants.map((item) => (
                  <MerchantOptionRow
                    key={item.id}
                    merchant={item}
                    onPress={() => select(item.id)}
                    selected={selectedMerchantId === item.id}
                  />
                ))}

                {canCreate ? (
                  <Pressable
                    disabled={busy}
                    onPress={() => void createAndSelect()}
                    style={[styles.createRow, busy && styles.createRowBusy]}
                  >
                    <View style={styles.createIcon}>
                      <Plus color="#0f172a" size={18} strokeWidth={2.8} />
                    </View>
                    <View style={styles.optionCopy}>
                      <Text numberOfLines={1} style={styles.optionTitle}>
                        Add "{search.trim()}"
                      </Text>
                      <Text numberOfLines={1} style={styles.optionMeta}>
                        {busy ? "Creating..." : "Create as a new merchant"}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function MerchantOptionRow({
  merchant,
  onPress,
  selected,
}: {
  merchant: CachedMerchant | null;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.optionRow, selected && styles.optionRowSelected]}
    >
      <View style={styles.optionIcon}>
        <Store color="#64748b" size={17} strokeWidth={2.4} />
      </View>
      <View style={styles.optionCopy}>
        <Text numberOfLines={1} style={styles.optionTitle}>
          {merchant?.name ?? "No merchant"}
        </Text>
        <Text numberOfLines={1} style={styles.optionMeta}>
          {merchant
            ? merchant.category?.name ?? "No default category"
            : "Keep this transaction unlinked"}
        </Text>
      </View>
      {selected ? (
        <View style={styles.optionCheck}>
          <Check color="#ffffff" size={14} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  createIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  createRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.accentSoft,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createRowBusy: {
    opacity: 0.55,
  },
  fieldIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    height: 29,
    justifyContent: "center",
    width: 29,
  },
  fieldPlaceholder: {
    color: premiumTheme.colors.muted,
    fontWeight: "600",
  },
  fieldRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  fieldValue: {
    color: premiumTheme.colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  optionCheck: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  optionMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  optionRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: premiumTheme.colors.accentSoft,
  },
  optionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  pickerContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 28,
  },
  pickerList: {
    gap: 9,
    paddingBottom: 4,
  },
  pickerListViewport: {
    maxHeight: 360,
  },
  section: {
    gap: 11,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionSelection: {
    color: premiumTheme.colors.secondary,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 16,
  },
  sectionTitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
