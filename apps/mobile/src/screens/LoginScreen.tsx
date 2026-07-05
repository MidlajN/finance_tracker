import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useAuthStore } from "../stores/authStore";

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
    <View style={styles.container}>
      <Text style={styles.title}>Finance Tracker</Text>
      <Text style={styles.subtitle}>Sign in to your finance platform.</Text>

      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        value={email}
      />

      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />

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
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  container: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24
  },
  error: {
    color: "#b91c1c",
    fontSize: 14
  },
  input: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
    marginBottom: 12
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800"
  }
});
