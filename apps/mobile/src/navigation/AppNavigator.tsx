import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { DashboardScreen } from "../screens/DashboardScreen";
import {
  AnalyticsScreen,
  BudgetsScreen,
  CategoriesScreen,
  EventsScreen,
  MerchantsScreen,
  ReportsScreen,
  TransactionsScreen,
} from "../screens/FinanceScreens";
import { LoginScreen } from "../screens/LoginScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useAuthStore } from "../stores/authStore";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const session = useAuthStore((state) => state.session);

  return (
    <Stack.Navigator>
      {session ? (
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: "Dashboard" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
          <Stack.Screen
            name="Events"
            component={EventsScreen}
            options={{ title: "Financial Events" }}
          />
          <Stack.Screen
            name="Transactions"
            component={TransactionsScreen}
            options={{ title: "Transactions" }}
          />
          <Stack.Screen
            name="Merchants"
            component={MerchantsScreen}
            options={{ title: "Merchants" }}
          />
          <Stack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={{ title: "Categories" }}
          />
          <Stack.Screen
            name="Budgets"
            component={BudgetsScreen}
            options={{ title: "Budgets" }}
          />
          <Stack.Screen
            name="Reports"
            component={ReportsScreen}
            options={{ title: "Reports" }}
          />
          <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{ title: "Analytics" }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Sign in" }}
        />
      )}
    </Stack.Navigator>
  );
}
