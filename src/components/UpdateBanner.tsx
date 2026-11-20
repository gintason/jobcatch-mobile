import { useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { RefreshCw, X } from "lucide-react-native";
import { Text, colors, fonts, radius, shadow } from "@/ui";

/**
 * Over-the-air updates (EAS Update). The app checks on launch and whenever it
 * returns to the foreground; once a new version has downloaded, this banner
 * offers to restart into it. (If ignored, it applies on the next cold start.)
 */
export function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    const check = async () => {
      try {
        const r = await Updates.checkForUpdateAsync();
        if (r.isAvailable) await Updates.fetchUpdateAsync();
      } catch { /* offline or no update server — try again next time */ }
    };
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => sub.remove();
  }, []);

  if (!isUpdatePending || hidden) return null;
  return (
    <View style={[s.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={[s.card, shadow.lift]}>
        <RefreshCw size={18} color={colors.white} />
        <Text style={{ flex: 1, color: colors.white, fontFamily: fonts.semibold, fontSize: 13.5 }}>A new version of JobCatch is ready</Text>
        <Pressable onPress={() => Updates.reloadAsync().catch(() => {})} style={s.btn} accessibilityRole="button">
          <Text style={{ color: colors.brand700, fontFamily: fonts.semibold, fontSize: 13 }}>Restart</Text>
        </Pressable>
        <Pressable onPress={() => setHidden(true)} hitSlop={10} accessibilityLabel="Later"><X size={16} color={colors.white} /></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, alignItems: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.brand800, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 14, alignSelf: "stretch" },
  btn: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
});
