import { Linking, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { whatsappUrl } from "@/lib/support";
import { Text, fonts, radius } from "@/ui";

const GREEN = "#25D366";

export function WhatsAppIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 7c0 5.45-4.44 9.88-9.89 9.88zm8.41-18.3A11.82 11.82 0 0 0 12.04 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.33 11.89-11.89 0-3.18-1.24-6.16-3.49-8.41z" />
    </Svg>
  );
}

/** Opens WhatsApp support with `message` pre-typed (the WhatsApp app if installed, otherwise the web). */
export function WhatsAppButton({ message, label = "Chat on WhatsApp", hint }: { message: string; label?: string; hint?: string }) {
  return (
    <View style={{ gap: 8, padding: hint ? 14 : 0, borderRadius: radius.lg, backgroundColor: hint ? "rgba(37,211,102,0.08)" : "transparent",
      borderWidth: hint ? 1 : 0, borderColor: "rgba(37,211,102,0.25)" }}>
      {hint ? <Text variant="small" style={{ color: "#0b1533" }}>{hint}</Text> : null}
      <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => Linking.openURL(whatsappUrl(message)).catch(() => {})}
        style={({ pressed }) => ({ height: 50, borderRadius: radius.md, backgroundColor: GREEN, flexDirection: "row", alignItems: "center",
          justifyContent: "center", gap: 10, opacity: pressed ? 0.85 : 1 })}>
        <WhatsAppIcon />
        <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 15.5 }}>{label}</Text>
      </Pressable>
    </View>
  );
}
