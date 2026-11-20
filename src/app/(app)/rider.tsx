import { useState } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, FileText, Navigation, Phone, Power } from "lucide-react-native";
import { Image } from "expo-image";
import { DeliveryRow, call, openDirections } from "@/components/delivery";
import { apiError, type PickedFile } from "@/lib/api";
import { ACTIVE, RIDER_ID_TYPES, useBanks, useOpenRequests, useRiderJobAction, useRiderJobs, useRiderProfile, useSetAvailability, useSetPayoutAccount, useUpdateRider, type Delivery, type RiderIdType, type RiderProfile, type VehicleType } from "@/lib/dispatch";
import { pickDocument, takeSelfie } from "@/lib/files";
import { naira } from "@/lib/format";
import { currentPlace } from "@/lib/location";
import { Badge, Button, Card, Chips, Empty, Input, Loading, Notice, Screen, Section, Select, Text, colors, fonts, radius } from "@/ui";

export default function RiderScreen() {
  const profile = useRiderProfile();
  const r = profile.data;
  return (
    <Screen back title="Rider" subtitle={r ? `You keep ${r.share_percent}% of every delivery fee, paid to your bank.` : undefined}
      onRefresh={() => profile.refetch()} refreshing={profile.isRefetching}>
      {profile.isLoading || !r ? <Loading /> : r.can_work ? <Working rider={r} /> : <Onboarding rider={r} />}
    </Screen>
  );
}

function Onboarding({ rider }: { rider: RiderProfile }) {
  return (
    <>
      {rider.status === "pending" ? <Notice>Thanks! Your application is under review — we’ll notify you once you’re approved.</Notice> : null}
      {rider.status === "rejected" ? <Notice kind="error">Your application needs changes: {rider.review_note || "please review your details."} Update and resubmit below.</Notice> : null}
      {rider.status === "approved" && !rider.has_payout_account ? <Notice kind="warning">Add your payout account to start working.</Notice> : null}
      {rider.status === "suspended" ? <Notice kind="error">Your rider account is suspended. Contact support.</Notice> : null}
      {rider.status === "incomplete" ? (
        <LinearGradient colors={[colors.brand900, colors.brand600]} style={{ borderRadius: radius.lg, padding: 18, gap: 6 }}>
          <Text style={{ color: colors.white, fontFamily: fonts.displayBold, fontSize: 17 }}>Become a JobCatch rider</Text>
          {["Tell us your vehicle and phone number.", "Add your government ID and take a selfie.", "Add the bank account your earnings go to.", "We review you — usually within a day."].map((t, i) => (
            <Text key={t} style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5 }}>{i + 1}. {t}</Text>
          ))}
        </LinearGradient>
      ) : null}
      <DetailsForm rider={rider} />
      <PayoutForm rider={rider} />
    </>
  );
}

const VEHICLES: { value: VehicleType; label: string }[] = [{ value: "bike", label: "Motorbike" }, { value: "tricycle", label: "Tricycle" }, { value: "car", label: "Car" }, { value: "van", label: "Van" }];

