import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { KeyRound, Phone, Star } from "lucide-react-native";
import { call } from "@/components/delivery";
import { apiError } from "@/lib/api";
import { openCheckout } from "@/lib/checkout";
import { useDelivery, useDeliveryAction, usePayDelivery, type Delivery } from "@/lib/dispatch";
import { formatDateTime, naira } from "@/lib/format";
import { Badge, Button, Card, Loading, Notice, Screen, Text, colors, fonts, radius } from "@/ui";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { deliveryMessage } from "@/lib/support";

const STEPS: { key: keyof Delivery; label: string }[] = [
  { key: "created_at", label: "Requested" }, { key: "accepted_at", label: "Rider assigned" }, { key: "picked_up_at", label: "Picked up" },
  { key: "paid_at", label: "On the way" }, { key: "delivered_at", label: "Delivered" },
];

export default function DeliveryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: d, isLoading, refetch, isRefetching } = useDelivery(id);
  const pay = usePayDelivery();
  const act = useDeliveryAction();
  const [error, setError] = useState("");
  const [stars, setStars] = useState(0);
  if (isLoading) return <Screen back title="Delivery"><Loading /></Screen>;
  if (!d) return <Screen back title="Delivery"><Notice kind="error">Delivery not found.</Notice></Screen>;
  const live = !["delivered", "cancelled", "expired"].includes(d.status);

  return (
    <Screen back title={`${d.kind_label} · ${d.vehicle_label}`} subtitle={d.reference} onRefresh={refetch} refreshing={isRefetching}>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Badge label={d.status_label} status={d.status} />
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.brand900 }}>{naira(d.fare)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {STEPS.map((s) => {
            const done = !!d[s.key];
            return (
              <View key={s.key} style={{ flex: 1, gap: 6 }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: done ? colors.brand500 : colors.brand100 }} />
                <Text style={{ fontSize: 10, fontFamily: done ? fonts.semibold : fonts.regular, color: done ? colors.brand800 : colors.faint }}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {d.delivery_code && live ? (
        <LinearGradient colors={[colors.brand900, colors.brand600]} style={{ borderRadius: radius.lg, padding: 18, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><KeyRound size={16} color={colors.brand200} /><Text style={{ color: colors.brand200, fontSize: 13 }}>Delivery code</Text></View>
          <Text selectable style={{ color: colors.white, fontFamily: fonts.display, fontSize: 40, letterSpacing: 12 }}>{d.delivery_code}</Text>
          <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 12.5, lineHeight: 18 }}>Share it with {d.recipient_name}. The rider needs it to complete the delivery — never share it before the item arrives.</Text>
        </LinearGradient>
      ) : null}

      {error ? <Notice kind="error">{error}</Notice> : null}
      {d.delivery_code !== null && d.status === "picked_up" ? (
        <Card style={{ gap: 10, backgroundColor: colors.brand50, borderColor: colors.brand100 }}>
          <Text variant="bodyStrong">Your rider has the item. Pay the delivery fee to start the trip.</Text>
          <Button title={`Pay ${naira(d.fare)}`} loading={pay.isPending}
            onPress={() => { setError(""); pay.mutate(d.id, { onSuccess: async (r) => { await openCheckout(r.authorization_url, r.reference); refetch(); }, onError: (e) => setError(apiError(e)) }); }} />
        </Card>
      ) : null}

      <Card style={{ gap: 6 }}>
        <Text variant="h3">Rider</Text>
        {d.rider ? (
          <>
            <Text variant="bodyStrong">{d.rider.name}</Text>
            <Text variant="small">{d.rider.vehicle_label}{d.rider.plate_number ? ` · ${d.rider.plate_number}` : ""} · {d.rider.rating ? `★ ${d.rider.rating}` : "New rider"} · {d.rider.completed_count} trips</Text>
            {d.rider.phone && live ? <Button title="Call rider" kind="secondary" size="md" icon={<Phone size={16} color={colors.brand600} />} onPress={() => call(d.rider!.phone)} style={{ marginTop: 6 }} /> : null}
          </>
        ) : <Text variant="small">{d.status === "searching" ? "Finding a verified rider near the pickup…" : "No rider assigned."}</Text>}
      </Card>

      <Card style={{ gap: 12 }}>
        <Field label={d.kind === "errand" ? "Buy from" : "Pickup"} value={d.pickup_address} />
        <Field label="Drop-off" value={`${d.dropoff_address}\n${d.recipient_name} · ${d.recipient_phone}`} />
        <Field label={d.kind === "errand" ? "Shopping list" : "Item"} value={d.errand_details || d.item_description} />
        {d.errand_budget ? <Field label="Items (pay the rider on delivery)" value={`≈ ${naira(d.errand_budget)}`} /> : null}
        <Field label="Distance" value={`${d.distance_km} km`} />
        <Field label="Booked" value={formatDateTime(d.created_at)} />
      </Card>

      {d.delivery_code !== null && ["searching", "accepted"].includes(d.status) ? (
        <Button title="Cancel delivery" kind="ghost" loading={act.isPending} style={{ borderWidth: 1, borderColor: colors.dangerBg }}
          onPress={() => { setError(""); act.mutate({ id: d.id, action: "cancel" }, { onError: (e) => setError(apiError(e)) }); }} />
      ) : null}

      {d.status === "delivered" && !d.rating && d.delivery_code !== null ? (
        <Card style={{ gap: 10, alignItems: "center" }}>
          <Text variant="h3">How was your rider?</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={4} accessibilityLabel={`${n} stars`}>
                <Star size={34} color={n <= stars ? colors.amber : colors.brand100} fill={n <= stars ? colors.amber : "transparent"} />
              </Pressable>
            ))}
          </View>
          <Button title="Submit rating" size="md" disabled={!stars} loading={act.isPending} style={{ alignSelf: "stretch" }}
            onPress={() => act.mutate({ id: d.id, action: "rate", body: { rating: stars } }, { onError: (e) => setError(apiError(e)) })} />
        </Card>
      ) : null}
      {d.status === "delivered" && d.rating ? <Notice kind="success">Thanks — you rated this delivery {d.rating}/5.</Notice> : null}
      <WhatsAppButton message={deliveryMessage(d)} label="Problem with this delivery?" />
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <View style={{ gap: 2 }}><Text variant="caption">{label}</Text><Text style={{ fontSize: 14.5, color: colors.brand900 }}>{value}</Text></View>;
}
