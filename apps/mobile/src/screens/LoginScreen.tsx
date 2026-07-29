import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
    <SafeAreaView style={styles.safeArea}>
      {/* Edge-to-edge (Expo SDK 53+) disables Android adjustResize, so the
          KeyboardAvoidingView must be active on Android too. */}
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandMark}>
            <Wallet
              color={premiumTheme.colors.accent}
              size={24}
              strokeWidth={2.4}
            />
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>FINANCE TRACKER</Text>
            <Text style={styles.title}>Your money, clearly.</Text>
            <Text style={styles.subtitle}>
              A calm place to capture transactions and understand your finances.
            </Text>
          </View>

          <View style={styles.formSurface}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={premiumTheme.colors.muted}
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={premiumTheme.colors.muted}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {(formError || error) && (
              <Text style={styles.error}>{formError ?? error}</Text>
            )}

            <Pressable
              disabled={loading}
              onPress={handleSubmit}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Continue</Text>
                  <ArrowRight color="#ffffff" size={18} strokeWidth={2.6} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.securityNote}>
            <ShieldCheck
              color={premiumTheme.colors.secondary}
              size={16}
              strokeWidth={2.3}
            />
            <Text style={styles.securityText}>
              Your financial data stays private and securely synced.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.accentSoft,
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  button: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  error: {
    color: premiumTheme.colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  eyebrow: {
    color: premiumTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 2,
  },
  formSurface: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.surface,
    gap: 14,
    marginTop: 28,
    padding: 16,
    ...premiumTheme.shadow.floating,
  },
  input: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.control,
    color: premiumTheme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 50,
    paddingHorizontal: 14,
  },
  intro: {
    marginTop: 22,
  },
  keyboardView: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: premiumTheme.colors.canvas,
    flex: 1,
  },
  securityNote: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 12,
  },
  securityText: {
    color: premiumTheme.colors.secondary,
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  subtitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 330,
  },
  title: {
    color: premiumTheme.colors.ink,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 7,
  },
});
