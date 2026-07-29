import { Platform, StyleSheet } from "react-native";

export const premiumTheme = {
  colors: {
    accent: "#6d4aff",
    accentMuted: "#c9c0f4",
    accentSoft: "#eeeaff",
    border: "#e9ebf1",
    canvas: "#ffffff",
    danger: "#dc2626",
    dangerSoft: "#fff1f2",
    divider: "#eceef2",
    elevated: "#fbfbfc",
    expense: "#c2402f",
    expenseMuted: "#eeb4aa",
    expenseSoft: "#fdeeec",
    field: "#f5f5f7",
    income: "#1b7f4d",
    incomeMuted: "#a3d4ba",
    incomeSoft: "#e8f5ee",
    ink: "#0f172a",
    muted: "#94a3b8",
    savings: "#6d4aff",
    savingsSoft: "#efecfe",
    secondary: "#64748b",
    success: "#16a34a",
    successSoft: "#ecfdf5",
    transfer: "#2f6bde",
    transferSoft: "#eaf1fd",
  },
  radius: {
    control: 14,
    modal: 28,
    pill: 999,
    section: 20,
    surface: 24,
  },
  shadow: {
    floating: {
      shadowColor: "#0f172a",
      shadowOffset: {
        height: 8,
        width: 0,
      },
      shadowOpacity: 0.045,
      shadowRadius: 20,
    },
    raised: {
      shadowColor: "#0f172a",
      shadowOffset: {
        height: 12,
        width: 0,
      },
      shadowOpacity: 0.06,
      shadowRadius: 28,
    },
    // Single extremely soft shadow for floating surfaces. iOS only by design;
    // Android surfaces rely on the hairline border for separation.
    soft: {
      shadowColor: "#101828",
      shadowOffset: {
        height: 6,
        width: 0,
      },
      shadowOpacity: 0.05,
      shadowRadius: 16,
    },
  },
} as const;

export const premiumHairline = StyleSheet.hairlineWidth;

// Hairline stroke shared by floating surfaces. Pair with shadow.soft.
export const premiumSurface = {
  borderColor: premiumTheme.colors.border,
  borderWidth: 1,
} as const;

// Editorial voice. Serif carries titles, labels, and the wordmark while
// numerals stay sans with tabular figures — the app's typographic signature.
export const premiumSerif = Platform.select({
  ios: "Georgia",
  default: "serif",
});
