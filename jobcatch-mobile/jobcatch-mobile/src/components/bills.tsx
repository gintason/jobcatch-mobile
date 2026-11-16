import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronRight, Dices, Gift, GraduationCap, HandCoins, JapaneseYen,
  Lightbulb, Lock, Plus, Send, Smartphone, Ticket, Tv, Wifi, type LucideIcon,
} from "lucide-react-native";
import { apiError } from "@/lib/api";
import { useCatalogue, useCreateBillOrder, useWallet, type BillOrder, type Catalogue, type CustomerInfo, type OrderPayload } from "@/lib/billing";
import { openCheckout } from "@/lib/checkout";
import { formatDateTime, naira } from "@/lib/format";
import { Badge, Button, Notice, Text, colors, fonts, radius, shadow } from "@/ui";

export interface ServiceMeta { key: string; label: string; short: string; icon: LucideIcon; tint: string; href: Href; enabled: (c?: Catalogue) => boolean }

export const BILL_SERVICES: ServiceMeta[] = [
  { key: "airtime", label: "Airtime", short: "Airtime", icon: Smartphone, tint: "#0160de", href: "/pay/airtime", enabled: () => true },
  { key: "data", label: "Data bundles", short: "Data", icon: Wifi, tint: "#0891b2", href: "/pay/data", enabled: () => true },
  { key: "electricity", label: "Electricity", short: "Power", icon: Lightbulb, tint: "#d97706", href: "/pay/electricity", enabled: () => true },
  { key: "tv", label: "Cable TV", short: "TV", icon: Tv, tint: "#7c3aed", href: "/pay/tv", enabled: () => true },
  { key: "betting", label: "Betting wallet", short: "Betting", icon: Dices, tint: "#16a34a", href: "/pay/betting", enabled: (c) => !!c?.betting_enabled },
  { key: "education", label: "Exam PINs", short: "Exam PINs", icon: GraduationCap, tint: "#be185d", href: "/pay/education", enabled: (c) => !!c?.education_enabled },
  { key: "epins", label: "Recharge PINs", short: "ePINs", icon: Ticket, tint: "#033a94", href: "/pay/epins", enabled: () => true },
  { key: "giftcard", label: "Buy gift cards", short: "Gift cards", icon: Gift, tint: "#e11d48", href: "/pay/giftcard", enabled: (c) => !!c?.giftcard_buy_enabled },
  { key: "sell", label: "Sell gift card", short: "Sell card", icon: HandCoins, tint: "#059669", href: "/pay/sell-giftcard", enabled: (c) => !!c?.giftcard_sell_enabled },
  { key: "rmb", label: "Pay China (¥)", short: "Pay China", icon: JapaneseYen, tint: "#dc2626", href: "/pay/rmb", enabled: (c) => !!c?.rmb_enabled },
];

export const serviceMeta = (key: string) => BILL_SERVICES.find((s) => s.key === key) ?? BILL_SERVICES[0];

export function ServiceTile({ meta, compact }: { meta: ServiceMeta; compact?: boolean }) {
  const Icon = meta.icon;
  return (
    <Pressable onPress={() => router.push(meta.href)} accessibilityRole="button" accessibilityLabel={meta.label}
      style={({ pressed }) => [st.tile, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]}>
      <View style={[st.tileIcon, { backgroundColor: `${meta.tint}14` }]}><Icon size={compact ? 20 : 22} color={meta.tint} /></View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.brand900, textAlign: "center" }}>{meta.short}</Text>
    </Pressable>
  );
}

export function ServiceGrid({ items }: { items: ServiceMeta[] }) {
  return <View style={st.grid}>{items.map((m) => <View key={m.key} style={{ width: "25%", padding: 4 }}><ServiceTile meta={m} /></View>)}</View>;
}

export function WalletCard({ compact, actions = true }: { compact?: boolean; actions?: boolean }) {
  const { data, isLoading } = useWallet();
  return (
    <LinearGradient colors={[colors.brand900, colors.brand700, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.wallet, shadow.lift]}>
      <View style={st.walletGlow} />
      <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: fonts.medium, fontSize: 13 }}>Wallet balance</Text>
      <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: compact ? 28 : 32, letterSpacing: -0.5, marginTop: 2 }}>
        {isLoading ? "₦ ···" : naira(data?.balance ?? 0, 2)}
      </Text>
      {actions ? <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Pressable onPress={() => router.push("/wallet?fund=1")} style={st.walletBtn} accessibilityRole="button">
          <Plus size={16} color={colors.brand800} /><Text style={{ fontFamily: fonts.semibold, color: colors.brand800, fontSize: 13.5 }}>Add money</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/transfers")} style={[st.walletBtn, { backgroundColor: "rgba(255,255,255,0.14)" }]} accessibilityRole="button">
          <Send size={15} color={colors.white} /><Text style={{ fontFamily: fonts.semibold, color: colors.white, fontSize: 13.5 }}>Send</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/wallet")} style={[st.walletBtn, { backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 12 }]} accessibilityRole="button" accessibilityLabel="Wallet history">
          <Text style={{ fontFamily: fonts.semibold, color: colors.white, fontSize: 13.5 }}>History</Text><ChevronRight size={16} color={colors.white} />
        </Pressable>
      </View> : null}
    </LinearGradient>
  );
}

