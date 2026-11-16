import { useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Gift, Lock, Mail, Phone, User } from "lucide-react-native";
import { AuthShell } from "@/components/AuthShell";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { referralDraft } from "@/lib/referrals";
import { openLink } from "@/lib/checkout";
import { WEB_URL } from "@/lib/config";
import { Button, Input, Notice, Text, colors } from "@/ui";

export default function Register() {
  const { register } = useAuth();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [f, setF] = useState(() => {
    if (ref) referralDraft.set(ref);
    return { full_name: "", email: "", phone: "", password: "", referral_code: referralDraft.get() };
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  async function submit() {
    if (!f.full_name.trim() || !f.email.trim() || f.password.length < 8) {
      setError("Fill in your name and email, and use a password of at least 8 characters."); return;
    }
    setError(""); setBusy(true);
    try {
      await register({ ...f, phone: f.phone || undefined, referral_code: f.referral_code.trim() || undefined });
      router.push({ pathname: "/verify", params: { email: f.email.trim() } });
    } catch (e) { setError(apiError(e, "We couldn't create your account.")); } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Create your account" subtitle="One free account for bills, jobs, deliveries and artisans."
      footer={<Text center variant="small">Already have an account? <Link href="/login" style={{ color: colors.brand500, fontWeight: "600" }}>Sign in</Link></Text>}>
      {f.referral_code ? <Notice kind="success">Invited by a friend — code {f.referral_code} applied.</Notice> : null}
      <GoogleButton onError={setError} />
      <OrDivider />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Input label="Full name" value={f.full_name} onChangeText={set("full_name")} autoComplete="name" textContentType="name" left={<User size={18} color={colors.faint} />} placeholder="Ada Okafor" />
      <Input label="Email" value={f.email} onChangeText={set("email")} autoCapitalize="none" keyboardType="email-address" autoComplete="email" left={<Mail size={18} color={colors.faint} />} placeholder="you@example.com" />
      <Input label="Phone (optional)" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" left={<Phone size={18} color={colors.faint} />} placeholder="0803 123 4567" />
      <Input label="Password" value={f.password} onChangeText={set("password")} password autoComplete="new-password" textContentType="newPassword" left={<Lock size={18} color={colors.faint} />} placeholder="At least 8 characters" />
      <Input label="Referral code (optional)" value={f.referral_code} autoCapitalize="characters" autoCorrect={false} maxLength={12}
        onChangeText={(v) => { set("referral_code")(v.toUpperCase()); referralDraft.set(v); }} left={<Gift size={18} color={colors.faint} />} placeholder="From a friend" />
      <Button title="Create account" onPress={submit} loading={busy} />
      <Text variant="caption" center>
        By continuing you agree to our <Text variant="caption" color={colors.brand500} onPress={() => openLink(`${WEB_URL}/terms`)}>Terms</Text> and <Text variant="caption" color={colors.brand500} onPress={() => openLink(`${WEB_URL}/privacy`)}>Privacy Policy</Text>.
      </Text>
    </AuthShell>
  );
}
