import { useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { ImagePlus, X } from "lucide-react-native";
import { apiError, type PickedFile } from "@/lib/api";
import { useGiftCardTrades, useSellCatalog, useSellRates, useSubmitTrade } from "@/lib/billing";
import { pickImages } from "@/lib/files";
import { formatDateTime, naira } from "@/lib/format";
import { Badge, Button, Card, Input, Notice, Screen, Section, Segmented, Select, Text, colors, radius } from "@/ui";

const code2 = (c: string | { code?: string; name?: string }) => (typeof c === "string" ? c : c.code ?? "");
const sub = (s: string | { slug?: string; name?: string }): [string, string] => (typeof s === "string" ? [s, s] : [s.slug ?? "", s.name ?? s.slug ?? ""]);

export default function SellGiftCard() {
  const catalog = useSellCatalog(true);
  const trades = useGiftCardTrades(true);
  const submit = useSubmitTrade();
  const [slug, setSlug] = useState("");
  const [country, setCountry] = useState("");
  const [cardType, setCardType] = useState<"ecode" | "physical">("ecode");
  const [subType, setSubType] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [images, setImages] = useState<PickedFile[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const brand = catalog.data?.find((b) => b.slug === slug);
  const rates = useSellRates(slug);
  const types = (brand?.card_types ?? []).filter((t) => t === "ecode" || t === "physical") as ("ecode" | "physical")[];
  const ok = !!brand && !!country && !!amount && (cardType === "ecode" ? code.trim().length >= 10 : images.length > 0);

  function send() {
    setError(""); setDone(false);
    submit.mutate({ slug, card_name: brand?.name ?? slug, card_country: country, card_type: cardType, sub_type: subType,
      card_currency: currency, card_amount: amount, code: cardType === "ecode" ? code.trim() : "", images: cardType === "physical" ? images : [] }, {
      onSuccess: () => { setDone(true); setCode(""); setImages([]); setAmount(""); },
      onError: (e) => setError(apiError(e, "We couldn't submit this card.")),
    });
  }

  return (
    <Screen back title="Sell a gift card" subtitle="Get paid into your JobCatch wallet." onRefresh={() => trades.refetch()} refreshing={trades.isRefetching}>
      <Card style={{ gap: 16 }}>
        <Notice>Submit a card for review. Once approved, the payout{rates.data ? ` (less JobCatch's ${rates.data.jobcatch_margin_percent}% fee)` : ""} goes straight to your wallet.</Notice>
        <Select label="Card brand" value={slug} loading={catalog.isLoading} options={(catalog.data ?? []).map((b) => ({ value: b.slug, label: b.name }))}
          onChange={(v) => { setSlug(v); setCountry(""); setSubType(""); }} />
        {brand ? (
          <>
            <Select label="Card country" value={country} options={brand.countries.map((c) => ({ value: code2(c), label: typeof c === "string" ? c : c.name ?? code2(c) }))} onChange={setCountry} />
            {types.length > 1 ? <Segmented value={cardType} onChange={setCardType} options={types.map((t) => ({ value: t, label: t === "ecode" ? "E-code" : "Physical card" }))} /> : null}
            {brand.sub_types.length > 0 && cardType === "physical" ? (
              <Select label="Receipt type" value={subType} options={brand.sub_types.map((s) => { const [v, l] = sub(s); return { value: v, label: l }; })} onChange={setSubType} />
            ) : null}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ width: 96 }}><Input label="Currency" value={currency} maxLength={3} autoCapitalize="characters" onChangeText={(v) => setCurrency(v.toUpperCase())} /></View>
              <View style={{ flex: 1 }}><Input label={`Value (${brand.min_amount}–${brand.max_amount})`} value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" /></View>
            </View>
            {cardType === "ecode" ? (
              <Input label="Redemption code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} />
            ) : (
              <View style={{ gap: 8 }}>
                <Text variant="label">Card photos (1–5)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {images.map((f) => (
                    <View key={f.uri}>
                      <Image source={{ uri: f.uri }} style={{ width: 76, height: 76, borderRadius: radius.md }} />
                      <Pressable onPress={() => setImages(images.filter((x) => x.uri !== f.uri))} style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, padding: 2 }}>
                        <X size={14} color={colors.white} />
                      </Pressable>
                    </View>
                  ))}
                  {images.length < 5 ? (
                    <Pressable onPress={async () => setImages([...images, ...(await pickImages(5 - images.length))].slice(0, 5))}
                      style={{ width: 76, height: 76, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand200, alignItems: "center", justifyContent: "center" }}>
                      <ImagePlus size={22} color={colors.brand500} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          </>
        ) : null}
        {done ? <Notice kind="success">Submitted — we’ll notify you when it’s reviewed.</Notice> : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title="Submit card for review" onPress={send} loading={submit.isPending} disabled={!ok} />
      </Card>
      {trades.data?.length ? (
        <Section title="Your gift card sales">
          <Card style={{ paddingVertical: 4 }}>
            {trades.data.map((t, i) => (
              <View key={t.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" style={{ fontSize: 14 }}>{t.card_name || t.slug} · {t.card_currency} {Number(t.card_amount).toLocaleString()}</Text>
                  <Text variant="caption">{formatDateTime(t.created_at)}{t.rejection_reason ? ` · ${t.rejection_reason}` : ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {t.user_payout || t.expected_payout ? <Text variant="bodyStrong" style={{ fontSize: 14 }}>{naira(t.user_payout ?? t.expected_payout ?? 0, 2)}</Text> : null}
                  <Badge label={t.status_label} status={t.status} />
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
