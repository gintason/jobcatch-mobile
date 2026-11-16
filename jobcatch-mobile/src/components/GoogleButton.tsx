import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { GOOGLE } from "@/lib/config";
import { Text, colors, fonts, radius } from "@/ui";

WebBrowser.maybeCompleteAuthSession();

/** Client ID for this platform; Google sign-in is hidden until it is configured. */
const platformId = Platform.select({ ios: GOOGLE.iosClientId, android: GOOGLE.androidClientId, default: GOOGLE.webClientId });

export function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  if (!platformId) return null;
  return <GoogleButtonInner onError={onError} />;
}

function GoogleButtonInner({ onError }: { onError: (msg: string) => void }) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [request, , prompt] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE.webClientId, iosClientId: GOOGLE.iosClientId, androidClientId: GOOGLE.androidClientId, selectAccount: true,
  });

  async function start() {
    const res = await prompt();
    if (res.type === "error") { onError("Google sign-in failed. Please try again."); return; }
    if (res.type !== "success") return;                  // cancelled / dismissed
    const idToken = res.params.id_token ?? res.authentication?.idToken;
    if (!idToken) { onError("Google didn't return a sign-in token. Please try again."); return; }
    setBusy(true);
    try { await loginWithGoogle(idToken); } catch (e) { onError(apiError(e, "Google sign-in failed.")); setBusy(false); }
  }

  return (
    <Pressable disabled={!request || busy} onPress={start} accessibilityRole="button"
      style={({ pressed }) => [s.btn, (pressed || busy) && { opacity: 0.8 }]}>
      <GoogleG />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink }}>{busy ? "Signing in…" : "Continue with Google"}</Text>
    </Pressable>
  );
}

export function OrDivider() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
      <View style={s.line} /><Text variant="caption">OR</Text><View style={s.line} />
    </View>
  );
}

function GoogleG() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

const s = StyleSheet.create({
  btn: { height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});
