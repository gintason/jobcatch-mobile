import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AuthShell } from "@/components/AuthShell";
import { api, apiError } from "@/lib/api";
import { Button, Input, Notice } from "@/ui";

export default function Reset() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit() {
    setError(""); setBusy(true);
    try { await api.anon("/auth/password-reset/confirm/", { email, code, new_password: password }); setDone(true); }
    catch (e) { setError(apiError(e, "Invalid or expired code.")); } finally { setBusy(false); }
  }
  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Button title="Go to sign in" onPress={() => router.replace("/login")} />
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Set a new password" subtitle={`Enter the code we emailed to ${email}.`}>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Input label="Reset code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
      <Input label="New password" value={password} onChangeText={setPassword} password autoComplete="new-password" placeholder="At least 8 characters" />
      <Button title="Update password" onPress={submit} loading={busy} disabled={code.length < 4 || password.length < 8} />
    </AuthShell>
  );
}
