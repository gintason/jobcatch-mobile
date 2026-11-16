import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Text, colors, fonts } from "@/ui";

/*
 * Animated brand splash.
 *
 * The native splash (assets/images/splash-icon.png) is the full JobCatch logo on white, drawn in a
 * 240 dp box — the size Android 12+ always uses, and the imageWidth we give iOS/older Android.
 * This overlay rebuilds that exact frame from three pieces (mark, "Job", "Catch") in the same box,
 * so the hand-off is invisible. Then: the logo grows, "Job" and "Catch" part and spring back together,
 * a tagline fades in, and once the app is ready it all fades away.
 */
const BOX = 240;                                  // dp, must match app.json splash imageWidth
const CANVAS = 1024;                              // splash-icon.png size
const K = 0.64 * CANVAS / 525;                    // logo (525 src px wide) fills 64% of the canvas
const LOGO_X = 184, LOGO_Y = 285;                 // where the logo sits on the canvas
const SRC_L = 243, SRC_T = 323;                   // logo's top-left in the source artwork
const DP = (BOX / CANVAS) * K;                    // source px → dp
// Each piece image = source crop padded by 6 px (and exported at 2×).
const piece = (x0: number, y0: number, w: number, h: number) => ({
  left: (LOGO_X + (x0 - 6 - SRC_L) * K) * (BOX / CANVAS),
  top: (LOGO_Y + (y0 - 6 - SRC_T) * K) * (BOX / CANVAS),
  width: (w + 13) * DP, height: (h + 13) * DP,
});
const MARK = piece(243, 323, 498, 250);
const JOB = piece(274, 602, 189, 83);
const CATCH = piece(476, 602, 291, 83);
const GROW = 1.38;
const RISE = -16;
const LOGO_BOTTOM = (LOGO_Y + 453) * (BOX / CANVAS) - BOX / 2;   // dp below the box centre
const MIN_SHOW_MS = 2000;

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [v] = useState(() => ({
    grow: new Animated.Value(1), rise: new Animated.Value(0), pop: new Animated.Value(1),
    jobX: new Animated.Value(0), catchX: new Animated.Value(0), tagline: new Animated.Value(0), out: new Animated.Value(1),
  }));
  const [introDone, setIntroDone] = useState(false);
  const reduced = useRef(false);
  const shown = useRef(false);

  // Hide the native splash only once this overlay has drawn its (identical) first frame.
  function onLayout() {
    if (shown.current) return;
    shown.current = true;
    SplashScreen.hideAsync().catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then((r) => { reduced.current = r; if (r) still(); else play(); });
  }

  function still() {
    Animated.timing(v.tagline, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    setTimeout(() => setIntroDone(true), 800);
  }

  function play() {
    const apart = 30;
    Animated.parallel([
      // The whole logo grows to a comfortable size and lifts a little.
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.spring(v.grow, { toValue: GROW, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.timing(v.rise, { toValue: RISE, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      // The mark gives a small pop.
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(v.pop, { toValue: 1.07, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(v.pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
      ]),
      // "Job" and "Catch" part, then spring back together with a little overshoot.
      Animated.sequence([
        Animated.delay(320),
        Animated.parallel([
          Animated.timing(v.jobX, { toValue: -apart, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v.catchX, { toValue: apart, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(v.jobX, { toValue: 0, friction: 5, tension: 55, useNativeDriver: true }),
          Animated.spring(v.catchX, { toValue: 0, friction: 5, tension: 55, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(v.tagline, { toValue: 1, duration: 380, delay: 1150, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setIntroDone(true), MIN_SHOW_MS);
  }

  useEffect(() => {
    if (!ready || !introDone) return;
    Animated.timing(v.out, { toValue: 0, duration: reduced.current ? 200 : 380, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(() => onDone());
  }, [ready, introDone, v, onDone]);

  const exitZoom = v.out.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1] });
  const taglineY = Animated.add(v.rise, v.grow.interpolate({ inputRange: [1, GROW], outputRange: [LOGO_BOTTOM, LOGO_BOTTOM * GROW] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: v.out }]} onLayout={onLayout} pointerEvents="none"
      accessible accessibilityLabel="JobCatch is loading">
      <Animated.View style={{ transform: [{ scale: exitZoom }] }}>
        <Animated.View style={[s.box, { transform: [{ translateY: v.rise }, { scale: v.grow }] }]}>
          <Animated.Image source={require("@/assets/images/splash-mark.png")} resizeMode="stretch"
            style={[s.abs, MARK, { transform: [{ scale: v.pop }] }]} />
          <Animated.Image source={require("@/assets/images/splash-job.png")} resizeMode="stretch"
            style={[s.abs, JOB, { transform: [{ translateX: v.jobX }] }]} />
          <Animated.Image source={require("@/assets/images/splash-catch.png")} resizeMode="stretch"
            style={[s.abs, CATCH, { transform: [{ translateX: v.catchX }] }]} />
        </Animated.View>
        <Animated.View style={[s.taglineWrap, { opacity: v.tagline, transform: [{ translateY: taglineY }] }]}>
          <Text style={s.tagline} numberOfLines={1}>Bills · Jobs · Delivery · Artisans</Text>
        </Animated.View>
      </Animated.View>
      <View style={s.footer}><Text style={s.footerText}>A product of Spotlight Investments Limited</Text></View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: colors.white, alignItems: "center", justifyContent: "center", zIndex: 100, elevation: 100 },
  box: { width: BOX, height: BOX },
  abs: { position: "absolute" },
  taglineWrap: { position: "absolute", top: BOX / 2 + 18, left: -60, right: -60, alignItems: "center" },
  tagline: { fontFamily: fonts.medium, fontSize: 12.5, letterSpacing: 1.2, color: colors.muted },
  footer: { position: "absolute", bottom: 42, left: 0, right: 0, alignItems: "center" },
  footerText: { fontFamily: fonts.regular, fontSize: 11, color: colors.faint },
});
