import { View } from "react-native";
import { Image } from "expo-image";
import { Text, colors, fonts } from "@/ui";

export function Logo({ size = 40, light = false }: { size?: number; light?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image source={require("@/assets/images/logo.jpeg")} style={{ width: size, height: size, borderRadius: size * 0.25 }} contentFit="cover" />
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.5, color: light ? colors.white : colors.brand800 }}>
        Job<Text style={{ fontFamily: fonts.display, fontSize: size * 0.5, color: light ? colors.brand200 : colors.brand500 }}>Catch</Text>
      </Text>
    </View>
  );
}
