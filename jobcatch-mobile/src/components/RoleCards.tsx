import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Briefcase, FileText, Hammer, Search, type LucideIcon } from "lucide-react-native";
import { Text, colors, fonts, radius, shadow } from "@/ui";

export type RoleKey = "customer" | "artisan" | "employer" | "job_seeker";

export const ROLES: { key: RoleKey; title: string; blurb: string; detail: string; href: Href; icon: LucideIcon; from: string; to: string }[] = [
  { key: "customer", title: "Customer", blurb: "Hire artisans for your jobs", detail: "Search skilled artisans near you, book them, and track the work.", href: "/dashboard/customer", icon: Search, from: colors.brand600, to: colors.brand500 },
  { key: "artisan", title: "Artisan", blurb: "Offer your services", detail: "Publish your services, showcase your work, and get hired.", href: "/dashboard/artisan", icon: Hammer, from: colors.brand800, to: colors.brand600 },
  { key: "employer", title: "Employer", blurb: "Post jobs and hire", detail: "Advertise roles, receive CVs, and manage your applicants.", href: "/dashboard/employer", icon: Briefcase, from: colors.brand700, to: colors.brand500 },
  { key: "job_seeker", title: "Job Seeker", blurb: "Find work and apply", detail: "Browse open roles, send your CV, and follow your applications.", href: "/dashboard/seeker", icon: FileText, from: colors.brand900, to: colors.brand700 },
];

export function RoleCard({ r, active, busy, onPress, compact }: { r: (typeof ROLES)[number]; active?: boolean; busy: RoleKey | null; onPress: () => void; compact?: boolean }) {
  const loading = busy === r.key;
  return (
    <Pressable onPress={onPress} disabled={busy !== null} accessibilityRole="button" accessibilityLabel={`${r.title}: ${r.blurb}`}
      style={({ pressed }) => [s.card, compact && { padding: 12 }, shadow.card, active && { borderColor: colors.brand300 }, busy !== null && !loading && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <LinearGradient colors={[r.from, r.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.icon, compact && { width: 44, height: 44 }]}>
        <r.icon size={compact ? 21 : 24} color={colors.white} />
      </LinearGradient>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.brand900 }}>{r.title}</Text>
          {active ? <View style={s.current}><Text style={{ fontSize: 10.5, fontFamily: fonts.semibold, color: colors.brand600 }}>Current</Text></View> : null}
        </View>
        <Text variant="bodyStrong" color={colors.brand600} style={{ fontSize: 13.5 }}>{r.blurb}</Text>
        {compact ? null : <Text variant="caption">{r.detail}</Text>}
      </View>
      {loading ? <ActivityIndicator color={colors.brand500} /> : <ArrowRight size={20} color={colors.brand500} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  icon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  current: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.brand50 },
});
