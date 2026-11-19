import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck, MapPin, Star, X } from "lucide-react-native";
import { AddressField } from "@/components/delivery";
import { Avatar } from "@/components/jobs";
import { useEnsureRole } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { mediaUrl } from "@/lib/config";
import type { LatLng } from "@/lib/dispatch";
import { formatDate, naira } from "@/lib/format";
import { useArtisan, useCreateBooking, type ArtisanDetail } from "@/lib/jobs";
import { Badge, Button, Card, Chips, Input, Loading, Notice, Screen, Section, Text, colors, fonts, radius } from "@/ui";
import { ReferralNotice, TELL_ARTISAN } from "@/components/ReferralNotice";

export default function ArtisanProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: a, isLoading } = useArtisan(id);
  const [service, setService] = useState<string | null>(null);
  if (isLoading) return <Screen back title="Artisan"><Loading /></Screen>;
  if (!a) return <Screen back title="Artisan"><Notice kind="error">This artisan isn’t available.</Notice></Screen>;
  const place = [a.area, a.city, a.state].filter(Boolean).join(", ");
  return (
    <Screen back title="Artisan" footer={a.services.length ? <Button title="Book a service" onPress={() => setService(a.services[0].id)} /> : undefined}>
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 22 }}>
        <Avatar name={a.full_name} size={84} uri={a.portfolio[0]?.image ?? null} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text variant="h2">{a.full_name}</Text>{a.is_verified ? <BadgeCheck size={18} color={colors.brand500} /> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Star size={15} color={colors.amber} fill={colors.amber} />
          <Text variant="small" color={colors.ink}>{Number(a.avg_rating) ? Number(a.avg_rating).toFixed(1) : "New"} · {a.rating_count} reviews</Text>
        </View>
        {place ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MapPin size={14} color={colors.faint} /><Text variant="caption">{place} · serves {a.service_radius_km} km</Text></View> : null}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {a.is_verified ? <Badge label="ID verified" tone="info" /> : null}
          {a.is_featured ? <Badge label="Featured" tone="warning" /> : null}
        </View>
      </Card>
      <ReferralNotice message={TELL_ARTISAN} />
      {a.bio ? <Card style={{ gap: 6 }}><Text variant="h3">About</Text><Text>{a.bio}</Text></Card> : null}
      <Section title="Services">
        {a.services.map((s) => (
          <Card key={s.id} onPress={() => setService(s.id)} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Text variant="h3" style={{ flex: 1 }}>{s.title}</Text>
              <Text style={{ fontFamily: fonts.displayBold, color: colors.brand700 }}>from {naira(s.base_price)}</Text>
            </View>
            {s.category_name ? <Text variant="caption">{s.category_name}</Text> : null}
            {s.description ? <Text variant="small" numberOfLines={3}>{s.description}</Text> : null}
          </Card>
        ))}
      </Section>
      {a.portfolio.length ? (
        <Section title="Recent work">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {a.portfolio.map((p) => <Image key={p.id} source={{ uri: mediaUrl(p.image) }} style={{ width: 150, height: 150, borderRadius: radius.lg, backgroundColor: colors.brand50 }} contentFit="cover" />)}
          </ScrollView>
        </Section>
      ) : null}
      {a.reviews.length ? (
        <Section title="Reviews">
          {a.reviews.slice(0, 10).map((r) => (
            <Card key={r.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="bodyStrong" style={{ fontSize: 14 }}>{r.author_name}</Text>
                <Text variant="caption">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {formatDate(r.created_at)}</Text>
              </View>
              {r.comment ? <Text variant="small">{r.comment}</Text> : null}
            </Card>
          ))}
        </Section>
      ) : null}
      {service ? <BookSheet artisan={a} serviceId={service} onClose={() => setService(null)} /> : null}
    </Screen>
  );
}

const TIMES = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

function BookSheet({ artisan, serviceId, onClose }: { artisan: ArtisanDetail; serviceId: string; onClose: () => void }) {
  const ready = useEnsureRole("customer");
  const book = useCreateBooking();
  const [service, setService] = useState(serviceId);
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; }), []);
  const [day, setDay] = useState(days[0].toDateString());
  const [time, setTime] = useState("10:00");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    if (!point) { setError("Set the job address."); return; }
    const when = new Date(day);
    const [h, m] = time.split(":").map(Number);
    when.setHours(h, m, 0, 0);
    setError("");
    book.mutate({ service, scheduled_for: when.toISOString(), latitude: point.lat, longitude: point.lng, address: address.trim(), notes: notes.trim() || undefined },
      { onSuccess: () => setDone(true), onError: (e) => setError(apiError(e, "We couldn't send this booking.")) });
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 8 }}>
          <Text variant="h2" style={{ flex: 1 }}>Book {artisan.full_name.split(" ")[0]}</Text>
          <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><X size={24} color={colors.brand900} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
          {done ? (
            <>
              <Notice kind="success">Booking request sent! {artisan.full_name} will confirm shortly — we’ll notify you.</Notice>
              <Button title="View my bookings" onPress={() => { onClose(); router.push("/bookings"); }} />
            </>
          ) : (
            <>
              <Text variant="label">Service</Text>
              <Chips scroll={false} value={service} onChange={setService} options={artisan.services.map((s) => ({ value: s.id, label: `${s.title} · ${naira(s.base_price)}` }))} />
              <Text variant="label">Day</Text>
              <Chips value={day} onChange={setDay} options={days.map((d) => ({ value: d.toDateString(), label: d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }) }))} />
              <Text variant="label">Time</Text>
              <Chips scroll={false} value={time} onChange={setTime} options={TIMES.map((t) => ({ value: t, label: t }))} />
              <AddressField label="Job address" placeholder="e.g. 14 Bode Thomas St, Surulere" value={address} onChange={setAddress} point={point} onPoint={setPoint} />
              <Input label="Describe the job (optional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder="e.g. Kitchen sink is leaking under the cabinet" />
              <Text variant="caption">You agree the final price with the artisan. Never pay outside an agreed quote.</Text>
              {error ? <Notice kind="error">{error}</Notice> : null}
              <Button title="Send booking request" loading={book.isPending} disabled={!ready || !point || !address.trim()} onPress={submit} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
