import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowRight, ShieldCheck, Wallet } from "lucide-react-native";

import { useAuthStore } from "../stores/authStore";
import { premiumTheme } from "../theme/premiumTheme";

export function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setFormError("Enter your email and password.");
      return;
    }

    setFormError(null);

    try {
      await signIn(email.trim(), password);
    } catch {
      // Store exposes the friendly error message.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      {/* Edge-to-edge (Expo SDK 53+) disables Android adjustResize, so the
          KeyboardAvoidingView must be active on Android too. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          contentContainerClassName="grow justify-center px-6 py-9"
          keyboardShouldPersistTaps="handled"
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-accent-soft">
            <Wallet
              color={premiumTheme.colors.accent}
              size={24}
              strokeWidth={2.4}
            />
          </View>

          <View className="mt-[22px]">
            <Text className="text-[11px] font-black tracking-[1.1px] text-accent">
              FINANCE TRACKER
            </Text>
            <Text className="mt-[7px] text-[34px] font-black tracking-[-0.8px] text-ink">
              Your money, clearly.
            </Text>
            <Text className="mt-2 max-w-[330px] text-[14px] leading-[21px] text-secondary">
              A calm place to capture transactions and understand your finances.
            </Text>
          </View>

          <View
            className="mt-7 gap-3.5 rounded-surface bg-elevated p-4"
            style={premiumTheme.shadow.floating}
          >
            <View className="gap-[7px]">
              <Text className="px-0.5 text-[11px] font-extrabold text-secondary">
                Email
              </Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                className="min-h-[50px] rounded-control bg-field px-3.5 text-[14px] font-bold text-ink"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={premiumTheme.colors.muted}
                value={email}
              />
            </View>

            <View className="gap-[7px]">
              <Text className="px-0.5 text-[11px] font-extrabold text-secondary">
                Password
              </Text>
              <TextInput
                className="min-h-[50px] rounded-control bg-field px-3.5 text-[14px] font-bold text-ink"
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={premiumTheme.colors.muted}
                secureTextEntry
                value={password}
              />
            </View>

            {(formError || error) && (
              <Text className="text-[12px] font-bold text-danger">
                {formError ?? error}
              </Text>
            )}

            <Pressable
              className={`mt-1 min-h-[52px] flex-row items-center justify-center gap-[9px] rounded-2xl bg-ink ${
                loading ? "opacity-[0.55]" : ""
              }`}
              disabled={loading}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="text-[14px] font-black text-white">
                    Continue
                  </Text>
                  <ArrowRight color="#ffffff" size={18} strokeWidth={2.6} />
                </>
              )}
            </Pressable>
          </View>

          <View className="mt-[18px] flex-row items-center justify-center gap-[7px] px-3">
            <ShieldCheck
              color={premiumTheme.colors.secondary}
              size={16}
              strokeWidth={2.3}
            />
            <Text className="shrink text-[11px] leading-4 text-secondary">
              Your financial data stays private and securely synced.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
