import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Briefcase, Package, Wrench, Zap } from "lucide-react-native";
import { Logo } from "@/components/Brand";
import { Button, Text, colors, fonts, radius } from "@/ui";

const SERVICES = [
  { icon: Zap, title: "Pay bills", body: "Airtime, data, power, TV" },
  { icon: Briefcase, title: "Corporate jobs", body: "Verified employers" },
  { icon: Package, title: "Dispatch", body: "Packages & food runs" },
  { icon: Wrench, title: "Artisans", body: "Trusted pros near you" },
];

/** First screen for signed-out users. */
export default function Welcome() {
  return (
    <LinearGradient colors={[colors.brand900, colors.brand700, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, justifyContent: "space-between" }}>
        <View style={{ paddingTop: 16 }}><Logo light size={42} /></View>
        <View style={{ gap: 14 }}>
          <Text style={s.kicker}>ONE APP · EVERYDAY NIGERIA</Text>
          <Text style={s.hero}>Bills, jobs, deliveries and trusted artisans — in one place.</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 23 }}>
            Pay instantly, apply to verified employers, send a package across town, or book a vetted pro.
          </Text>
          <View style={s.grid}>
            {SERVICES.map(({ icon: Icon, title, body }) => (
              <View key={title} style={s.tile}>
                <View style={s.tileIcon}><Icon size={18} color={colors.white} /></View>
                <Text style={{ color: colors.white, fontFamily: fonts.displayBold, fontSize: 14 }}>{title}</Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: fonts.regular, fontSize: 12 }}>{body}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <Button kind="light" title="Create a free account" onPress={() => router.push("/register")} />
          <Button kind="outlineLight" title="I already have an account" onPress={() => router.push("/login")} />
          <Text center style={{ color: "rgba(255,255,255,0.6)", fontSize: 11.5 }}>A product of Spotlight Investments Limited · RC 9434426</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  kicker: { color: colors.brand200, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.6 },
  hero: { color: colors.white, fontFamily: fonts.display, fontSize: 32, lineHeight: 39, letterSpacing: -0.6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  tile: { width: "48%", flexGrow: 1, padding: 14, gap: 4, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  tileIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 6 },
});
