import { View } from "react-native";
import { Stack } from "expo-router";
import { AIAssistant } from "@/components/AIAssistant";
import { colors } from "@/ui/theme";

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      <AIAssistant />
    </View>
  );
}
