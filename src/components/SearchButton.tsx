import { Keyboard, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text, colors, fonts, radius } from "@/ui";

/** Blue "Search" button that sits inside a search box (same as the web search bars). */
export function SearchButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={() => { Keyboard.dismiss(); onPress(); }} accessibilityRole="button" accessibilityLabel="Search"
      style={({ pressed }) => [{ marginRight: -6, borderRadius: radius.md, overflow: "hidden" }, pressed && { opacity: 0.85 }]}>
      <LinearGradient colors={[colors.brand800, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md }}>
        <Text style={{ color: colors.white, fontFamily: fonts.semibold, fontSize: 14.5 }}>Search</Text>
      </LinearGradient>
    </Pressable>
  );
}
