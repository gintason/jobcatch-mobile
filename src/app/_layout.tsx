import { useState } from "react";
import { AppState, Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { UpdateBanner } from "@/components/UpdateBanner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { colors } from "@/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Refetch when the app comes back to the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
}

export default function RootLayout() {
  const client = queryClient;
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { user, ready } = useAuth();
  const [splash, setSplash] = useState(true);
  return (
    <>
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      ) : null}
      {/* Brand animation on top; it hides the native splash on its first frame and fades out when ready. */}
      {splash ? <AnimatedSplash ready={ready} onDone={() => setSplash(false)} /> : <UpdateBanner />}
    </>
  );
}
