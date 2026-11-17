import { useState } from "react";
import { Alert, Modal, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import {
  BadgeCheck, Bell, Bike, Briefcase, ChevronRight, Hammer, LayoutGrid, MessageCircle, Search, FileText, Globe, Headphones, LogOut, MessageSquareWarning,
  Gift, Package, UserCog, Receipt, Send, ShieldCheck, Trash2, Wallet, X, type LucideIcon,
} from "lucide-react-native";
import { Avatar } from "@/components/jobs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openLink } from "@/lib/checkout";
import { COMPANY, WEB_URL } from "@/lib/config";
import { tokens } from "@/lib/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Input, Notice, Screen, Text, colors } from "@/ui";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SUPPORT_WHATSAPP, generalMessage } from "@/lib/support";

const ROLE_LABEL: Record<string, string> = { customer: "Customer", artisan: "Artisan", employer: "Employer", job_seeker: "Job seeker", rider: "Rider", admin: "Admin" };

export default function Account() {
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  if (!user) return null;
  return (
    <Screen title="Account">
      <Card onPress={() => router.push("/hub")} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.brand900, borderColor: colors.brand900 }}>
        <LayoutGrid size={22} color={colors.white} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" color={colors.white}>Role hub · {ROLE_LABEL[user.role] ?? user.role}</Text>
          <Text variant="caption" color="rgba(255,255,255,0.75)">Switch between Customer, Artisan, Employer and Job Seeker</Text>
        </View>
        <ChevronRight size={20} color={colors.white} />
      </Card>
      <Card onPress={() => router.push("/profile")} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar uri={user.photo} name={user.full_name} size={58} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text variant="h2" numberOfLines={1} style={{ flexShrink: 1 }}>{user.full_name}</Text>
            {user.is_identity_verified ? <BadgeCheck size={18} color={colors.brand500} /> : null}
          </View>
          <Text variant="small" numberOfLines={1}>{user.email}</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
            <Badge label={ROLE_LABEL[user.role] ?? user.role} tone="info" />
            {user.is_identity_verified ? <Badge label="ID verified" tone="success" /> : null}
          </View>
          <Text variant="caption" color={colors.brand500} style={{ marginTop: 4 }}>Edit profile ›</Text>
        </View>
      </Card>

      <Group title="Activity" items={[
        { icon: UserCog, label: "Edit profile", href: "/profile" },
        { icon: Wallet, label: "Wallet", href: "/wallet" },
        { icon: Send, label: "Send money", href: "/transfers" },
        { icon: Gift, label: "Invite & earn", href: "/referrals" },
        { icon: Receipt, label: "Bill payments", href: "/bills" },
        { icon: Package, label: "Deliveries", href: "/delivery" },
        { icon: MessageCircle, label: "Messages", href: "/messages" },
        { icon: Bell, label: "Notifications", href: "/notifications" },
      ]} />
      <Group title="Dashboards" items={[
        { icon: Search, label: "Customer — hire artisans", href: "/dashboard/customer" },
        { icon: Hammer, label: "Artisan — offer your services", href: "/dashboard/artisan" },
        { icon: Briefcase, label: "Employer — post jobs and hire", href: "/dashboard/employer" },
        { icon: FileText, label: "Job Seeker — find work and apply", href: "/dashboard/seeker" },
        { icon: Bike, label: "Ride with JobCatch", href: "/rider" },
      ]} />
      <WhatsAppButton message={generalMessage(user.email)} label={`WhatsApp support · ${SUPPORT_WHATSAPP.display}`}
        hint="Airtime or data not credited, a missing token, or any other problem? Chat with our support team." />
      <Group title="Help & legal" items={[
        { icon: MessageSquareWarning, label: "Complaints", url: `${WEB_URL}/complaints` },
        { icon: Headphones, label: "Contact support", url: `${WEB_URL}/contact` },
        { icon: Globe, label: "Terms of service", url: `${WEB_URL}/terms` },
        { icon: ShieldCheck, label: "Privacy policy", url: `${WEB_URL}/privacy` },
      ]} />

      <Button title="Log out" kind="secondary" icon={<LogOut size={18} color={colors.brand600} />}
        onPress={() => Alert.alert("Log out?", "You'll need to sign in again.", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: logout }])} />
      <Pressable onPress={() => setDeleting(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 }}>
        <Trash2 size={15} color={colors.danger} /><Text variant="small" color={colors.danger}>Delete my account</Text>
      </Pressable>
      <Text variant="caption" center>{COMPANY.brand} v{Constants.expoConfig?.version ?? "1.0.0"} · A product of {COMPANY.legalName} (RC {COMPANY.rcNumber})</Text>
      {deleting ? <DeleteSheet onClose={() => setDeleting(false)} /> : null}
    </Screen>
  );
}

interface Item { icon: LucideIcon; label: string; href?: Href; url?: string }

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption" style={{ marginLeft: 4, textTransform: "uppercase", letterSpacing: 1 }}>{title}</Text>
      <Card style={{ paddingVertical: 2, paddingHorizontal: 0 }}>
        {items.map(({ icon: Icon, label, href, url }, i) => (
          <Pressable key={label} onPress={() => (href ? router.push(href) : url ? openLink(url) : undefined)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null, pressed && { backgroundColor: colors.mist }]}>
            <Icon size={20} color={colors.brand600} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.ink }}>{label}</Text>
            <ChevronRight size={18} color={colors.faint} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

function DeleteSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setError(""); setBusy(true);
    try {
      await api.post("/auth/delete-account/", { password, confirm });
      await tokens.clear();
      qc.clear();
      onClose();
      await logout().catch(() => {});
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white, padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text variant="h2" style={{ flex: 1 }}>Delete account</Text>
          <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><X size={24} color={colors.brand900} /></Pressable>
        </View>
        <Notice kind="warning">This closes your JobCatch account for good: your profile, CVs, services and job posts are removed and you’re signed out everywhere. Receipts and payment records are kept as the law requires. Use or withdraw any wallet balance first.</Notice>
        <Input label="Password" value={password} onChangeText={setPassword} password placeholder="Your password" />
        <Text variant="caption">Signed up with Google and never set a password? Type DELETE below instead.</Text>
        <Input label="Or type DELETE" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title="Permanently delete my account" kind="danger" loading={busy} disabled={!password && confirm.trim().toUpperCase() !== "DELETE"} onPress={submit} />
      </SafeAreaView>
    </Modal>
  );
}
