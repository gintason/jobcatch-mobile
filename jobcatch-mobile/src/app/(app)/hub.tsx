import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { Bike, Gift, Package, Receipt, Send, type LucideIcon } from "lucide-react-native";
import { Avatar } from "@/components/jobs";
import { ROLES, RoleCard, type RoleKey } from "@/components/RoleCards";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { firstName } from "@/lib/format";
import { Notice, Screen, Text, colors, radius, shadow } from "@/ui";

const MORE: { title: string; body: string; href: Href; icon: LucideIcon; color: string }[] = [
  { title: "Pay bills", body: "Airtime, data, power, TV, PINs", href: "/bills", icon: Receipt, color: colors.brand500 },
  { title: "Send a package", body: "Riders near you", href: "/delivery", icon: Package, color: "#ea580c" },
  { title: "Ride & earn", body: "Deliver with JobCatch", href: "/rider", icon: Bike, color: colors.success },
  { title: "Send money", body: "Wallet or bank", href: "/transfers", icon: Send, color: colors.violet },
  { title: "Invite & earn", body: "Wallet credit for referrals", href: "/referrals", icon: Gift, color: "#e11d48" },
];

/**
 * The role hub — one account, every side of JobCatch. Picking a role sets the
 * active role on the server and opens that dashboard (same as the web hub).
 */
export default function Hub() {
  const { user, switchRole } = useAuth();
  const [busy, setBusy] = useState<RoleKey | null>(null);
  const [error, setError] = useState("");

  async function choose(r: (typeof ROLES)[number]) {
    setError("");
    setBusy(r.key);
    try {
      await switchRole(r.key);
      router.push(r.href);
    } catch (e) {
      setError(apiError(e, "Could not open that dashboard. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen back title="Dashboards" right={
      <Pressable onPress={() => router.push("/profile")} accessibilityLabel="Edit profile"><Avatar uri={user?.photo} name={user?.full_name ?? ""} size={38} /></Pressable>
    }>
      <View style={{ gap: 4 }}>
        <Text variant="title">Welcome, {firstName(user?.full_name)}</Text>
        <Text variant="small">One account, every side of JobCatch. How would you like to continue today? You can switch any time.</Text>
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View style={{ gap: 12 }}>
        {ROLES.map((r) => <RoleCard key={r.key} r={r} active={user?.role === r.key} busy={busy} onPress={() => choose(r)} />)}
      </View>

      <Text variant="h3" style={{ marginTop: 6 }}>Also on JobCatch</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {MORE.map((m) => (
          <Pressable key={m.title} onPress={() => router.push(m.href)} style={({ pressed }) => [s.more, shadow.card, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <View style={[s.moreIcon, { backgroundColor: m.color }]}><m.icon size={18} color={colors.white} /></View>
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>{m.title}</Text>
            <Text variant="caption" numberOfLines={2}>{m.body}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  more: { width: "48%", flexGrow: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.line },
  moreIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 6 },
});
