import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Text } from "./Text";
import { colors, radius, shadow } from "./theme";

/** Standard screen: safe area, optional header with back button, scrollable body, pull-to-refresh. */
export function Screen({ title, subtitle, back, right, children, scroll = true, onRefresh, refreshing = false, footer, padded = true, bg = colors.bg }: {
  title?: string; subtitle?: string; back?: boolean; right?: ReactNode; children: ReactNode; scroll?: boolean;
  onRefresh?: () => void; refreshing?: boolean; footer?: ReactNode; padded?: boolean; bg?: string;
}) {
  const header = title || back ? (
    <View style={s.header}>
      {back ? (
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={12} style={s.back} accessibilityLabel="Go back">
          <ChevronLeft size={22} color={colors.brand900} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {title ? <Text variant={back ? "h2" : "title"} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text variant="small" numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {header}
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[padded && s.body, { paddingBottom: 40 }]}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand500} /> : undefined}>
            {children}
          </ScrollView>
        ) : <View style={[{ flex: 1 }, padded && s.body]}>{children}</View>}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>{children}</Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ title, action, children, style }: { title: string; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 10 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="h2">{title}</Text>{action}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, gap = 10, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function Divider() { return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 4 }} />; }

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow.card },
  body: { paddingHorizontal: 20, paddingTop: 6, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line, ...shadow.card },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
