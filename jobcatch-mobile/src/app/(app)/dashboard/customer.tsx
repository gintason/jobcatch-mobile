import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Search } from "lucide-react-native";
import { ArtisanCard } from "@/components/jobs";
import { BookingList, ConversationList, DashTabs, RoleGate, SwitchRole } from "@/components/dashboard";
import { useEnsureRole } from "@/lib/auth";
import { useFeaturedArtisans, useMyBookings } from "@/lib/jobs";
import { useConversations } from "@/lib/roles";
import { Screen, Section, Text, colors, fonts, radius } from "@/ui";

type Tab = "bookings" | "messages";

/** Customer dashboard — hire artisans, follow bookings, chat. Mirrors /dashboard/customer on the web. */
export default function CustomerDashboard() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === "messages" ? "messages" : "bookings");
  const ready = useEnsureRole("customer");
  const bookings = useMyBookings(ready);
  const convos = useConversations(ready && tab === "messages");
  const featured = useFeaturedArtisans();

  return (
    <Screen back title="Customer" subtitle="Hire artisans for your jobs" right={<SwitchRole />}
      onRefresh={() => (tab === "bookings" ? bookings.refetch() : convos.refetch())} refreshing={bookings.isRefetching || convos.isRefetching}>
      <Pressable onPress={() => router.push("/artisans")} accessibilityRole="button">
        <LinearGradient colors={[colors.brand700, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 18 }}>Find an artisan</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18 }}>Plumbers, electricians, cleaners and more — vetted and near you.</Text>
          </View>
          <View style={s.heroIcon}><Search size={22} color={colors.brand700} /></View>
        </LinearGradient>
      </Pressable>

      <DashTabs value={tab} onChange={setTab} tabs={[{ id: "bookings", label: "My bookings" }, { id: "messages", label: "Messages" }]} />
      <RoleGate ready={ready} role="customer">
        {tab === "bookings" ? <BookingList role="customer" bookings={bookings.data} loading={bookings.isLoading} emptyAction={() => router.push("/artisans")} /> : <ConversationList />}
      </RoleGate>

      {tab === "bookings" && featured.data?.length ? (
        <Section title="Top artisans" action={<Text variant="label" color={colors.brand500} onPress={() => router.push("/artisans")}>See all</Text>}>
          <View style={{ gap: 10 }}>{featured.data.slice(0, 4).map((a) => <ArtisanCard key={a.id} a={a} />)}</View>
        </Section>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: radius.lg, padding: 18 },
  heroIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
});
