import { View } from "react-native";
import { Megaphone } from "lucide-react-native";
import { Text, colors, radius } from "@/ui";

export const TELL_ARTISAN = "Please tell the artisan / skilled worker that you got their contact on JobCatch.";
export const TELL_EMPLOYER = "Please tell the employer that you got their contact on JobCatch.";

/** "Tell them you found them on JobCatch" banner — same as the web's ReferralNotice. */
export function ReferralNotice({ message }: { message: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.brand50, borderWidth: 1, borderColor: colors.brand100 }}>
      <Megaphone size={19} color={colors.brand500} style={{ marginTop: 1 }} />
      <Text variant="small" color={colors.brand800} style={{ flex: 1, fontFamily: "Inter_500Medium" }}>{message}</Text>
    </View>
  );
}
