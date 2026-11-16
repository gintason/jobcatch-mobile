import { useState } from "react";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";
import { AuthShell } from "@/components/AuthShell";
import { api, apiError } from "@/lib/api";
import { Button, Input, Notice, colors } from "@/ui";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setError(""); setBusy(true);
    try {
      await api.anon("/auth/password-reset/request/", { email: email.trim() });
      router.push({ pathname: "/reset", params: { email: email.trim() } });
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  }
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a code to set a new password.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" left={<Mail size={18} color={colors.faint} />} />
      <Button title="Send reset code" onPress={submit} loading={busy} disabled={!email.includes("@")} />
    </AuthShell>
  );
}
