import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Text, colors, fonts } from "@/ui";

/*
 * Animated brand splash. The native splash shows the JC mark alone (assets/images/splash-icon.png,
 * imageWidth 200 → the mark is ~176 dp wide). This overlay starts on exactly that frame, then:
 * the mark pops and rises, "Job" and "Catch" slide in from either side and lock together under it,
 * a tagline fades in, and once the app is ready the whole thing fades away.
 */
const MARK_W = 176;
const PX = MARK_W / 1022;                       // image pixels → dp (all three pieces share one scale)
const MARK = { w: MARK_W, h: 526 * PX };
const JOB = { w: 404 * PX * 1.18, h: 192 * PX * 1.18 };
const CATCH = { w: 608 * PX * 1.18, h: 192 * PX * 1.18 };
const TAGLINE_H = 18;
// The column (mark + name + tagline) is centred on screen. At the start only the mark shows, and it
// must sit exactly where the native splash drew it (screen centre), so the column starts shifted down
// by half the height below the mark, then rises to 0 as the name arrives.
const START_Y = (14 + JOB.h + 12 + TAGLINE_H) / 2;
const MIN_SHOW_MS = 2100;

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [v] = useState(() => ({
    markScale: new Animated.Value(1), markY: new Animated.Value(START_Y),
    jobX: new Animated.Value(-190), catchX: new Animated.Value(190), words: new Animated.Value(0),
    tagline: new Animated.Value(0), out: new Animated.Value(1),
  }));
  const [introDone, setIntroDone] = useState(false);
  const reduced = useRef(false);

  // Hide the native splash only once this overlay has drawn its first frame (no flash).
  const shown = useRef(false);
  const onLayout = () => {
    if (shown.current) return;
    shown.current = true;
    SplashScreen.hideAsync().catch(() => {});
    start();
  };

  function start() {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduced.current = r;
      if (r) {
        v.jobX.setValue(0); v.catchX.setValue(0); v.markY.setValue(0);
        Animated.parallel([
          Animated.timing(v.words, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(v.tagline, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setIntroDone(true), 700);
        return;
      }
      Animated.parallel([
        Animated.sequence([
          Animated.timing(v.markScale, { toValue: 1.12, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(v.markScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        ]),
        Animated.timing(v.markY, { toValue: 0, duration: 520, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(320),
          Animated.parallel([
            Animated.timing(v.words, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            // Soft spring with a slight overshoot so the two words "click" together.
            Animated.spring(v.jobX, { toValue: 0, friction: 6.5, tension: 28, useNativeDriver: true }),
            Animated.spring(v.catchX, { toValue: 0, friction: 6.5, tension: 28, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(v.tagline, { toValue: 1, duration: 380, delay: 1250, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setIntroDone(true), MIN_SHOW_MS);
    });
  }

  useEffect(() => {
    if (!ready || !introDone) return;
    Animated.timing(v.out, { toValue: 0, duration: reduced.current ? 200 : 380, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(() => onDone());
  }, [ready, introDone, v, onDone]);

  const zoom = v.out.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: v.out }]} onLayout={onLayout} pointerEvents="none"
      accessible accessibilityLabel="JobCatch is loading">
      <Animated.View style={{ alignItems: "center", transform: [{ scale: zoom }] }}>
        <Animated.Image source={require("@/assets/images/splash-mark.png")} resizeMode="contain"
          style={{ width: MARK.w, height: MARK.h, transform: [{ translateY: v.markY }, { scale: v.markScale }] }} />
        <Animated.View style={[s.words, { opacity: v.words, transform: [{ translateY: v.markY }] }]}>
          <Animated.Image source={require("@/assets/images/splash-job.png")} resizeMode="contain"
            style={{ width: JOB.w, height: JOB.h, transform: [{ translateX: v.jobX }] }} />
          <Animated.Image source={require("@/assets/images/splash-catch.png")} resizeMode="contain"
            style={{ width: CATCH.w, height: CATCH.h, marginLeft: -2, transform: [{ translateX: v.catchX }] }} />
        </Animated.View>
        <Animated.View style={{ opacity: v.tagline, transform: [{ translateY: v.markY }] }}>
          <Text style={s.tagline} numberOfLines={1}>Bills · Jobs · Delivery · Artisans</Text>
        </Animated.View>
      </Animated.View>
      <View style={s.footer}><Text style={s.footerText}>A product of Spotlight Investments Limited</Text></View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: colors.white, alignItems: "center", justifyContent: "center", zIndex: 100, elevation: 100 },
  words: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  tagline: { marginTop: 12, height: TAGLINE_H, lineHeight: TAGLINE_H, fontFamily: fonts.medium, fontSize: 12.5, letterSpacing: 1.2, color: colors.muted },
  footer: { position: "absolute", bottom: 42, left: 0, right: 0, alignItems: "center" },
  footerText: { fontFamily: fonts.regular, fontSize: 11, color: colors.faint },
});
