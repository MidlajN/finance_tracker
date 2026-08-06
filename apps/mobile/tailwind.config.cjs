const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.ts", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Mirrors premiumTheme so StyleSheet code can migrate class-by-class.
      colors: {
        accent: {
          DEFAULT: "#6d4aff",
          muted: "#c9c0f4",
          soft: "#eeeaff",
        },
        border: "#e9ebf1",
        canvas: "#ffffff",
        danger: {
          DEFAULT: "#dc2626",
          soft: "#fff1f2",
        },
        divider: "#eceef2",
        elevated: "#fbfbfc",
        expense: {
          DEFAULT: "#c2402f",
          muted: "#eeb4aa",
          soft: "#fdeeec",
        },
        field: "#f5f5f7",
        income: {
          DEFAULT: "#1b7f4d",
          muted: "#a3d4ba",
          soft: "#e8f5ee",
        },
        ink: "#0f172a",
        muted: "#94a3b8",
        savings: {
          DEFAULT: "#6d4aff",
          soft: "#efecfe",
        },
        secondary: "#64748b",
        success: {
          DEFAULT: "#16a34a",
          soft: "#ecfdf5",
        },
        transfer: {
          DEFAULT: "#2f6bde",
          soft: "#eaf1fd",
        },
      },
      borderRadius: {
        control: "14px",
        modal: "28px",
        section: "20px",
        surface: "24px",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  plugins: [],
};
