import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Text } from "./Text";
import { colors, fonts, radius } from "./theme";

type Kind = "primary" | "secondary" | "ghost" | "danger" | "light" | "outlineLight";

export function Button({ title, onPress, kind = "primary", loading, disabled, icon, style, size = "lg" }: {
  title: string; onPress?: () => void; kind?: Kind; loading?: boolean; disabled?: boolean;
  icon?: ReactNode; style?: StyleProp<ViewStyle>; size?: "md" | "lg";
}) {
  const off = disabled || loading;
  const fg = kind === "primary" || kind === "danger" || kind === "outlineLight" ? colors.white : kind === "light" ? colors.brand800 : colors.brand600;
  const h = size === "lg" ? 54 : 44;
  const inner = (
    <View style={[s.row, { height: h }]}>
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ fontFamily: fonts.semibold, fontSize: size === "lg" ? 16 : 14, color: fg }}>{title}</Text>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ disabled: !!off }} disabled={off}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      style={({ pressed }) => [s.base, kind === "secondary" && s.secondary, kind === "ghost" && s.ghost,
        kind === "danger" && { backgroundColor: colors.danger }, kind === "light" && { backgroundColor: colors.white },
        kind === "outlineLight" && { borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
        { opacity: off ? 0.55 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}>
      {kind === "primary" ? (
        <LinearGradient colors={[colors.brand800, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.grad}>{inner}</LinearGradient>
      ) : inner}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { borderRadius: radius.md, overflow: "hidden" },
  grad: { borderRadius: radius.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  secondary: { backgroundColor: colors.brand50, borderWidth: 1, borderColor: colors.brand100 },
  ghost: { backgroundColor: "transparent" },
});