/** Wallet / card choice, total breakdown and submit. Shared by every bill form. */
export function PayPanel({ amount, fee = 0, ready, pending, error, method, setMethod, onPay, note }: {
  amount: number; fee?: number; ready: boolean; pending: boolean; error: string;
  method: "wallet" | "card"; setMethod: (m: "wallet" | "card") => void; onPay: () => void; note?: ReactNode;
}) {
  const { data: wallet } = useWallet();
  const { data: catalogue } = useCatalogue();
  const balance = Number(wallet?.balance ?? 0);
  const total = amount + fee;
  const short = method === "wallet" && total > 0 && balance < total;
  const gateway = catalogue?.gateway === "flutterwave" ? "Flutterwave" : "Paystack";
  return (
    <View style={{ gap: 12 }}>
      <Text variant="label">Pay with</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(["wallet", "card"] as const).map((m) => {
          const on = method === m;
          return (
            <Pressable key={m} onPress={() => setMethod(m)} style={[st.method, on && st.methodOn]} accessibilityState={{ selected: on }}>
              <Text variant="bodyStrong" style={{ fontSize: 14 }}>{m === "wallet" ? "Wallet" : "Card / transfer"}</Text>
              <Text variant="caption">{m === "wallet" ? `Balance ${naira(balance, 2)}` : "Pay directly"}</Text>
            </Pressable>
          );
        })}
      </View>
      {method === "card" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Lock size={13} color={colors.faint} /><Text variant="caption">Secure checkout by {gateway}</Text></View>
      ) : null}
      {short ? <Notice kind="warning">Not enough in your wallet — add money or pay by card.</Notice> : null}
      {note}
      {amount > 0 ? (
        <View style={st.summary}>
          <SumRow label="Amount" value={naira(amount, 2)} />
          {fee > 0 ? <SumRow label="Service fee" value={naira(fee, 2)} /> : null}
          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
          <SumRow label="Total" value={naira(total, 2)} strong />
        </View>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title={amount > 0 ? `Pay ${naira(total, 2)}` : "Pay"} onPress={onPay} loading={pending} disabled={!ready || short} />
    </View>
  );
}

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text variant={strong ? "bodyStrong" : "small"}>{label}</Text>
      <Text variant={strong ? "bodyStrong" : "small"} color={strong ? colors.brand900 : colors.ink}>{value}</Text>
    </View>
  );
}

/** Place a bill order; card orders open checkout, then the receipt. */
export function useOrder() {
  const create = useCreateBillOrder();
  const [error, setError] = useState("");
  function place(payload: OrderPayload) {
    setError("");
    create.mutate(payload, {
      onSuccess: async (o: BillOrder) => {
        if (o.authorization_url) await openCheckout(o.authorization_url, o.payment_reference);
        router.replace(`/receipt/${o.id}`);
      },
      onError: (e) => setError(apiError(e, "Purchase failed. You have not been charged.")),
    });
  }
  return { place, pending: create.isPending, error, setError };
}

export function VerifiedBox({ info }: { info: CustomerInfo }) {
  const lines = [
    info.customer_address,
    info.current_bouquet ? `Current: ${info.current_bouquet}` : "",
    info.min_purchase_amount ? `Minimum purchase ${naira(info.min_purchase_amount)}` : "",
    info.customer_username ? `Username: ${info.customer_username}` : "",
    info.minimum_amount ? `Fund between ${naira(info.minimum_amount)} and ${naira(info.maximum_amount ?? 100000)}` : "",
  ].filter(Boolean);
  return (
    <View style={st.verified}>
      <CheckCircle2 size={18} color={colors.success} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={colors.success}>{info.customer_name || "Verified"}</Text>
        {lines.map((l) => <Text key={l} variant="small" color={colors.success}>{l}</Text>)}
      </View>
    </View>
  );
}

export function OrderRow({ o }: { o: BillOrder }) {
  const meta = serviceMeta(o.service === "giftcard" ? "giftcard" : o.service);
  const Icon = meta.icon;
  return (
    <Pressable onPress={() => router.push(`/receipt/${o.id}`)} style={({ pressed }) => [st.row, pressed && { backgroundColor: colors.mist }]}>
      <View style={[st.rowIcon, { backgroundColor: `${meta.tint}14` }]}><Icon size={18} color={meta.tint} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>{o.service_label}{o.provider ? ` · ${o.provider.toUpperCase()}` : ""}</Text>
        <Text variant="caption" numberOfLines={1}>{o.customer_id || o.variation_label || o.service_label} · {formatDateTime(o.created_at)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text variant="bodyStrong" style={{ fontSize: 14 }}>{naira(o.total, 2)}</Text>
        <Badge label={o.status_label} status={o.status} />
      </View>
    </Pressable>
  );
}

export function TxnIcon({ kind }: { kind: "credit" | "debit" }) {
  const credit = kind === "credit";
  return (
    <View style={[st.rowIcon, { backgroundColor: credit ? colors.successBg : colors.brand50 }]}>
      {credit ? <ArrowDownLeft size={18} color={colors.success} /> : <ArrowUpRight size={18} color={colors.brand600} />}
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  tile: { alignItems: "center", gap: 8, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  wallet: { borderRadius: radius.xl, padding: 20, overflow: "hidden" },
  walletGlow: { position: "absolute", right: -40, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)" },
  walletBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  method: { flex: 1, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, gap: 2 },
  methodOn: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  summary: { padding: 14, borderRadius: radius.md, backgroundColor: colors.mist, gap: 4 },
  verified: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.successBg },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
