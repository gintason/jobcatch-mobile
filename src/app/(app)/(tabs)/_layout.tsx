import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router/tabs";
import { Briefcase, Home, Package, User, Zap } from "lucide-react-native";
import { colors, fonts } from "@/ui/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand500,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 58 + bottom, paddingTop: 6, paddingBottom: bottom },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="bills" options={{ title: "Pay bills", tabBarIcon: ({ color, size }) => <Zap color={color} size={size} /> }} />
      <Tabs.Screen name="delivery" options={{ title: "Delivery", tabBarIcon: ({ color, size }) => <Package color={color} size={size} /> }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
