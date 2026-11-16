import { useState } from "react";
import { View } from "react-native";
import { Link, router } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { AuthShell } from "@/components/AuthShell";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";
import { useAuth } from "@/lib/auth";
import { ApiError, apiError } from "@/lib/api";
import { Button, Input, Notice, Text, colors } from "@/ui";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setError(""); setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      if (e instanceof ApiError && (e.data as { code?: string })?.code === "email_unverified") {
        router.push({ pathname: "/verify", params: { email: email.trim() } });
      } else setError(apiError(e, "Incorrect email or password."));
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to pay bills, track deliveries and manage your jobs."
      footer={<Text center variant="small">New to JobCatch? <Link href="/register" style={{ color: colors.brand500, fontWeight: "600" }}>Create an account</Link></Text>}>
      <GoogleButton onError={setError} />
      <OrDivider />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" left={<Mail size={18} color={colors.faint} />} placeholder="you@example.com" />
      <Input label="Password" value={password} onChangeText={setPassword} password autoComplete="current-password" textContentType="password" left={<Lock size={18} color={colors.faint} />} placeholder="Your password" onSubmitEditing={submit} returnKeyType="go" />
      <View style={{ alignItems: "flex-end", marginTop: -6 }}>
        <Link href="/forgot" style={{ color: colors.brand500, fontWeight: "600", fontSize: 13.5 }}>Forgot password?</Link>
      </View>
      <Button title="Sign in" onPress={submit} loading={busy} />
    </AuthShell>
  );
}