function DetailsForm({ rider }: { rider: RiderProfile }) {
  const update = useUpdateRider();
  const [f, setF] = useState({ phone: rider.phone, vehicle_type: rider.vehicle_type, plate_number: rider.plate_number, city: rider.city, state: rider.state,
    id_type: rider.id_type, id_number: rider.id_number });
  const [doc, setDoc] = useState<PickedFile | null>(null);
  const [selfie, setSelfie] = useState<PickedFile | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function snap() {
    setMsg(null);
    try { const s = await takeSelfie(); if (s) setSelfie(s); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }
  return (
    <Card style={{ gap: 14 }}>
      <Text variant="h3">1 · You, your vehicle and your ID</Text>
      <Chips scroll={false} value={f.vehicle_type} onChange={(v) => setF({ ...f, vehicle_type: v })} options={VEHICLES} />
      <Input label="Phone number" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" placeholder="0803 123 4567" />
      <Input label="Plate number" value={f.plate_number} onChangeText={(v) => setF({ ...f, plate_number: v.toUpperCase() })} autoCapitalize="characters" placeholder="e.g. LND-123AB" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Input label="City" value={f.city} onChangeText={(v) => setF({ ...f, city: v })} placeholder="e.g. Lekki" /></View>
        <View style={{ flex: 1 }}><Input label="State" value={f.state} onChangeText={(v) => setF({ ...f, state: v })} placeholder="e.g. Lagos" /></View>
      </View>
      <Text variant="label">ID type</Text>
      <Chips scroll={false} value={f.id_type as RiderIdType} onChange={(v) => setF({ ...f, id_type: v })} options={RIDER_ID_TYPES} />
      <Input label="ID number" value={f.id_number} onChangeText={(v) => setF({ ...f, id_number: v.toUpperCase() })} autoCapitalize="characters" autoCorrect={false}
        placeholder={f.id_type === "nin" ? "11-digit NIN" : "As printed on the ID"} />
      <Pressable onPress={async () => setDoc((await pickDocument(["application/pdf", "image/jpeg", "image/png"])) ?? doc)}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand200 }}>
        <FileText size={20} color={colors.brand500} />
        <Text variant="small" style={{ flex: 1 }}>{doc ? doc.name : rider.has_id_document ? "ID uploaded ✓ — tap to replace" : "Photo or scan of the whole ID card (PDF, JPEG, PNG)"}</Text>
      </Pressable>
      <Text variant="label">Selfie</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {selfie ? <Image source={{ uri: selfie.uri }} style={{ width: 72, height: 72, borderRadius: 36 }} />
          : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand200 }}>
              <Camera size={26} color={colors.brand400} />
            </View>}
        <View style={{ flex: 1, gap: 4 }}>
          <Button title={selfie || rider.has_selfie ? "Retake selfie" : "Take selfie"} kind="secondary" size="md" icon={<Camera size={16} color={colors.brand600} />} onPress={snap} />
          <Text variant="caption">{rider.has_selfie && !selfie ? "Selfie submitted ✓ · " : ""}Good light, no cap or sunglasses.</Text>
        </View>
      </View>
      {rider.missing.length > 0 && rider.status !== "pending" ? <Notice kind="warning">Still needed before review: {rider.missing.join(", ")}.</Notice> : null}
      {msg ? <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice> : null}
      <Button title="Save and submit" loading={update.isPending}
        onPress={() => { setMsg(null); update.mutate({ ...f, id_document: doc, selfie }, {
          onSuccess: (r) => { setMsg({ ok: true, text: r.status === "pending" ? "Submitted for review." : "Saved." }); setDoc(null); setSelfie(null); },
          onError: (e) => setMsg({ ok: false, text: apiError(e) }) }); }} />
    </Card>
  );
}

function PayoutForm({ rider }: { rider: RiderProfile }) {
  const banks = useBanks(true);
  const save = useSetPayoutAccount();
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  return (
    <Card style={{ gap: 14 }}>
      <Text variant="h3">2 · Payout account</Text>
      {rider.has_payout_account ? <Notice kind="success">{rider.account_name} · {rider.bank_name} {rider.account_number_masked}</Notice> : null}
      <Select label="Bank" value={bank} loading={banks.isLoading} options={(banks.data ?? []).map((b) => ({ value: b.code, label: b.name }))} onChange={setBank} />
      <Input label="Account number" value={account} onChangeText={(v) => setAccount(v.replace(/\D/g, "").slice(0, 10))} keyboardType="number-pad" maxLength={10} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title={rider.has_payout_account ? "Change account" : "Verify and save"} kind={rider.has_payout_account ? "secondary" : "primary"} loading={save.isPending} disabled={!bank || account.length !== 10}
        onPress={() => { setError(""); save.mutate({ bank_code: bank, bank_name: banks.data?.find((b) => b.code === bank)?.name ?? "", account_number: account }, { onSuccess: () => { setBank(""); setAccount(""); }, onError: (e) => setError(apiError(e, "We couldn't verify that account.")) }); }} />
      <Text variant="caption">The account name must match your name. Customers pay in the app and Paystack settles your share to this account.</Text>
    </Card>
  );
}

function Working({ rider }: { rider: RiderProfile }) {
  const availability = useSetAvailability();
  const jobs = useRiderJobs();
  const requests = useOpenRequests(rider.is_online);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = jobs.data?.jobs.find((j) => ACTIVE.includes(j.status));

  async function toggle() {
    setError("");
    if (rider.is_online) { availability.mutate({ online: false }); return; }
    setBusy(true);
    try {
      const p = await currentPlace();
      availability.mutate({ online: true, lat: p.lat, lng: p.lng }, { onError: (e) => setError(apiError(e)) });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <>
      <LinearGradient colors={[colors.brand900, colors.brand600]} style={{ borderRadius: radius.xl, padding: 20, gap: 4 }}>
        <Text style={{ color: colors.brand200, fontSize: 13 }}>Your earnings</Text>
        <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 30 }}>{naira(jobs.data?.earnings.total ?? 0)}</Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5 }}>{jobs.data?.earnings.count ?? 0} deliveries · paid to {rider.bank_name} {rider.account_number_masked}</Text>
      </LinearGradient>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: rider.is_online ? colors.success : colors.faint }} />
        <View style={{ flex: 1 }}>
          <Text variant="h3">{rider.is_online ? "You're online" : "You're offline"}</Text>
          <Text variant="small">{rider.is_online ? "Showing requests near you." : "Go online to receive requests."}</Text>
        </View>
        <Button title={rider.is_online ? "Go offline" : "Go online"} size="md" kind={rider.is_online ? "secondary" : "primary"}
          icon={<Power size={16} color={rider.is_online ? colors.brand600 : colors.white} />} loading={busy || availability.isPending} onPress={toggle} />
      </Card>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {active ? <ActiveJob job={active} /> : rider.is_online ? (
        <Section title="Requests near you">
          {requests.data?.length ? requests.data.map((r) => <RequestCard key={r.id} r={r} />)
            : <Card><Empty title="No requests right now" body="New requests appear here automatically." /></Card>}
        </Section>
      ) : null}
      <Section title="History">
        <Card style={{ paddingVertical: 4 }}>
          {jobs.data?.jobs.length ? jobs.data.jobs.slice(0, 20).map((j, i) => <View key={j.id} style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : null}><DeliveryRow d={j} rider /></View>)
            : <Empty title="No deliveries yet" />}
        </Card>
      </Section>
    </>
  );
}

