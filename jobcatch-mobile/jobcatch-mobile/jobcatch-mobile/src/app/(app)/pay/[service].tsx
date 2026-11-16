import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PayPanel, VerifiedBox, serviceMeta, useOrder } from "@/components/bills";
import { apiError } from "@/lib/api";
import { useCatalogue, useEpinStock, useVariations, useVerifyCustomer, type BillService, type CustomerInfo } from "@/lib/billing";
import { naira } from "@/lib/format";
import { Button, Card, Chips, Input, Notice, Screen, Segmented, Select, Text, colors } from "@/ui";

type Classic = "airtime" | "data" | "electricity" | "tv" | "betting" | "epins";

export default function PayService() {
  const { service = "airtime" } = useLocalSearchParams<{ service: string }>();
  const meta = serviceMeta(service);
  return (
    <Screen back title={meta.label}>
      {service === "education" ? <EducationForm /> : <ClassicForm key={service} service={service as Classic} />}
    </Screen>
  );
}

const QUICK_AMOUNTS: Partial<Record<Classic, number[]>> = {
  airtime: [100, 200, 500, 1000, 2000, 5000], electricity: [2000, 5000, 10000, 20000], betting: [500, 1000, 2000, 5000],
};

function ClassicForm({ service }: { service: Classic }) {
  const { data: catalogue, isLoading } = useCatalogue();
  const verify = useVerifyCustomer();
  const { place, pending, error, setError } = useOrder();
  const [provider, setProvider] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [variation, setVariation] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [subType, setSubType] = useState<"renew" | "change">("renew");
  const [pinValue, setPinValue] = useState("500");
  const [quantity, setQuantity] = useState("1");
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [method, setMethod] = useState<"wallet" | "card">("wallet");
  const stock = useEpinStock(service === "epins");

  const plansKind = service === "data" ? "data" : service === "tv" ? "tv" : null;
  const plans = useVariations((plansKind ?? "data") as "data" | "tv", plansKind ? provider : "");
  const plan = plans.data?.find((p) => String(p.variation_id) === variation);
  const needsVerify = service === "electricity" || service === "tv" || service === "betting";
  const needsId = service !== "epins";
  const decoder = service === "tv" && ["dstv", "gotv"].includes(provider);
  const renewing = decoder && subType === "renew";
  const packSize = catalogue?.epin_pack_size ?? 10;
  const maxQty = catalogue?.epin_max_quantity ?? 5;
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const face = service === "epins" ? Number(pinValue) * packSize * qty
    : plan && !renewing ? Number(plan.price)
      : renewing && customer?.renewal_amount ? Number(customer.renewal_amount) : Number(amount || 0);
  const fee = Number(catalogue?.fees?.[service as BillService] ?? 0);
  // Packs in stock for a network/value; undefined when the biller didn't report stock.
  const left = (v: string | number) => (service === "epins" && provider && stock.data?.known ? stock.data.stock[provider]?.[String(v)] : undefined);
  const pinsLeft = left(pinValue);
  const ready = !!provider && (!needsId || !!customerId) && (!needsVerify || !!customer) && face > 0
    && (service !== "epins" || (qty >= 1 && qty <= maxQty && (pinsLeft === undefined || qty <= pinsLeft)));

  const reset = () => { setCustomer(null); setError(""); };
  const providerLabel = service === "electricity" ? "Electricity company" : service === "tv" ? "TV provider" : service === "betting" ? "Betting company" : "Network";
  const idLabel = service === "electricity" ? "Meter / account number" : service === "tv" ? "Smartcard / IUC number" : service === "betting" ? "Betting account ID" : "Phone number";

  function lookup() {
    setError("");
    verify.mutate({ service: service as "electricity" | "tv" | "betting", provider, customer_id: customerId.trim(), meter_type: service === "electricity" ? meterType : undefined },
      { onSuccess: setCustomer, onError: (e) => setError(apiError(e, "We couldn't verify that number.")) });
  }
  function pay() {
    const p: Record<string, string | number | undefined> = { provider, customer_id: customerId.replace(/\s/g, "") };
    if (service === "airtime" || service === "electricity" || service === "betting") p.amount = amount;
    if (service === "betting") p.customer_name = customer?.customer_name;
    if (service === "epins") { p.variation_id = pinValue; p.quantity = qty; p.customer_id = ""; }
    if (service === "data" || service === "tv") p.variation_id = variation;
    if (service === "electricity") { p.variation_id = meterType; p.customer_name = customer?.customer_name; }
    if (service === "tv" && decoder) p.subscription_type = subType;
    place({ ...p, service, payment_method: method });
  }

  return (
    <Card style={{ gap: 16 }}>
      <Select label={providerLabel} value={provider} loading={isLoading}
        options={(catalogue?.[service] ?? []).map((p) => ({ value: p.id, label: p.name }))}
        onChange={(v) => { setProvider(v); setVariation(""); reset(); }} />
      {service === "electricity" ? (
        <Segmented value={meterType} onChange={(v) => { setMeterType(v); reset(); }} options={[{ value: "prepaid", label: "Prepaid" }, { value: "postpaid", label: "Postpaid" }]} />
      ) : null}
      {needsId ? (
        <View style={{ gap: 8 }}>
          <Input label={idLabel} value={customerId} onChangeText={(v) => { setCustomerId(v); reset(); }}
            keyboardType={service === "betting" ? "default" : "number-pad"} autoCapitalize="none"
            placeholder={service === "airtime" || service === "data" ? "0803 123 4567" : ""} />
          {needsVerify ? <Button title={verify.isPending ? "Checking…" : customer ? "Verified" : "Verify"} kind="secondary" size="md" onPress={lookup} loading={verify.isPending} disabled={!provider || !customerId} /> : null}
        </View>
      ) : null}
      {customer ? <VerifiedBox info={customer} /> : null}
      {decoder ? (
        <Segmented value={subType} onChange={setSubType} options={[{ value: "renew", label: "Renew current plan" }, { value: "change", label: "Change bouquet" }]} />
      ) : null}
      {plansKind && provider ? (
        <Select label={service === "data" ? "Data plan" : renewing ? "Your current bouquet" : "Bouquet"} value={variation} loading={plans.isLoading}
          options={(plans.data ?? []).map((p) => ({ value: String(p.variation_id), label: p.data_plan ?? p.package_bouquet ?? p.variation_id, hint: naira(p.price) }))}
          onChange={setVariation} placeholder="Choose a plan" />
      ) : null}
      {QUICK_AMOUNTS[service] ? (
        <View style={{ gap: 10 }}>
          <Input label="Amount (₦)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder={service === "electricity" ? "Min ₦500" : "e.g. 500"} />
          <Chips value={amount} onChange={setAmount} options={QUICK_AMOUNTS[service]!.map((a) => ({ value: String(a), label: naira(a) }))} />
        </View>
      ) : null}
      {service === "epins" ? (
        <View style={{ gap: 12 }}>
          <Text variant="label">PIN value</Text>
          <Chips scroll={false} value={pinValue} onChange={setPinValue} options={(catalogue?.epin_values ?? [100, 200, 500, 1000]).map((v) => ({
            value: String(v), label: naira(v), disabled: left(v) === 0, hint: left(v) === 0 ? "Sold out" : undefined }))} />
          {pinsLeft === 0 ? <Notice kind="error">{naira(pinValue)} PINs for this network are sold out — choose another value.</Notice> : null}
          {pinsLeft !== undefined && pinsLeft > 0 && qty > pinsLeft ? <Notice kind="warning">Only {pinsLeft} pack{pinsLeft === 1 ? "" : "s"} left at {naira(pinValue)} — reduce the quantity.</Notice> : null}
          <Input label={`Packs of ${packSize} cards (1–${maxQty})`} value={quantity} onChangeText={(v) => setQuantity(v.replace(/\D/g, ""))} keyboardType="number-pad" />
          {qty >= 1 ? <Text variant="small">{qty * packSize} cards × {naira(pinValue)} = <Text variant="bodyStrong">{naira(face)}</Text></Text> : null}
          <Notice>PINs come as printable voucher sheets of {packSize} cards and appear on your receipt right after payment.</Notice>
        </View>
      ) : null}
      <PayPanel amount={face} fee={fee} ready={ready} pending={pending} error={error} method={method} setMethod={setMethod} onPay={pay} />
    </Card>
  );
}

