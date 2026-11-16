import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Text, colors } from "@/ui";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18, flexGrow: 1 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={12} accessibilityLabel="Go back"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={22} color={colors.brand900} />
          </Pressable>
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text variant="title">{title}</Text>
            {subtitle ? <Text variant="small" style={{ fontSize: 14.5 }}>{subtitle}</Text> : null}
          </View>
          {children}
          <View style={{ flex: 1 }} />
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
