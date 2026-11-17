import { useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { CheckCircle2, Clock, Copy, RefreshCw, Share2, XCircle } from "lucide-react-native";
import { serviceMeta } from "@/components/bills";
import { apiError } from "@/lib/api";
import { PENDING_BILL, useBillOrder, useRequeryOrder, type BillOrder } from "@/lib/billing";
import { API_URL } from "@/lib/config";
import { formatDateTime, naira } from "@/lib/format";
import { tokens } from "@/lib/tokens";
import { Badge, Button, Card, Divider, Loading, Notice, Screen, Text, colors, fonts, radius } from "@/ui";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { billMessage } from "@/lib/support";

export default function BillReceipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: o, isLoading, refetch, isRefetching } = useBillOrder(id);
  const requery = useRequeryOrder();
  const [error, setError] = useState("");
  if (isLoading) return <Screen back title="Receipt"><Loading /></Screen>;
  if (!o) return <Screen back title="Receipt"><Notice kind="error">We couldn’t find this receipt.</Notice></Screen>;

  const pending = PENDING_BILL.includes(o.status);
  const ok = o.status === "successful";
  const meta = serviceMeta(o.service);
  const StatusIcon = ok ? CheckCircle2 : pending ? Clock : XCircle;
  const statusColor = ok ? colors.success : pending ? colors.brand500 : o.status === "refunded" ? colors.gray : colors.danger;

  return (
    <Screen back title="Receipt" onRefresh={refetch} refreshing={isRefetching}
      right={<Pressable hitSlop={10} onPress={() => Share.share({ message: shareText(o) })} accessibilityLabel="Share receipt"><Share2 size={22} color={colors.brand700} /></Pressable>}>
      <Card style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
        <View style={[s.statusRing, { backgroundColor: `${statusColor}14` }]}><StatusIcon size={34} color={statusColor} /></View>
        <Text variant="caption">{meta.label}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.brand900 }}>{naira(o.total, 2)}</Text>
        <Badge label={o.status_label} status={o.status} />
        {pending ? <Text variant="small" center>We’re confirming with the provider. This page updates by itself.</Text> : null}
        {o.provider_message && !ok ? <Text variant="small" center>{o.provider_message}</Text> : null}
      </Card>

      {o.token ? (
        <Card style={{ gap: 8, backgroundColor: colors.brand900, borderColor: colors.brand900 }}>
          <Text style={{ color: colors.brand200, fontFamily: fonts.medium, fontSize: 13 }}>Electricity token{o.units ? ` · ${o.units} units` : ""}</Text>
          <CopyLine value={o.token} light big />
        </Card>
      ) : null}

      {o.epins?.length ? (
        <Card style={{ gap: 10 }}>
          <Text variant="h3">{o.service === "education" ? "Exam PINs" : o.service === "giftcard" ? "Gift card codes" : "Recharge PINs"}</Text>
          {o.epins.map((e, i) => (
            <View key={`${e.pin}-${i}`} style={s.pin}>
              <CopyLine value={e.pin} />
              {e.serial ? <Text variant="caption">{o.service === "giftcard" ? "PIN" : "S/N"} {e.serial}</Text> : null}
              {e.instruction ? <Text variant="caption">{e.instruction}</Text> : null}
            </View>
          ))}
        </Card>
      ) : null}

      {o.epin_packs?.length ? (
        <Card style={{ gap: 12 }}>
          <Text variant="h3">Voucher sheets</Text>
          {o.epin_packs.map((p) => <EpinPack key={p.index} path={p.image_path} label={`${p.network.toUpperCase()} ${naira(p.denomination)} × ${p.pieces_count}`} />)}
          <Text variant="caption">Long-press a sheet to save it, or print it from jobcatchonline.com.</Text>
        </Card>
      ) : null}

      <Card style={{ gap: 10 }}>
        <Detail label="Receipt no." value={o.receipt_number} />
        <Detail label="Service" value={`${o.service_label}${o.provider ? ` · ${o.provider.toUpperCase()}` : ""}`} />
        {o.customer_id ? <Detail label="Recipient" value={o.customer_id} /> : null}
        {o.customer_name ? <Detail label="Name" value={o.customer_name} /> : null}
        {o.variation_label ? <Detail label="Plan" value={o.variation_label} /> : null}
        {o.quantity > 1 ? <Detail label="Quantity" value={String(o.quantity)} /> : null}
        {o.service === "rmb" ? (
          <>
            {o.details.rmb_amount ? <Detail label="Amount" value={`¥${Number(o.details.rmb_amount).toLocaleString()}`} /> : null}
            {o.details.customer_rate ? <Detail label="Rate" value={`₦${Number(o.details.customer_rate).toLocaleString()} / ¥1`} /> : null}
            {o.details.recipient_name ? <Detail label="Paid to" value={o.details.recipient_name} /> : null}
            {o.details.description ? <Detail label="For" value={o.details.description} /> : null}
          </>
        ) : null}
        <Divider />
        <Detail label="Amount" value={naira(o.amount, 2)} />
        {Number(o.fee) > 0 ? <Detail label="Service fee" value={naira(o.fee, 2)} /> : null}
        <Detail label="Paid with" value={o.payment_method === "wallet" ? "Wallet" : "Card / transfer"} />
        <Detail label="Date" value={formatDateTime(o.created_at)} />
        {o.refunded_at ? <Detail label="Refunded" value={formatDateTime(o.refunded_at)} /> : null}
      </Card>

      {error ? <Notice kind="error">{error}</Notice> : null}
      {pending && o.status !== "awaiting_payment" ? (
        <Button title="Check status now" kind="secondary" icon={<RefreshCw size={16} color={colors.brand600} />} loading={requery.isPending}
          onPress={() => { setError(""); requery.mutate(o.id, { onError: (e) => setError(apiError(e)) }); }} />
      ) : null}
      <WhatsAppButton message={billMessage(o)} hint="Airtime or data not received? Token missing? Message us on WhatsApp — your receipt details are added for you." />
      <Button title="Back to bills" kind="ghost" onPress={() => router.replace("/bills")} />
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text variant="small">{label}</Text>
      <Text variant="bodyStrong" style={{ fontSize: 14, flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function CopyLine({ value, light, big }: { value: string; light?: boolean; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable onPress={async () => { await Clipboard.setStringAsync(value); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityLabel={`Copy ${value}`}>
      <Text selectable style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: big ? 22 : 16, letterSpacing: 1.5, color: light ? colors.white : colors.brand900 }}>{value}</Text>
      {copied ? <Text variant="caption" color={light ? colors.brand200 : colors.success}>Copied</Text> : <Copy size={18} color={light ? colors.brand200 : colors.brand500} />}
    </Pressable>
  );
}

function EpinPack({ path, label }: { path: string; label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <Image source={{ uri: `${API_URL}${path}`, headers: { Authorization: `Bearer ${tokens.access() ?? ""}` } }}
        style={{ width: "100%", aspectRatio: 0.72, borderRadius: radius.md, backgroundColor: colors.mist }} contentFit="contain" transition={200} />
    </View>
  );
}

function shareText(o: BillOrder) {
  return [`JobCatch receipt ${o.receipt_number}`, `${o.service_label}${o.provider ? ` (${o.provider.toUpperCase()})` : ""}`,
    o.customer_id ? `To: ${o.customer_id}` : "", `Amount: ${naira(o.total, 2)}`, `Status: ${o.status_label}`, o.token ? `Token: ${o.token}` : "",
    formatDateTime(o.created_at)].filter(Boolean).join("\n");
}

const s = StyleSheet.create({
  statusRing: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  pin: { padding: 12, borderRadius: radius.md, backgroundColor: colors.mist, gap: 4 },
});
