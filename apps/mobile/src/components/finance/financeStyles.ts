import { StyleSheet } from "react-native";

import { premiumTheme } from "../../theme/premiumTheme";

/**
 * Styles shared across finance screens: bottom-sheet modal chrome and a
 * handful of generic pieces (errors, section titles, the ink save button).
 * Screen-specific styles live with their screens.
 */
export const financeStyles = StyleSheet.create({
  accountSaveButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  accountSaveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "700",
  },
  merchantEmptyState: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    padding: 18,
  },
  merchantEmptyText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  merchantEmptyTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  merchantPickerSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  merchantPickerTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
  },
  merchantPickerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  merchantSearchBar: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  merchantSearchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 48,
    paddingVertical: 0,
  },
  modalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  modalDismissLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  modalPanel: {
    backgroundColor: premiumTheme.colors.canvas,
    borderTopLeftRadius: premiumTheme.radius.modal,
    borderTopRightRadius: premiumTheme.radius.modal,
    maxHeight: "86%",
    overflow: "hidden",
  },
  muted: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.62,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "900",
  },
});
