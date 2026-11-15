import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { colors, fonts } from "./theme";

type Variant = "hero" | "title" | "h2" | "h3" | "body" | "bodyStrong" | "small" | "caption" | "label" | "mono";
const V: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.brand900, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.brand900, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24, color: colors.brand900 },
  h3: { fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 20, color: colors.brand900 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.brand900 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  caption: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.faint },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.brand900 },
  mono: { fontFamily: "Courier", fontSize: 13, color: colors.muted },
};

export function Text({ variant = "body", color, center, style, ...rest }: TextProps & { variant?: Variant; color?: string; center?: boolean }) {
  return <RNText {...rest} style={[V[variant], color ? { color } : null, center ? { textAlign: "center" } : null, style]} />;
}
