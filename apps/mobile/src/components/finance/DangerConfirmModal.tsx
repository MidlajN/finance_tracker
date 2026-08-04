import { MotiView } from "moti";
import { Trash2 } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { premiumTheme } from "../../theme/premiumTheme";
import { financeStyles } from "./financeStyles";

// Shared confirmation dialog for destructive actions. Dismissal is blocked
// while `busy` so the modal can't be closed mid-operation.
export function DangerConfirmModal({
  busy = false,
  busyLabel = "Deleting...",
  confirmLabel = "Delete",
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: {
  busy?: boolean;
  busyLabel?: string;
  confirmLabel?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
}) {
  function requestClose() {
    if (!busy) {
      onCancel();
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={requestClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          onPress={requestClose}
          style={financeStyles.modalDismissLayer}
        />
        <MotiView
          animate={{ opacity: 1, scale: 1 }}
          from={{ opacity: 0, scale: 0.94 }}
          style={styles.card}
          transition={{
            damping: 17,
            mass: 0.7,
            stiffness: 240,
            type: "spring",
          }}
        >
          <View style={styles.icon}>
            <Trash2
              color={premiumTheme.colors.danger}
              size={24}
              strokeWidth={2.3}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={onConfirm}
              style={[
                styles.confirmButton,
                busy && financeStyles.saveButtonDisabled,
              ]}
            >
              <Text style={styles.confirmButtonText}>
                {busy ? busyLabel : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 11,
    marginTop: 20,
  },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButtonText: {
    color: premiumTheme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.surface,
    padding: 22,
    ...premiumTheme.shadow.raised,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.danger,
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  icon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.dangerSoft,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  text: {
    color: premiumTheme.colors.secondary,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  title: {
    color: premiumTheme.colors.ink,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 14,
  },
});