function EducationForm() {
  const { data: catalogue } = useCatalogue();
  const verify = useVerifyCustomer();
  const { place, pending, error, setError } = useOrder();
  const [provider, setProvider] = useState("");
  const [serviceType, setServiceType] = useState<"result_checker" | "registration">("result_checker");
  const [variation, setVariation] = useState("");
  const [qty, setQty] = useState("1");
  const [profileId, setProfileId] = useState("");
  const [candidate, setCandidate] = useState<CustomerInfo | null>(null);
  const [method, setMethod] = useState<"wallet" | "card">("wallet");
  const jamb = provider === "jamb";
  const type = jamb ? "jamb" : serviceType;
  const plans = useVariations("education", provider, type);
  const plan = plans.data?.find((p) => p.variation_id === variation);
  const maxQty = catalogue?.education_max_quantity ?? 10;
  const quantity = jamb ? 1 : Math.max(0, Math.floor(Number(qty) || 0));
  const face = plan ? Number(plan.price) * quantity : 0;
  const fee = Number(catalogue?.fees?.education ?? 0);
  const ready = !!plan && quantity >= 1 && quantity <= maxQty && (!jamb || !!candidate);
  return (
    <Card style={{ gap: 16 }}>
      <Select label="Exam body" value={provider} options={(catalogue?.education ?? []).map((p) => ({ value: p.id, label: p.name }))}
        onChange={(v) => { setProvider(v); setVariation(""); setCandidate(null); }} />
      {provider === "waec" ? (
        <Segmented value={serviceType} onChange={(v) => { setServiceType(v); setVariation(""); }} options={[{ value: "result_checker", label: "Result checker" }, { value: "registration", label: "Registration" }]} />
      ) : null}
      {provider ? (
        <Select label="PIN type" value={variation} loading={plans.isLoading} onChange={(v) => { setVariation(v); setCandidate(null); }}
          options={(plans.data ?? []).map((p) => ({ value: p.variation_id, label: p.data_plan ?? p.variation_id, hint: naira(p.price) }))} />
      ) : null}
      {jamb && variation ? (
        <View style={{ gap: 8 }}>
          <Input label="Candidate's JAMB profile ID" value={profileId} onChangeText={(v) => { setProfileId(v); setCandidate(null); }} keyboardType="number-pad" />
          <Button title="Verify" kind="secondary" size="md" loading={verify.isPending} disabled={!profileId}
            onPress={() => { setError(""); verify.mutate({ service: "education", provider, customer_id: profileId, variation_id: variation }, { onSuccess: setCandidate, onError: (e) => setError(apiError(e, "We couldn't find that profile.")) }); }} />
        </View>
      ) : null}
      {candidate ? <VerifiedBox info={candidate} /> : null}
      {provider === "waec" ? <Input label={`How many PINs? (1–${maxQty})`} value={qty} onChangeText={(v) => setQty(v.replace(/\D/g, ""))} keyboardType="number-pad" /> : null}
      <PayPanel amount={face} fee={fee} ready={ready} pending={pending} error={error} method={method} setMethod={setMethod}
        note={<Text variant="caption" color={colors.muted}>Your PINs and serial numbers appear on the receipt as soon as they’re issued.</Text>}
        onPay={() => place({ service: "education", provider, service_type: type, variation_id: variation, quantity, customer_id: jamb ? profileId : "", customer_name: candidate?.customer_name, payment_method: method })} />
    </Card>
  );
}
