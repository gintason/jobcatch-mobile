import { useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { QrCode } from "lucide-react-native";
import { PayPanel, useOrder } from "@/components/bills";
import { apiError, type PickedFile } from "@/lib/api";
import { useCatalogue, useRmbInfo, useRmbQuote } from "@/lib/billing";
import { pickImages } from "@/lib/files";
import { naira } from "@/lib/format";
import { Card, Input, Notice, Screen, Select, Text, colors, radius } from "@/ui";

export default function PayChina() {
  const { data: catalogue } = useCatalogue();
  const info = useRmbInfo(true);
  const [channel, setChannel] = useState("");
  const [accountType, setAccountType] = useState("");
  const [rmb, setRmb] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [qr, setQr] = useState<PickedFile | null>(null);
  const [method, setMethod] = useState<"wallet" | "card">("wallet");
  const { place, pending, error } = useOrder();
  const ch = info.data?.channels.find((c) => c.channel === channel);
  const quote = useRmbQuote(channel, accountType, rmb);
  const isBank = channel === "bank";
  const face = quote.data ? Number(quote.data.price_ngn) : 0;
  const fee = Number(catalogue?.fees?.rmb ?? 0);
  const ready = !!quote.data && name.trim().length > 1 && purpose.trim().length >= 5 && (isBank ? !!bank && account.length >= 8 : !!qr);
  const lim = info.data?.limits;
  return (
    <Screen back title="Pay China (¥)" subtitle="Pay suppliers, schools or anyone in China in yuan.">
      <Card style={{ gap: 16 }}>
        <Notice>Funds usually arrive within 5–30 minutes.</Notice>
        <Select label="Pay to" value={channel} loading={info.isLoading}
          options={(info.data?.channels ?? []).filter((c) => c.is_available).map((c) => ({ value: c.channel, label: c.name }))}
          onChange={(v) => { setChannel(v); setAccountType(""); }} />
        {ch && !isBank ? (
          <Select label="Recipient's account" value={accountType} options={ch.account_types.filter((a) => a.is_available).map((a) => ({ value: a.type, label: a.name }))} onChange={setAccountType} />
        ) : null}
        <Input label={lim?.min_rmb ? `Amount in yuan (¥${lim.min_rmb.toLocaleString()}–¥${(lim.max_rmb ?? 0).toLocaleString()})` : "Amount in yuan (¥)"}
          value={rmb} onChangeText={(v) => setRmb(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" />
        {quote.data ? <Text variant="small">Rate ₦{Number(quote.data.rate).toLocaleString()} / ¥1 → <Text variant="bodyStrong">{naira(quote.data.price_ngn, 2)}</Text></Text> : null}
        {quote.isError ? <Notice kind="error">{apiError(quote.error)}</Notice> : null}
        <Input label="Recipient's full name" value={name} onChangeText={setName} />
        {isBank ? (
          <>
            <Input label="Chinese bank name" value={bank} onChangeText={setBank} />
            <Input label="Bank account number" value={account} onChangeText={(v) => setAccount(v.replace(/\D/g, ""))} keyboardType="number-pad" />
          </>
        ) : channel ? (
          <>
            <Text variant="label">Recipient’s receive QR code</Text>
            <Pressable onPress={async () => setQr((await pickImages(1))[0] ?? qr)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand200 }}>
              {qr ? <Image source={{ uri: qr.uri }} style={{ width: 56, height: 56, borderRadius: 8 }} /> : <QrCode size={28} color={colors.brand500} />}
              <Text variant="small" style={{ flex: 1 }}>{qr ? "QR code attached — tap to change" : "Upload a screenshot of their QR code"}</Text>
            </Pressable>
            <Input label={`${ch?.name ?? ""} ID (optional)`} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
          </>
        ) : null}
        <Input label="What is this payment for?" value={purpose} onChangeText={setPurpose} multiline maxLength={1000} placeholder="e.g. Invoice #2026-045 for phone parts" />
        <View />
        <PayPanel amount={face} fee={fee} ready={ready} pending={pending} error={error} method={method} setMethod={setMethod}
          onPay={() => place({ service: "rmb", provider: "", customer_id: "", channel, account_type: isBank ? "" : accountType, rmb_amount: rmb,
            recipient_name: name.trim(), recipient_identifier: isBank ? "" : identifier, recipient_bank_name: isBank ? bank : "",
            recipient_bank_account_number: isBank ? account : "", description: purpose.trim(), payment_method: method, qr: isBank ? null : qr })} />
      </Card>
    </Screen>
  );
}
