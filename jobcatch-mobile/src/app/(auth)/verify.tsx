import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { KeyRound } from "lucide-react-native";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { Button, Input, Notice, colors } from "@/ui";

export default function Verify() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp, resendOtp } = useAuth();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null); setBusy(true);
    try { await verifyOtp(email, code); } catch (e) { setMsg({ kind: "error", text: apiError(e, "Invalid or expired code.") }); } finally { setBusy(false); }
  }
  async function resend() {
    try { await resendOtp(email); setMsg({ kind: "success", text: "A new code is on its way." }); }
    catch (e) { setMsg({ kind: "error", text: apiError(e, "Could not resend right now.") }); }
  }

  return (
    <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code we sent to ${email || "your email"}.`}>
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      {!params.email ? <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /> : null}
      <Input label="Verification code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad"
        autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} placeholder="••••••" left={<KeyRound size={18} color={colors.faint} />}
        style={{ letterSpacing: 8, fontSize: 20 }} />
      <Button title="Verify and continue" onPress={submit} loading={busy} disabled={code.length < 6 || !email} />
      <Button title="Resend code" kind="ghost" onPress={resend} />
    </AuthShell>
  );
}
