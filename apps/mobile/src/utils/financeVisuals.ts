import type { ComponentType } from "react";
import {
  ArrowLeftRight,
  Car,
  CreditCard,
  Film,
  Fuel,
  HeartPulse,
  Landmark,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Utensils,
  Wallet,
} from "lucide-react-native";

import type {
  AccountType,
  CachedCategory,
  TransactionType,
} from "@finance/shared-types";

export type FinanceScreenIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

export const categoryIconOptions = [
  { Icon: Store, key: "store" },
  { Icon: Utensils, key: "utensils" },
  { Icon: ShoppingCart, key: "shopping-cart" },
  { Icon: ShoppingBag, key: "shopping-bag" },
  { Icon: Fuel, key: "fuel" },
  { Icon: Car, key: "car" },
  { Icon: ReceiptText, key: "receipt" },
  { Icon: Film, key: "film" },
  { Icon: HeartPulse, key: "heart-pulse" },
  { Icon: Wallet, key: "wallet" },
  { Icon: Landmark, key: "landmark" },
  { Icon: Smartphone, key: "smartphone" },
  { Icon: ArrowLeftRight, key: "arrow-right-left" },
] as const;

// Selected-pill text uses a darker shade of the entity colour than its icon,
// keeping small text readable on the pale tint background.
export function darkenColor(hex: string, amount = 0.3) {
  const value = hex.replace("#", "");

  if (value.length !== 6) {
    return hex;
  }

  const parsed = parseInt(value, 16);

  if (Number.isNaN(parsed)) {
    return hex;
  }

  const red = Math.round(((parsed >> 16) & 255) * (1 - amount));
  const green = Math.round(((parsed >> 8) & 255) * (1 - amount));
  const blue = Math.round((parsed & 255) * (1 - amount));

  return `#${((red << 16) | (green << 8) | blue)
    .toString(16)
    .padStart(6, "0")}`;
}

export function getTransactionIcon(
  categoryName: string,
  type: TransactionType
) {
  const normalized = categoryName.toLowerCase();

  if (type === "income") {
    return {
      background: "#dcfce7",
      color: "#16a34a",
      Icon: Wallet,
    };
  }

  if (type === "transfer") {
    return {
      background: "#f1f5f9",
      color: "#0f172a",
      Icon: ArrowLeftRight,
    };
  }

  if (normalized.includes("food") || normalized.includes("dining")) {
    return {
      background: "#dcfce7",
      color: "#16a34a",
      Icon: Utensils,
    };
  }

  if (normalized.includes("transport") || normalized.includes("fuel")) {
    return {
      background: "#fee2e2",
      color: "#ef4444",
      Icon: Fuel,
    };
  }

  if (normalized.includes("utilities") || normalized.includes("mobile")) {
    return {
      background: "#ede9fe",
      color: "#7c3aed",
      Icon: Smartphone,
    };
  }

  if (normalized.includes("shopping")) {
    return {
      background: "#fef3c7",
      color: "#f59e0b",
      Icon: ShoppingCart,
    };
  }

  if (normalized.includes("bank")) {
    return {
      background: "#f1f5f9",
      color: "#0f172a",
      Icon: Landmark,
    };
  }

  return {
    background: "#f1f5f9",
    color: "#0f172a",
    Icon: Store,
  };
}

export function getCategoryVisual(category: CachedCategory) {
  const normalizedIcon = category.icon?.toLowerCase();
  const normalizedName = category.name.toLowerCase();
  const configured = categoryIconOptions.find(
    (option) => option.key === normalizedIcon
  );

  if (configured) {
    return {
      color: category.color ?? "#64748b",
      Icon: configured.Icon,
    };
  }

  const transactionVisual = getTransactionIcon(
    category.name,
    normalizedName.includes("salary") ? "income" : "expense"
  );

  return {
    color: category.color ?? transactionVisual.color,
    Icon: transactionVisual.Icon,
  };
}

export function getAccountTypeVisual(accountType: AccountType) {
  if (accountType === "cash") {
    return {
      background: "#dcfce7",
      color: "#22c55e",
      Icon: Wallet,
    };
  }

  if (accountType === "credit_card") {
    return {
      background: "#f3e8ff",
      color: "#a855f7",
      Icon: CreditCard,
    };
  }

  if (accountType === "digital_wallet") {
    return {
      background: "#ffedd5",
      color: "#f97316",
      Icon: Wallet,
    };
  }

  return {
    background: "#f1f5f9",
    color: "#0f172a",
    Icon: Landmark,
  };
}
