import type { ComponentType } from "react";
import {
  ChartPie,
  Ellipsis,
  House,
  PiggyBank,
  ReceiptText,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { premiumTheme } from "../theme/premiumTheme";
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
    <View>
      {/* Cross-platform upward shadow: RN shadow props are iOS only and
          Android elevation cannot cast upward. Each rim is the bar's own
          silhouette expanded outward (radius grows by the offset), so the
          halo hugs the rounded corners exactly. Two rims fake the blur
          falloff. */}
      <View pointerEvents="none" style={styles.navHaloOuter} />
      <View pointerEvents="none" style={styles.navHaloInner} />
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
              color={
                active
                  ? premiumTheme.colors.ink
                  : premiumTheme.colors.muted
              }
              size={22}
              strokeWidth={active ? 2.5 : 2}
            />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
              {item.label}
            </Text>
            <View style={[styles.navDot, active && styles.navDotActive]} />
          </Pressable>
        );
        })}
      </View>
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
    // Full border minus the bottom edge so the rounded top corners are
    // stroked and read against the white screen behind them.
    borderBottomWidth: 0,
    borderColor: premiumTheme.colors.border,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 80,
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  navHaloInner: {
    backgroundColor: "rgba(16, 24, 40, 0.025)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    left: -2,
    position: "absolute",
    right: -2,
    top: -2,
  },
  navHaloOuter: {
    backgroundColor: "rgba(16, 24, 40, 0.018)",
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
    bottom: 0,
    left: -5,
    position: "absolute",
    right: -5,
    top: -5,
  },
  navDot: {
    backgroundColor: "transparent",
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  navDotActive: {
    backgroundColor: premiumTheme.colors.ink,
  },
  navItem: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 54,
  },
  navLabel: {
    color: premiumTheme.colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  navLabelActive: {
    color: premiumTheme.colors.ink,
    fontWeight: "700",
  },
});
