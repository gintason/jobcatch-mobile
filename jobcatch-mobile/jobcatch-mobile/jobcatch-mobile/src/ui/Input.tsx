import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Text } from "./Text";
import { colors, fonts, radius } from "./theme";

export function Input({ label, hint, error, left, right, password, style, multiline, ...rest }: TextInputProps & { label?: string; hint?: string; error?: string; left?: ReactNode; right?: ReactNode; password?: boolean }) {
    const [focus, setFocus] = useState(false);
    const [hidden, setHidden] = useState(true);
    return (
      <View style={{ gap: 6 }}>
        {label ? <Text variant="label">{label}</Text> : null}
        <View style={[s.box, multiline && { minHeight: 96, alignItems: "flex-start", paddingVertical: 10 },
          focus && { borderColor: colors.brand400, backgroundColor: colors.white }, !!error && { borderColor: colors.danger }]}>
          {left}
          <TextInput
            placeholderTextColor={colors.faint} multiline={multiline}
            secureTextEntry={password ? hidden : undefined}
            onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }} onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
            style={[s.input, multiline && { textAlignVertical: "top" }, style]} {...rest} />
          {password ? (
            <Pressable hitSlop={10} onPress={() => setHidden(!hidden)} accessibilityLabel={hidden ? "Show password" : "Hide password"}>
              {hidden ? <Eye size={20} color={colors.faint} /> : <EyeOff size={20} color={colors.faint} />}
            </Pressable>
          ) : right}
        </View>
        {error ? <Text variant="small" color={colors.danger}>{error}</Text> : hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
    );
}

const s = StyleSheet.create({
  box: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15.5, color: colors.ink, paddingVertical: 12 },
});
