import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Navigation, Package, UtensilsCrossed } from "lucide-react-native";
import { AddressField, VEHICLE_ICON } from "@/components/delivery";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { useBookDelivery, useQuote, useRates, type DeliveryKind, type LatLng, type VehicleType } from "@/lib/dispatch";
import { naira } from "@/lib/format";
import { Button, Card, Input, Notice, Screen, Segmented, Text, colors, fonts, radius } from "@/ui";

export default function NewDelivery() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { user } = useAuth();
  const rates = useRates();
  const book = useBookDelivery();
  const [kind, setKind] = useState<DeliveryKind>(params.kind === "errand" ? "errand" : "package");
  const [vehicle, setVehicle] = useState<VehicleType>("bike");
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [f, setF] = useState({
    pickup_address: "", pickup_contact_name: "", pickup_contact_phone: "", dropoff_address: "",
    recipient_name: user?.full_name ?? "", recipient_phone: user?.phone ?? "", item_description: "", errand_details: "", notes: "",
  });
  const [orderPaid, setOrderPaid] = useState(false);
  const [error, setError] = useState("");
  const quote = useQuote(pickup, dropoff, vehicle, kind);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const errand = kind === "errand";
  const ready = !!quote.data && f.pickup_address && f.dropoff_address && f.recipient_name && f.recipient_phone && f.item_description.trim()
    && (!errand || (f.pickup_contact_name.trim() && f.pickup_contact_phone.trim() && orderPaid));

  function submit() {
    if (!pickup || !dropoff) { setError("Set both the pickup and drop-off locations."); return; }
    setError("");
    book.mutate({
      kind, vehicle_type: vehicle, pickup_lat: pickup.lat, pickup_lng: pickup.lng, dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng,
      ...f, order_paid: errand ? orderPaid : undefined,
    }, {
      onSuccess: (d) => router.replace(`/delivery/${d.id}`),
      onError: (e) => setError(apiError(e, "We couldn't book this delivery.")),
    });
  }

  return (
    <Screen back title={errand ? "Food & essentials pickup" : "Send a package"}
      footer={
        <View style={{ gap: 8 }}>
          {quote.data ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text variant="small">{quote.data.distance_km} km · delivery fee</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.brand900 }}>{naira(quote.data.fare)}</Text>
            </View>
          ) : null}
          <Button title={quote.data ? "Find a rider" : quote.isFetching ? "Getting price…" : "Set both addresses to see the price"} onPress={submit} loading={book.isPending} disabled={!ready} />
        </View>
      }>
      <Segmented value={kind} onChange={setKind} options={[{ value: "package", label: "Send a package" }, { value: "errand", label: "Food & essentials" }]} />

      <View style={{ gap: 8 }}>
        <Text variant="label">Vehicle</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {rates.data?.rates.map((r) => {
            const Icon = VEHICLE_ICON[r.vehicle_type];
            const on = vehicle === r.vehicle_type;
            return (
              <Pressable key={r.vehicle_type} onPress={() => setVehicle(r.vehicle_type)} accessibilityState={{ selected: on }}
                style={{ width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? colors.brand500 : colors.line, backgroundColor: on ? colors.brand50 : colors.white, gap: 4 }}>
                <Icon size={22} color={on ? colors.brand600 : colors.muted} />
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.brand900 }} numberOfLines={1}>{r.label}</Text>
                  <Text variant="caption">from {naira(r.minimum_fare)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card style={{ gap: 14 }}>
        <Row icon={errand ? <UtensilsCrossed size={16} color={colors.brand500} /> : <Package size={16} color={colors.brand500} />} title={errand ? "Collect from (your vendor)" : "Pickup"} />
        <AddressField label={errand ? "Vendor’s address" : "Pickup address"} placeholder={errand ? "e.g. Chicken Republic, Admiralty Way, Lekki" : "e.g. 12 Allen Avenue, Ikeja"}
          value={f.pickup_address} onChange={set("pickup_address")} point={pickup} onPoint={setPickup} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Input label={errand ? "Vendor’s name" : "Contact (optional)"} value={f.pickup_contact_name} onChangeText={set("pickup_contact_name")} placeholder={errand ? "e.g. Mama Put Kitchen" : undefined} /></View>
          <View style={{ flex: 1 }}><Input label={errand ? "Vendor’s phone" : "Their phone"} value={f.pickup_contact_phone} onChangeText={set("pickup_contact_phone")} keyboardType="phone-pad" /></View>
        </View>
      </Card>

      <Card style={{ gap: 14 }}>
        <Row icon={<Navigation size={16} color={colors.brand500} />} title="Drop-off" />
        <AddressField label="Delivery address" placeholder="e.g. 5 Admiralty Road, Lekki Phase 1" value={f.dropoff_address} onChange={set("dropoff_address")} point={dropoff} onPoint={setDropoff} />
        <Input label="Recipient's name" value={f.recipient_name} onChangeText={set("recipient_name")} />
        <Input label="Recipient's phone" value={f.recipient_phone} onChangeText={set("recipient_phone")} keyboardType="phone-pad" placeholder="0803 123 4567" />
      </Card>

      <Card style={{ gap: 14 }}>
        {errand ? (
          <>
            <Input label="What should the rider collect?" value={f.item_description} onChangeText={set("item_description")} maxLength={255} placeholder="e.g. 2 plates of jollof rice with chicken, 1 bottle of Coke" />
            <Input label="Order number or name on the order (optional)" value={f.errand_details} onChangeText={set("errand_details")} maxLength={200} placeholder="e.g. Order #A102, under the name Tunde" />
            <Pressable onPress={() => setOrderPaid((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: orderPaid }}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: radius.md, backgroundColor: colors.warningBg }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: orderPaid ? colors.brand500 : colors.warning, backgroundColor: orderPaid ? colors.brand500 : colors.white, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                {orderPaid ? <Check size={15} color={colors.white} /> : null}
              </View>
              <Text variant="small" color={colors.warning} style={{ flex: 1 }}>I have already ordered and <Text variant="small" color={colors.warning} style={{ fontFamily: fonts.semibold }}>paid the vendor</Text> for this order. The rider only picks it up and delivers it — riders don’t buy items or pay vendors.</Text>
            </Pressable>
          </>
        ) : (
          <Input label="What are we delivering?" value={f.item_description} onChangeText={set("item_description")} maxLength={255} placeholder="e.g. Documents in an envelope" />
        )}
        <Input label="Note for the rider (optional)" value={f.notes} onChangeText={set("notes")} maxLength={500} />
      </Card>

      {quote.data ? <Text variant="caption" center>You pay in the app after the rider picks up. {rates.data?.rider_share_percent}% goes straight to your rider.</Text> : null}
      {quote.isError ? <Notice kind="error">{apiError(quote.error)}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
    </Screen>
  );
}

function Row({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{icon}<Text variant="h3">{title}</Text></View>;
}