function RequestCard({ r }: { r: Delivery }) {
  const act = useRiderJobAction();
  const [error, setError] = useState("");
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{r.kind_label}{r.distance_to_pickup_km != null ? ` · ${r.distance_to_pickup_km} km away` : ""}</Text>
          <Text variant="small">{r.distance_km} km trip · {r.vehicle_label}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.brand900 }}>{naira(r.rider_share)}</Text>
          <Text variant="caption">you earn</Text>
        </View>
      </View>
      <Text variant="small"><Text variant="label">From </Text>{r.pickup_address}</Text>
      <Text variant="small"><Text variant="label">To </Text>{r.dropoff_address}</Text>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title="Accept" size="md" loading={act.isPending} onPress={() => act.mutate({ id: r.id, action: "accept" }, { onError: (e) => setError(apiError(e)) })} />
    </Card>
  );
}

function ActiveJob({ job }: { job: Delivery }) {
  const act = useRiderJobAction();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const run = (action: "picked-up" | "release" | "deliver") => { setError(""); act.mutate({ id: job.id, action, code: action === "deliver" ? code : undefined }, { onError: (e) => setError(apiError(e)) }); };
  return (
    <Card style={{ gap: 12, borderColor: colors.brand200 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="h2">Current delivery</Text><Badge label={job.status_label} status={job.status} />
      </View>
      <Stop label={job.kind === "errand" ? "Collect paid order from" : "Pick up"} address={job.pickup_address} sub={job.pickup_contact_name ? `${job.pickup_contact_name} · ${job.pickup_contact_phone}` : ""} onGo={() => openDirections(job.pickup)} />
      <Stop label="Deliver to" address={job.dropoff_address} sub={`${job.recipient_name} · ${job.recipient_phone}`} onGo={() => openDirections(job.dropoff)} />
      <Text variant="small">{job.item_description}{job.errand_details ? ` · ${job.errand_details}` : ""}</Text>
      {job.kind === "errand" ? <Notice kind="warning">This order is already paid for by the customer. Don’t pay the vendor — just collect it and deliver.</Notice> : null}
      {job.notes ? <Text variant="small">Note: {job.notes}</Text> : null}
      {job.customer_phone ? <Button title={`Call ${job.customer_name}`} kind="secondary" size="md" icon={<Phone size={16} color={colors.brand600} />} onPress={() => call(job.customer_phone!)} /> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {job.status === "accepted" ? (
        <View style={{ gap: 8 }}>
          <Button title="I've picked it up" loading={act.isPending} onPress={() => run("picked-up")} />
          <Button title="Can't make it" kind="ghost" onPress={() => run("release")} />
        </View>
      ) : null}
      {job.status === "picked_up" ? <Notice kind="warning">Waiting for the customer to pay {naira(job.fare)} in the app. Don’t leave until it shows as paid.</Notice> : null}
      {job.status === "in_transit" ? (
        <View style={{ gap: 10 }}>
          <Notice kind="success">Paid ✓ — your {naira(job.rider_share)} settles to your bank. Deliver and enter the recipient’s 4-digit code.</Notice>
          <Input label="Delivery code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" maxLength={4} style={{ letterSpacing: 8, fontSize: 20 }} />
          <Button title="Complete delivery" loading={act.isPending} disabled={code.length !== 4} onPress={() => run("deliver")} />
        </View>
      ) : null}
    </Card>
  );
}

function Stop({ label, address, sub, onGo }: { label: string; address: string; sub: string; onGo: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <View style={{ flex: 1 }}>
        <Text variant="caption">{label}</Text>
        <Text variant="bodyStrong" style={{ fontSize: 14.5 }}>{address}</Text>
        {sub ? <Text variant="small">{sub}</Text> : null}
      </View>
      <Pressable onPress={onGo} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.brand50 }}>
        <Navigation size={14} color={colors.brand600} /><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.brand600 }}>Go</Text>
      </Pressable>
    </View>
  );
}
