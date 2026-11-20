import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck, CheckCircle2, Flag, MapPin, Phone, Star, X } from "lucide-react-native";
import { AddressField, call } from "@/components/delivery";
import { Avatar, TierBadge } from "@/components/jobs";
import { ReferralNotice, TELL_ARTISAN } from "@/components/ReferralNotice";
import { useAuth, useEnsureRole } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { mediaUrl } from "@/lib/config";
import type { LatLng } from "@/lib/dispatch";
import { formatDate, naira } from "@/lib/format";
import { useArtisan, useCreateBooking, useReportArtisan, type ArtisanDetail } from "@/lib/jobs";
import { Button, Card, Chips, Input, Loading, Notice, Screen, Section, Text, colors, fonts, radius } from "@/ui";

type Service = ArtisanDetail["services"][number];

/** Artisan profile — mirrors the web's /artisans/:id. */
export default function ArtisanProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: a, isLoading } = useArtisan(id);
  const [booking, setBooking] = useState<Service | null>(null);
  const [reporting, setReporting] = useState(false);
  if (isLoading) return <Screen back title="Artisan"><Loading /></Screen>;
  if (!a) return <Screen back title="Artisan"><Notice kind="error">Artisan not found.</Notice></Screen>;
  const rated = a.rating_count > 0;
  const place = [a.city, a.area, a.state].filter(Boolean).join(" · ");

  return (
    <Screen back title="Artisan">
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 22 }}>
        <Avatar name={a.full_name} size={92} uri={a.portfolio[0]?.image ?? null} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <Text variant="h2">{a.full_name}</Text>
          {a.is_verified ? <BadgeCheck size={19} color={colors.brand500} /> : null}
          <TierBadge tier={a.tier} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {rated ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Star size={15} color={colors.amber} fill={colors.amber} />
              <Text variant="small" color={colors.ink}>{parseFloat(a.avg_rating).toFixed(1)} ({a.rating_count})</Text>
            </View>
          ) : <Text variant="small" color={colors.brand500} style={{ fontFamily: fonts.semibold }}>New</Text>}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={14} color={colors.muted} /><Text variant="small">Serves up to {a.service_radius_km} km</Text>
          </View>
        </View>
        {place ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={14} color={colors.brand500} /><Text variant="small">{place}</Text>
          </View>
        ) : null}
        {a.bio ? <Text variant="small" center style={{ marginTop: 4 }}>{a.bio}</Text> : null}
        {a.phone ? (
          <Button title={a.phone} kind="secondary" size="md" style={{ alignSelf: "stretch", marginTop: 6 }}
            icon={<Phone size={16} color={colors.brand600} />} onPress={() => call(a.phone!)} />
        ) : null}
        <Pressable onPress={() => setReporting(true)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }} accessibilityRole="button">
          <Flag size={13} color={colors.faint} /><Text variant="caption">Report this artisan</Text>
        </Pressable>
      </Card>

      <ReferralNotice message={TELL_ARTISAN} />

      <Section title="Services">
        {a.services.length === 0 ? <Text variant="small">This artisan hasn’t listed any services yet.</Text> : a.services.map((s) => (
          <Card key={s.id} style={{ gap: 6 }}>
            <Text variant="h3">{s.title}</Text>
            {s.category_name ? <Text variant="caption" color={colors.brand500}>{s.category_name}</Text> : null}
            {s.description ? <Text variant="small">{s.description}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.brand900 }}>{naira(s.base_price)}</Text>
              <Button title="Book" size="md" onPress={() => setBooking(s)} />
            </View>
          </Card>
        ))}
      </Section>

      {a.portfolio.length ? (
        <Section title="Portfolio">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {a.portfolio.map((p) => (
              <Image key={p.id} source={{ uri: mediaUrl(p.image) }} accessibilityLabel={p.caption}
                style={{ width: "48%", flexGrow: 1, aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.brand50 }} contentFit="cover" />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Reviews">
        {a.reviews.length === 0 ? <Text variant="small">No reviews yet.</Text> : a.reviews.map((r) => (
          <Card key={r.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Text variant="bodyStrong" style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>{r.author_name || "Customer"}</Text>
              <View style={{ flexDirection: "row", gap: 1 }}>
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} color={n <= r.rating ? colors.amber : colors.brand100} fill={n <= r.rating ? colors.amber : "transparent"} />)}
              </View>
            </View>
            {r.comment ? <Text variant="small">{r.comment}</Text> : null}
            <Text variant="caption">{formatDate(r.created_at)}</Text>
          </Card>
        ))}
      </Section>

      {booking ? <BookSheet artisanName={a.full_name} service={booking} onClose={() => setBooking(null)} /> : null}
      {reporting ? <ReportSheet artisan={a} onClose={() => setReporting(false)} /> : null}
    </Screen>
  );
}

// ---------------------------------------------------------------- booking (the web's BookingModal)
const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`); // 07:00–20:00

function BookSheet({ artisanName, service, onClose }: { artisanName: string; service: Service; onClose: () => void }) {
  const ready = useEnsureRole("customer");
  const book = useCreateBooking();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);
  const [day, setDay] = useState(days[0].toDateString());
  const isToday = day === days[0].toDateString();
  const nowHour = new Date().getHours();
  const hours = isToday ? HOURS.filter((h) => Number(h.slice(0, 2)) > nowHour) : HOURS;
  const [time, setTime] = useState<string>("");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const chosenTime = hours.includes(time) ? time : "";

  function submit() {
    setError("");
    if (!chosenTime) { setError("Choose a time."); return; }
    if (!point) { setError("Please set your location for the job address."); return; }
    const when = new Date(day);
    when.setHours(Number(chosenTime.slice(0, 2)), 0, 0, 0);
    book.mutate({ service: service.id, scheduled_for: when.toISOString(), latitude: point.lat, longitude: point.lng, address: address.trim(), notes: notes.trim() || undefined },
      { onSuccess: () => setDone(true), onError: (e) => setError(apiError(e, "Could not create the booking.")) });
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 8 }}>
          <Text variant="h2" style={{ flex: 1 }} numberOfLines={2}>Book {service.title}</Text>
          <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><X size={24} color={colors.brand900} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
          {done ? (
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 30 }}>
              <CheckCircle2 size={52} color={colors.success} />
              <Text variant="h2">Booking requested!</Text>
              <Text variant="small" center>{artisanName} will be notified to accept it. You can track it from your bookings.</Text>
              <Button title="View my bookings" style={{ alignSelf: "stretch", marginTop: 10 }} onPress={() => { onClose(); router.push("/bookings"); }} />
              <Button title="Done" kind="ghost" style={{ alignSelf: "stretch" }} onPress={onClose} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: radius.md, backgroundColor: colors.mist }}>
                <Text variant="small">Price</Text>
                <Text variant="bodyStrong">{naira(service.base_price)}</Text>
              </View>
              <Text variant="label">When — day</Text>
              <Chips value={day} onChange={(v) => { setDay(v); setTime(""); }} options={days.map((d, i) => ({ value: d.toDateString(), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }) }))} />
              <Text variant="label">Time</Text>
              {hours.length ? <Chips scroll={false} value={chosenTime} onChange={setTime} options={hours.map((t) => ({ value: t, label: t }))} />
                : <Text variant="caption">No more times today — choose another day.</Text>}
              <AddressField label="Address" placeholder="Where should they come?" value={address} onChange={setAddress} point={point} onPoint={setPoint} />
              <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder="Anything the artisan should know?" />
              {error ? <Notice kind="error">{error}</Notice> : null}
              <Button title="Request booking" loading={book.isPending} disabled={!ready || !point || !address.trim() || !chosenTime} onPress={submit} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------- report (the web's Complaints form, artisan category)
function ReportSheet({ artisan, onClose }: { artisan: ArtisanDetail; onClose: () => void }) {
  const { user } = useAuth();
  const report = useReportArtisan();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  function submit() {
    setError("");
    report.mutate({
      artisan: artisan.id, artisan_name: artisan.full_name, full_name: user?.full_name ?? "", email: user?.email ?? "",
      phone: phone.trim(), subject: subject.trim(), description: description.trim(),
    }, { onSuccess: (r) => setRef(r.reference), onError: (e) => setError(apiError(e, "Could not send your report.")) });
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 8 }}>
          <Text variant="h2" style={{ flex: 1 }} numberOfLines={2}>Report {artisan.full_name}</Text>
          <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><X size={24} color={colors.brand900} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48 }}>
          {ref ? (
            <>
              <Notice kind="success">Thanks — your report was sent. Reference {ref}. Our team will look into it and update you by email.</Notice>
              <Button title="Done" onPress={onClose} />
            </>
          ) : (
            <>
              <Text variant="small">Poor work, no-show, overcharging or misconduct? Tell us what happened — only the JobCatch team sees this.</Text>
              <Input label="Your phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0803 123 4567" />
              <Input label="Subject" value={subject} onChangeText={setSubject} maxLength={150} placeholder="e.g. Didn’t show up for the booked job" />
              <Input label="What happened?" value={description} onChangeText={setDescription} multiline maxLength={3000} placeholder="Describe what happened (at least 20 characters)" />
              {error ? <Notice kind="error">{error}</Notice> : null}
              <Button title="Send report" kind="danger" loading={report.isPending}
                disabled={!phone.trim() || !subject.trim() || description.trim().length < 20} onPress={submit} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
