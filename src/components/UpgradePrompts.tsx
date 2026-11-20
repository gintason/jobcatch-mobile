/**
 * Upgrade prompts and visibility plans — the mobile version of the web's
 * UpgradePrompts + /checkout/pro|premium. Prompt copy is managed in Django admin.
 */
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Crown, ShieldCheck, Sparkles, X, Zap } from "lucide-react-native";
import { apiError } from "@/lib/api";
import { openCheckout, openLink } from "@/lib/checkout";
import { WEB_URL } from "@/lib/config";
import { formatDate, naira } from "@/lib/format";
import { PLANS, startSubscription, trackPrompt, useMySubscriptions, usePrompts, type UpgradePrompt } from "@/lib/roles";
import { Button, Card, Notice, Text, colors, fonts, radius } from "@/ui";

type Plan = keyof typeof PLANS;

/** Where a prompt's CTA leads: an in-app plan checkout, a dashboard tab, or the website. */
export function UpgradePrompts({ audience, onTab, onPlan }: {
  audience: "artisan" | "employer" | "job_seeker"; onTab?: (tab: string) => void; onPlan?: (plan: Plan) => void;
}) {
  const prompts = usePrompts(audience);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(true);
  const modal = useMemo(() => prompts.data?.find((p) => p.style === "modal"), [prompts.data]);
  const banner = (prompts.data ?? []).find((p) => p.style === "banner" && !hidden.has(p.key));
  useEffect(() => { if (modal) trackPrompt(modal.key, "seen"); }, [modal]);

  function go(p: UpgradePrompt) {
    trackPrompt(p.key, "click");
    setModalOpen(false);
    const plan = /\/checkout\/(pro|premium)\b/.exec(p.cta_url)?.[1] as Plan | undefined;
    const tab = /[?&]tab=([\w-]+)/.exec(p.cta_url)?.[1];
    if (plan && onPlan) onPlan(plan);
    else if (tab && onTab) onTab(tab);
    else openLink(p.cta_url.startsWith("http") ? p.cta_url : `${WEB_URL}${p.cta_url}`);
  }
  function dismiss(p: UpgradePrompt) {
    trackPrompt(p.key, "dismiss");
    setHidden((s) => new Set(s).add(p.key));
  }

  return (
    <>
      {banner ? (
        <LinearGradient colors={[colors.brand900, colors.brand600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.banner}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Sparkles size={22} color={colors.white} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.white, fontFamily: fonts.displayBold, fontSize: 15 }}>{banner.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 18 }}>{banner.body}</Text>
            </View>
            <Pressable onPress={() => dismiss(banner)} hitSlop={10} accessibilityLabel="Dismiss"><X size={18} color={colors.white} /></Pressable>
          </View>
          <Button title={banner.cta_label} kind="light" size="md" onPress={() => go(banner)} />
        </LinearGradient>
      ) : null}
      {modal && modalOpen ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => { trackPrompt(modal.key, "dismiss"); setModalOpen(false); }}>
          <View style={s.backdrop}>
            <View style={s.sheet}>
              <LinearGradient colors={[colors.brand900, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22, gap: 6 }}>
                <Pressable onPress={() => { trackPrompt(modal.key, "dismiss"); setModalOpen(false); }} hitSlop={10} style={{ position: "absolute", right: 14, top: 14 }} accessibilityLabel="Close">
                  <X size={20} color={colors.white} />
                </Pressable>
                <Sparkles size={30} color={colors.white} />
                <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 20 }}>{modal.title}</Text>
                <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 20 }}>{modal.body}</Text>
              </LinearGradient>
              <View style={{ padding: 22, gap: 10 }}>
                {modal.highlights.map((h) => (
                  <View key={h} style={{ flexDirection: "row", gap: 8 }}><Check size={16} color={colors.brand500} style={{ marginTop: 2 }} /><Text variant="small" style={{ flex: 1 }}>{h}</Text></View>
                ))}
                <Button title={modal.cta_label} onPress={() => go(modal)} style={{ marginTop: 6 }} />
                <Text variant="small" center color={colors.muted} onPress={() => { trackPrompt(modal.key, "dismiss"); setModalOpen(false); }}>Not now</Text>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

/** Current visibility plan + Pro / Premium checkout (30 days, one-off payment). */
export function VisibilityPlans({ highlight }: { highlight?: Plan | null }) {
  const subs = useMySubscriptions();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const active = subs.data?.find((x) => x.is_active && x.plan !== "free");

  async function buy(plan: Plan) {
    setError(""); setBusy(plan);
    try {
      const d = await startSubscription(plan);
      await openCheckout(d.authorization_url, d.reference);
      subs.refetch();
    } catch (e) { setError(apiError(e, "Could not start checkout.")); } finally { setBusy(null); }
  }

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">Boost your visibility</Text>
      {active ? (
        <Notice kind="success">You’re on the {PLANS[active.plan as Plan]?.label ?? active.plan} plan{active.expires_at ? ` until ${formatDate(active.expires_at)}` : ""}. Paying again adds another 30 days.</Notice>
      ) : <Text variant="small">Get booked more: paid plans place you higher in search and on the home page.</Text>}
      {(Object.keys(PLANS) as Plan[]).map((p) => {
        const info = PLANS[p];
        const Icon = p === "premium" ? Crown : Zap;
        return (
          <View key={p} style={[s.plan, highlight === p && { borderColor: colors.brand500, backgroundColor: colors.brand50 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon size={18} color={p === "premium" ? colors.amber : colors.brand500} />
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: colors.brand900, flex: 1 }}>{info.label} artisan plan</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.brand900 }}>{naira(info.price)}<Text variant="caption"> / 30 days</Text></Text>
            </View>
            <Text variant="small">{info.blurb}</Text>
            <Button title={`Pay ${naira(info.price)}`} size="md" kind={p === "premium" ? "primary" : "secondary"} loading={busy === p} disabled={busy !== null} onPress={() => buy(p)} />
          </View>
        );
      })}
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
        <ShieldCheck size={14} color={colors.muted} />
        <Text variant="caption" style={{ flex: 1 }}>Visibility plans never buy the Verified badge — that comes from verification.</Text>
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  banner: { borderRadius: radius.lg, padding: 16, gap: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(2,29,82,0.5)", justifyContent: "flex-end", padding: 16 },
  sheet: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: "hidden", marginBottom: 12 },
  plan: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, gap: 8 },
});
