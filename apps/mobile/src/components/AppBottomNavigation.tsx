import type { ComponentType } from "react";
import {
  ChartPie,
  Ellipsis,
  House,
  PiggyBank,
  ReceiptText,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../types/navigation";

export type AppBottomNavigationRoute =
  | "Analytics"
  | "Budgets"
  | "Dashboard"
  | "Settings"
  | "Transactions";

type AppBottomNavigationIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

interface AppBottomNavigationProps {
  activeRoute: AppBottomNavigationRoute;
  onNavigate: (route: AppBottomNavigationRoute) => void;
}

const items = [
  {
    Icon: House,
    label: "Home",
    route: "Dashboard",
  },
  {
    Icon: ReceiptText,
    label: "Transactions",
    route: "Transactions",
  },
  {
    Icon: PiggyBank,
    label: "Budgets",
    route: "Budgets",
  },
  {
    Icon: ChartPie,
    label: "Analytics",
    route: "Analytics",
  },
  {
    Icon: Ellipsis,
    label: "More",
    route: "Settings",
  },
] satisfies {
  Icon: AppBottomNavigationIcon;
  label: string;
  route: AppBottomNavigationRoute;
}[];

export function AppBottomNavigation({
  activeRoute,
  onNavigate,
}: AppBottomNavigationProps) {
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const Icon = item.Icon;
        const active = item.route === activeRoute;

        return (
          <Pressable
            key={item.label}
            onPress={() => onNavigate(item.route)}
            style={styles.navItem}
          >
            <Icon
              color={active ? "#000000" : "#9aa0aa"}
              size={24}
              strokeWidth={active ? 2.7 : 2.2}
            />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function getBottomNavigationRoute(
  routeName: keyof RootStackParamList
): AppBottomNavigationRoute {
  if (routeName === "Budgets") return "Budgets";
  if (routeName === "Analytics" || routeName === "Reports") return "Analytics";
  if (
    routeName === "Transactions" ||
    routeName === "Events" ||
    routeName === "EventReview"
  ) {
    return "Transactions";
  }
  if (
    routeName === "Categories" ||
    routeName === "FinancialIntelligence" ||
    routeName === "Merchants" ||
    routeName === "Settings"
  ) {
    return "Settings";
  }

  return "Dashboard";
}

const styles = StyleSheet.create({
  bottomNav: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 86,
    paddingBottom: 10,
    paddingHorizontal: 14,
    shadowColor: "#111827",
    shadowOffset: {
      height: -8,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    gap: 5,
    justifyContent: "center",
  },
  navLabel: {
    color: "#9aa0aa",
    fontSize: 12,
    fontWeight: "800",
  },
  navLabelActive: {
    color: "#000000",
  },
});
