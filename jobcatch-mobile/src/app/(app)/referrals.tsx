import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Check, Copy, Gift, Share2, ShoppingBag, UserPlus, Wallet } from "lucide-react-native";
import { apiError } from "@/lib/api";
import { formatDate, naira } from "@/lib/format";
import { useApplyReferral, useReferrals } from "@/lib/referrals";
import { Badge, Button, Card, Empty, Input, Loading, Notice, Screen, Section, Text, colors, fonts, radius } from "@/ui";

export default function Referrals() {
  const { data: r, isLoading, refetch, isRefetching } = useReferrals();
  if (isLoading || !r) return <Screen back title="Invite & earn"><Loading /></Screen>;
  const reward = naira(r.reward);
  const message = `Join me on JobCatch — pay bills, send packages, find jobs and hire trusted artisans in one app. Sign up with my code ${r.code}: ${r.link}`;

  return (
    <Screen back title="Invite & earn" onRefresh={refetch} refreshing={isRefetching}>
      <LinearGradient colors={[colors.brand900, colors.brand700, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20, gap: 10, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Gift size={16} color={colors.brand200} /><Text style={{ color: colors.brand200, fontFamily: fonts.semibold, fontSize: 13 }}>Invite & earn</Text></View>
        <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 24, lineHeight: 30 }}>Earn {reward} for every friend who joins</Text>
        <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 20 }}>
          When a friend signs up with your code and makes a first purchase of {naira(r.min_spend)} or more, {reward} lands in your wallet
          {Number(r.new_user_bonus) > 0 ? ` — and they get ${naira(r.new_user_bonus)} too` : ""}.
        </Text>
        {!r.enabled ? <Text style={{ color: colors.white, fontSize: 13 }}>Referral rewards are paused right now.</Text> : null}
        <CopyRow label="Your code" value={r.code} big />
        <CopyRow label="Invite link" value={r.link} />
        <Button kind="light" title="Share invite" icon={<Share2 size={18} color={colors.brand800} />} onPress={() => Share.share({ message })} />
      </LinearGradient>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {[["Invited", String(r.stats.invited)], ["Rewarded", String(r.stats.rewarded)], ["Earned", naira(r.stats.earned)]].map(([l, v]) => (
          <Card key={l} style={{ flex: 1, alignItems: "center", paddingVertical: 14 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.display, fontSize: 20, color: colors.brand900 }}>{v}</Text>
            <Text variant="caption">{l}</Text>
          </Card>
        ))}
      </View>

      <Section title="How it works">
        <Card style={{ gap: 12 }}>
          {[[Share2, "Share your code or link with friends."], [UserPlus, "They sign up with it (email or Google)."],
            [ShoppingBag, `They make a first purchase of ${naira(r.min_spend)}+ or book a delivery.`], [Wallet, `${reward} is added to your wallet.`]].map(([Icon, t], i) => {
            const I = Icon as typeof Gift;
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}><I size={16} color={colors.brand600} /></View>
                <Text variant="small" style={{ flex: 1, color: colors.ink }}>{t as string}</Text>
              </View>
            );
          })}
          <Text variant="caption">Rewards are wallet credit for bills and services. One reward per new account; fake or duplicate accounts aren’t eligible.</Text>
        </Card>
      </Section>

      <Section title="Your invites">
        <Card style={{ paddingVertical: 4 }}>
          {r.referrals.length ? r.referrals.map((x, i) => (
            <View key={x.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" style={{ fontSize: 14 }}>{x.name}</Text>
                <Text variant="caption">Joined {formatDate(x.joined_at)}{x.note ? ` · ${x.note}` : ""}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {x.status === "rewarded" ? <Text variant="bodyStrong" style={{ fontSize: 14 }} color={colors.success}>+{naira(x.reward)}</Text> : null}
                <Badge label={x.status_label} status={x.status === "rewarded" ? "completed" : x.status === "pending" ? "pending" : "cancelled"} />
              </View>
            </View>
          )) : <Empty icon={<UserPlus size={26} color={colors.brand500} />} title="No invites yet" body="Share your code to get started." />}
        </Card>
      </Section>

      {r.referred_by ? <Notice kind="success">You joined with an invite from {r.referred_by}.</Notice> : r.can_apply ? <ApplyCode days={r.apply_days} /> : null}
    </Screen>
  );
}

function CopyRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${label}`}
      onPress={async () => { await Clipboard.setStringAsync(value); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11.5 }}>{label}</Text>
        <Text numberOfLines={1} style={{ color: colors.white, fontFamily: big ? fonts.display : fonts.semibold, fontSize: big ? 24 : 13.5, letterSpacing: big ? 4 : 0 }}>{value}</Text>
      </View>
      {copied ? <Check size={18} color={colors.white} /> : <Copy size={18} color={colors.white} />}
    </Pressable>
  );
}

function ApplyCode({ days }: { days: number }) {
  const apply = useApplyReferral();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  return (
    <Card style={{ gap: 10 }}>
      <Text variant="h3">Were you invited?</Text>
      <Text variant="small">Add your friend’s code within {days} days of joining, before your first purchase.</Text>
      <Input value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="Friend’s code" autoCapitalize="characters" maxLength={12} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title="Add code" size="md" loading={apply.isPending} disabled={code.length < 4}
        onPress={() => { setError(""); apply.mutate(code, { onError: (e) => setError(apiError(e)) }); }} />
    </Card>
  );
}
