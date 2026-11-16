import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Bike, ChevronRight, Package, ShieldCheck, UtensilsCrossed } from "lucide-react-native";
import { DeliveryRow } from "@/components/delivery";
import { ACTIVE, useMyDeliveries } from "@/lib/dispatch";
import { Card, Empty, Loading, Screen, Section, Text, colors, fonts, radius, shadow } from "@/ui";

export default function DeliveryTab() {
  const list = useMyDeliveries();
  const active = list.data?.filter((d) => ACTIVE.includes(d.status)) ?? [];
  const past = list.data?.filter((d) => !ACTIVE.includes(d.status)) ?? [];
  return (
    <Screen title="Dispatch & delivery" subtitle="Verified riders, priced up front." onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <LinearGradient colors={[colors.brand900, colors.brand600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, shadow.lift]}>
        <View style={s.heroGlow} />
        <Text style={{ color: colors.brand200, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2 }}>SAME-DAY · ACROSS TOWN</Text>
        <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 22, lineHeight: 28, marginTop: 4 }}>What are we moving today?</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Choice icon={Package} title="Send a package" body="Docs, parcels, boxes" onPress={() => router.push("/delivery/new?kind=package")} />
          <Choice icon={UtensilsCrossed} title="Food & errands" body="We buy and bring it" onPress={() => router.push("/delivery/new?kind=errand")} />
        </View>
      </LinearGradient>

      <View style={s.steps}>
        {["Book & see the price", "A nearby rider accepts", "Pay at pickup", "Share your code on delivery"].map((t, i) => (
          <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={s.stepNum}><Text style={{ color: colors.brand600, fontFamily: fonts.displayBold, fontSize: 12 }}>{i + 1}</Text></View>
            <Text variant="small" style={{ flex: 1, color: colors.ink }}>{t}</Text>
          </View>
        ))}
      </View>

      {list.isLoading ? <Loading rows={2} /> : null}
      {active.length ? (
        <Section title="On the way">
          <Card style={{ paddingVertical: 4 }}>{active.map((d, i) => <View key={d.id} style={i ? s.sep : null}><DeliveryRow d={d} /></View>)}</Card>
        </Section>
      ) : null}
      <Section title="Past deliveries">
        <Card style={{ paddingVertical: 4 }}>
          {past.length ? past.slice(0, 20).map((d, i) => <View key={d.id} style={i ? s.sep : null}><DeliveryRow d={d} /></View>)
            : <Empty icon={<Package size={26} color={colors.brand500} />} title="No deliveries yet" body="Book your first delivery in under a minute." />}
        </Card>
      </Section>

      <Card onPress={() => router.push("/rider")} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={[s.stepNum, { width: 46, height: 46, borderRadius: 14 }]}><Bike size={22} color={colors.brand600} /></View>
        <View style={{ flex: 1 }}>
          <Text variant="h3">Ride with JobCatch</Text>
          <Text variant="small">Earn from every delivery, paid straight to your bank.</Text>
        </View>
        <ChevronRight size={20} color={colors.faint} />
      </Card>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }}>
        <ShieldCheck size={14} color={colors.faint} /><Text variant="caption">Every rider is ID-verified before their first trip.</Text>
      </View>
    </Screen>
  );
}

function Choice({ icon: Icon, title, body, onPress }: { icon: typeof Package; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.choice, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button">
      <View style={s.choiceIcon}><Icon size={20} color={colors.brand600} /></View>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: colors.brand900 }}>{title}</Text>
      <Text variant="caption">{body}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20, overflow: "hidden" },
  heroGlow: { position: "absolute", right: -50, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)" },
  choice: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 4 },
  choiceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  steps: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
});
