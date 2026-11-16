import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { colors, radius, statusTone, toneColors, type Tone } from "./theme";

export function Badge({ label, tone, status }: { label: string; tone?: Tone; status?: string }) {
  const t = toneColors[tone ?? (status ? statusTone(status) : "info")];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={{ fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: t.fg }}>{label}</Text>
    </View>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const map = {
    info: [colors.brand50, colors.brand700, Info], error: [colors.dangerBg, colors.danger, AlertCircle],
    success: [colors.successBg, colors.success, CheckCircle2], warning: [colors.warningBg, colors.warning, AlertCircle],
  } as const;
  const [bg, fg, Icon] = map[kind];
  return (
    <View style={[s.notice, { backgroundColor: bg }]} accessibilityRole={kind === "error" ? "alert" : undefined}>
      <Icon size={18} color={fg} />
      <Text variant="small" color={fg} style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

export function Empty({ icon, title, body, action, onAction }: { icon?: ReactNode; title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.empty}>
      {icon ? <View style={s.emptyIcon}>{icon}</View> : null}
      <Text variant="h3" center>{title}</Text>
      {body ? <Text variant="small" center>{body}</Text> : null}
      {action ? <Button title={action} onPress={onAction} size="md" kind="secondary" style={{ marginTop: 6 }} /> : null}
    </View>
  );
}

export function Skeleton({ height = 72, width = "100%", r = radius.lg }: { height?: number; width?: DimensionValue; r?: number }) {
  const [o] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={{ height, width, borderRadius: r, backgroundColor: colors.brand100, opacity: o }} />;
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return <View style={{ gap: 12 }}>{Array.from({ length: rows }, (_, i) => <Skeleton key={i} />)}</View>;
}

const s = StyleSheet.create({
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  notice: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, alignItems: "flex-start" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 32, paddingHorizontal: 16 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center", marginBottom: 6 },
});
