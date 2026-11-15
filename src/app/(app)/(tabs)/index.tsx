import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, Briefcase, ChevronRight, Gift, Package, Wrench } from "lucide-react-native";
import { BILL_SERVICES, ServiceGrid, WalletCard } from "@/components/bills";
import { Avatar, ArtisanCard, JobCard } from "@/components/jobs";
import { useAuth } from "@/lib/auth";
import { useCatalogue, useWallet } from "@/lib/billing";
import { ACTIVE, useMyDeliveries } from "@/lib/dispatch";
import { firstName } from "@/lib/format";
import { useFeaturedArtisans, useFeaturedJobs, useUnreadCount } from "@/lib/jobs";
import { Screen, Section, Text, colors, fonts, radius, shadow } from "@/ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const { user } = useAuth();
  const catalogue = useCatalogue();
  const wallet = useWallet();
  const unread = useUnreadCount();
  const deliveries = useMyDeliveries();
  const jobs = useFeaturedJobs();
  const artisans = useFeaturedArtisans();
  const active = deliveries.data?.find((d) => ACTIVE.includes(d.status));
  const quick = BILL_SERVICES.filter((s) => s.enabled(catalogue.data)).slice(0, 8);

  return (
    <Screen onRefresh={() => { wallet.refetch(); deliveries.refetch(); jobs.refetch(); artisans.refetch(); unread.refetch(); }} refreshing={wallet.isRefetching}>
      <View style={s.header}>
        <Pressable onPress={() => router.push("/account")} accessibilityLabel="Account"><Avatar name={user?.full_name ?? ""} size={44} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="small">{greeting()},</Text>
          <Text variant="h2">{firstName(user?.full_name)} 👋</Text>
        </View>
        <Pressable onPress={() => router.push("/notifications")} style={s.bell} accessibilityLabel={`Notifications${unread.data ? `, ${unread.data} unread` : ""}`}>
          <Bell size={22} color={colors.brand900} />
          {unread.data ? <View style={s.dot}><Text style={{ color: colors.white, fontSize: 10, fontFamily: fonts.semibold }}>{unread.data > 9 ? "9+" : unread.data}</Text></View> : null}
        </Pressable>
      </View>

      <WalletCard />

      {active ? (
        <Pressable onPress={() => router.push(`/delivery/${active.id}`)} style={[s.active, shadow.card]}>
          <View style={s.activeIcon}><Package size={20} color={colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>{active.status_label}</Text>
            <Text variant="caption" numberOfLines={1}>To {active.dropoff_address}</Text>
          </View>
          <ChevronRight size={20} color={colors.faint} />
        </Pressable>
      ) : null}

      <Section title="Pay bills" action={<Text variant="label" color={colors.brand500} onPress={() => router.push("/bills")}>See all</Text>}>
        <ServiceGrid items={quick} />
      </Section>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Promo colorsFrom={colors.brand900} colorsTo={colors.brand600} icon={Package} title="Send a package" body="Riders near you, priced up front." onPress={() => router.push("/delivery/new?kind=package")} />
        <Promo colorsFrom="#7c2d12" colorsTo="#ea580c" icon={Wrench} title="Hire an artisan" body="Vetted pros for any fix." onPress={() => router.push("/artisans")} />
      </View>

      <Pressable onPress={() => router.push("/referrals")} style={[s.active, shadow.card]} accessibilityRole="button">
        <View style={[s.activeIcon, { backgroundColor: "#e11d48" }]}><Gift size={20} color={colors.white} /></View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" style={{ fontSize: 14 }}>Invite friends, earn cash</Text>
          <Text variant="caption">Get wallet credit for every friend who joins</Text>
        </View>
        <ChevronRight size={20} color={colors.faint} />
      </Pressable>

      {jobs.data?.length ? (
        <Section title="Featured jobs" action={<Text variant="label" color={colors.brand500} onPress={() => router.push("/jobs")}>All jobs</Text>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20, paddingBottom: 6 }} style={{ marginRight: -20 }}>
            {jobs.data.slice(0, 8).map((j) => <JobCard key={j.id} j={j} wide />)}
          </ScrollView>
        </Section>
      ) : (
        <Pressable onPress={() => router.push("/jobs")} style={[s.active, shadow.card]}>
          <View style={[s.activeIcon, { backgroundColor: colors.brand700 }]}><Briefcase size={20} color={colors.white} /></View>
          <View style={{ flex: 1 }}><Text variant="bodyStrong" style={{ fontSize: 14 }}>Find a corporate job</Text><Text variant="caption">Roles from verified employers</Text></View>
          <ChevronRight size={20} color={colors.faint} />
        </Pressable>
      )}

      {artisans.data?.length ? (
        <Section title="Top artisans" action={<Text variant="label" color={colors.brand500} onPress={() => router.push("/artisans")}>See all</Text>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20, paddingBottom: 6 }} style={{ marginRight: -20 }}>
            {artisans.data.slice(0, 8).map((a) => <ArtisanCard key={a.id} a={a} wide />)}
          </ScrollView>
        </Section>
      ) : null}
    </Screen>
  );
}

function Promo({ colorsFrom, colorsTo, icon: Icon, title, body, onPress }: { colorsFrom: string; colorsTo: string; icon: typeof Package; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button">
      <LinearGradient colors={[colorsFrom, colorsTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promo}>
        <View style={s.promoIcon}><Icon size={20} color={colors.white} /></View>
        <Text style={{ color: colors.white, fontFamily: fonts.displayBold, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 16 }}>{body}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow.card },
  dot: { position: "absolute", top: 6, right: 6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  active: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.line },
  activeIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brand500, alignItems: "center", justifyContent: "center" },
  promo: { borderRadius: radius.lg, padding: 16, gap: 4, minHeight: 140 },
  promoIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
});
