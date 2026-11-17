import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { BadgeCheck, CheckCircle2, Circle, FileText, ImagePlus, LocateFixed, Star, Trash2, Wrench } from "lucide-react-native";
import { BookingList, ConversationList, DashTabs, FilePick, KV, RoleGate, SwitchRole, Toggle, confirm } from "@/components/dashboard";
import { apiError, type PickedFile } from "@/lib/api";
import { useEnsureRole } from "@/lib/auth";
import { openCheckout } from "@/lib/checkout";
import { mediaUrl } from "@/lib/config";
import { pickDocument, pickImages, takeSelfie } from "@/lib/files";
import { formatDate, naira } from "@/lib/format";
import { useCategories, useMyBookings } from "@/lib/jobs";
import { currentPlace } from "@/lib/location";
import {
  useArtisanVerification, useCreateService, useDeleteArtisanDoc, useDeletePortfolio, useDeleteService, useMyServices, usePortfolio,
  useRoleProfile, useSaveArtisanVerification, useSaveRoleProfile, useSubmitArtisanVerification, useUploadArtisanDoc, useUploadPortfolio,
  type ArtisanProfile, type ArtisanVerification,
} from "@/lib/roles";
import { Badge, Button, Card, Empty, Input, Loading, MultiSelect, Notice, Screen, Select, Text, colors, fonts, radius } from "@/ui";

type Tab = "profile" | "services" | "portfolio" | "bookings" | "messages" | "verification";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" }, { id: "services", label: "My services" }, { id: "portfolio", label: "Portfolio" },
  { id: "bookings", label: "Bookings" }, { id: "messages", label: "Messages" }, { id: "verification", label: "Get verified" },
];

/** Artisan dashboard — mirrors /dashboard/artisan on the web. */
export default function ArtisanDashboard() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === params.tab) ? params.tab! : "profile");
  const ready = useEnsureRole("artisan");
  const profile = useRoleProfile<ArtisanProfile>("artisan", ready);
  const p = profile.data;

  return (
    <Screen back title="Artisan" subtitle="Offer your services and get hired" right={<SwitchRole />}
      onRefresh={() => profile.refetch()} refreshing={profile.isRefetching}>
      <RoleGate ready={ready} role="artisan">
        {p ? (
          <View style={s.stats}>
            <Stat icon={<Star size={16} color={colors.amber} fill={colors.amber} />} value={`${Number(p.avg_rating || 0).toFixed(1)}`} label={`${p.rating_count} review${p.rating_count === 1 ? "" : "s"}`} />
            <Stat icon={<Circle size={12} color={p.is_available ? colors.success : colors.faint} fill={p.is_available ? colors.success : colors.faint} />} value={p.is_available ? "Available" : "Away"} label="Status" />
            <Stat icon={<BadgeCheck size={16} color={p.is_work_verified ? colors.brand500 : colors.faint} />} value={p.is_work_verified ? "Verified" : "Not yet"} label="Verification" />
          </View>
        ) : null}
        <DashTabs value={tab} onChange={setTab} tabs={TABS} />
        {tab === "profile" ? (profile.isLoading ? <Loading /> : p ? <ProfilePanel p={p} /> : <Notice kind="error">{apiError(profile.error, "Could not load your profile.")}</Notice>) : null}
        {tab === "services" ? <ServicesPanel /> : null}
        {tab === "portfolio" ? <PortfolioPanel /> : null}
        {tab === "bookings" ? <ArtisanBookings /> : null}
        {tab === "messages" ? <ConversationList /> : null}
        {tab === "verification" ? <VerificationPanel /> : null}
      </RoleGate>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={s.stat}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>{icon}<Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: colors.brand900 }}>{value}</Text></View>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- profile
function ProfilePanel({ p }: { p: ArtisanProfile }) {
  const save = useSaveRoleProfile();
  const [f, setF] = useState({
    bio: p.bio ?? "", phone: p.phone ?? "", show_phone: !!p.show_phone, is_available: p.is_available,
    service_radius_km: String(p.service_radius_km ?? 10), city: p.city ?? "", area: p.area ?? "", state: p.state ?? "",
  });
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function locate() {
    setLocating(true); setMsg(null);
    try {
      const place = await currentPlace();
      setLoc({ lat: place.lat, lng: place.lng });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message || "Could not get your location." });
    } finally { setLocating(false); }
  }
  function submit() {
    setMsg(null);
    const radius = Number(f.service_radius_km);
    save.mutate({
      bio: f.bio.trim(), phone: f.phone.trim() || null, show_phone: f.show_phone, is_available: f.is_available,
      service_radius_km: Number.isFinite(radius) && radius > 0 ? radius : 10, city: f.city.trim(), area: f.area.trim(), state: f.state.trim(),
      ...(loc ? { latitude: loc.lat, longitude: loc.lng } : {}),
    }, {
      onSuccess: () => setMsg({ kind: "success", text: "Profile saved." }),
      onError: (e) => setMsg({ kind: "error", text: apiError(e, "Could not save your profile.") }),
    });
  }
  const hasLoc = loc || p.location;
  return (
    <Card style={{ gap: 14 }}>
      <Toggle label="Available for work" hint="Customers can only book you while this is on." value={f.is_available} onChange={(v) => set("is_available", v)} />
      <Input label="About you" value={f.bio} onChangeText={(v) => set("bio", v)} multiline placeholder="Your trade, experience and what makes your work stand out" />
      <Input label="Phone number" value={f.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" placeholder="e.g. 0803 000 0000" />
      <Toggle label="Show my phone on my profile" value={f.show_phone} onChange={(v) => set("show_phone", v)} />
      <Input label="Service radius (km)" value={f.service_radius_km} onChangeText={(v) => set("service_radius_km", v.replace(/\D/g, ""))} keyboardType="number-pad" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Input label="Area" value={f.area} onChangeText={(v) => set("area", v)} placeholder="e.g. Lekki" /></View>
        <View style={{ flex: 1 }}><Input label="City" value={f.city} onChangeText={(v) => set("city", v)} placeholder="e.g. Lagos" /></View>
      </View>
      <Input label="State" value={f.state} onChangeText={(v) => set("state", v)} placeholder="e.g. Lagos" />
      <View style={{ gap: 6 }}>
        <Text variant="label">Work location</Text>
        <Text variant="caption">{loc ? "New location captured — save to apply." : p.location ? "Location set. Customers near you can find you." : "Not set. Add it so nearby customers can find you."}</Text>
        <Button title={hasLoc ? "Update to my current location" : "Use my current location"} kind="secondary" size="md" loading={locating}
          icon={<LocateFixed size={16} color={colors.brand600} />} onPress={locate} />
      </View>
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <Button title="Save profile" loading={save.isPending} onPress={submit} />
    </Card>
  );
}

// ---------------------------------------------------------------- services
function ServicesPanel() {
  const services = useMyServices();
  const cats = useCategories("home_service");
  const create = useCreateService();
  const del = useDeleteService();
  const [f, setF] = useState({ category: "", title: "", description: "", base_price: "" });
  const [error, setError] = useState("");
  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name;

  function add() {
    setError("");
    create.mutate({ ...f, title: f.title.trim(), description: f.description.trim(), base_price: f.base_price || "0" }, {
      onSuccess: () => setF({ category: "", title: "", description: "", base_price: "" }),
      onError: (e) => setError(apiError(e, "Could not add the service.")),
    });
  }
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <Text variant="h3">Add a service</Text>
        <Select label="Category" value={f.category} onChange={(v) => setF({ ...f, category: v })} loading={cats.isLoading}
          options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose your trade" />
        <Input label="Title" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} placeholder="e.g. Kitchen sink installation" />
        <Input label="Description" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline placeholder="What's included" />
        <Input label="Starting price (₦)" value={f.base_price} onChangeText={(v) => setF({ ...f, base_price: v.replace(/[^\d.]/g, "") })} keyboardType="decimal-pad" placeholder="e.g. 15000" />
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title="Add service" loading={create.isPending} disabled={!f.category || !f.title.trim()} onPress={add} />
      </Card>
      {services.isLoading ? <Loading rows={2} /> : services.data?.length ? services.data.map((sv) => (
        <Card key={sv.id} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <View style={s.svcIcon}><Wrench size={18} color={colors.brand600} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong">{sv.title}</Text>
            <Text variant="caption">{sv.category_name || catName(sv.category) || "Service"}{Number(sv.base_price) ? ` · from ${naira(sv.base_price)}` : ""}</Text>
            {sv.description ? <Text variant="small" numberOfLines={3}>{sv.description}</Text> : null}
          </View>
          <Pressable hitSlop={10} accessibilityLabel={`Delete ${sv.title}`} onPress={() => confirm("Delete service?", sv.title, "Delete", () => del.mutate(sv.id), true)}>
            <Trash2 size={18} color={colors.danger} />
          </Pressable>
        </Card>
      )) : <Empty icon={<Wrench size={26} color={colors.brand500} />} title="No services yet" body="Add what you offer so customers can find and book you." />}
    </View>
  );
}

// ---------------------------------------------------------------- portfolio
function PortfolioPanel() {
  const items = usePortfolio();
  const upload = useUploadPortfolio();
  const del = useDeletePortfolio();
  const [image, setImage] = useState<PickedFile | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <Text variant="h3">Showcase your work</Text>
        <Text variant="caption">Photos of finished jobs help customers choose you.</Text>
        <Pressable onPress={async () => { const [f] = await pickImages(1); if (f) setImage(f); }} style={s.pick} accessibilityRole="button">
          {image ? <Image source={{ uri: image.uri }} style={{ width: "100%", height: 180, borderRadius: radius.md }} contentFit="cover" />
            : <><ImagePlus size={26} color={colors.brand500} /><Text variant="small">Choose a photo</Text></>}
        </Pressable>
        <Input label="Caption" value={caption} onChangeText={setCaption} placeholder="e.g. Bathroom tiling, Ikeja" />
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title="Upload photo" loading={upload.isPending} disabled={!image}
          onPress={() => { setError(""); upload.mutate({ image: image!, caption: caption.trim() }, { onSuccess: () => { setImage(null); setCaption(""); }, onError: (e) => setError(apiError(e, "Upload failed.")) }); }} />
      </Card>
      {items.isLoading ? <Loading rows={2} /> : items.data?.length ? (
        <View style={s.grid}>
          {items.data.map((it) => (
            <View key={it.id} style={s.tile}>
              <Image source={{ uri: mediaUrl(it.image) }} style={{ width: "100%", aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.brand50 }} contentFit="cover" />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>{it.caption || formatDate(it.created_at)}</Text>
                <Pressable hitSlop={10} accessibilityLabel="Delete photo" onPress={() => confirm("Delete photo?", it.caption || "This photo will be removed.", "Delete", () => del.mutate(it.id), true)}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : <Empty icon={<ImagePlus size={26} color={colors.brand500} />} title="No photos yet" body="Upload pictures of jobs you've done." />}
    </View>
  );
}

function ArtisanBookings() {
  const list = useMyBookings();
  return <BookingList role="artisan" bookings={list.data} loading={list.isLoading} />;
}

// ---------------------------------------------------------------- verification
const ID_TYPES = [
  { value: "nin", label: "National ID (NIN)" }, { value: "voters_card", label: "Voter’s card" },
  { value: "drivers_licence", label: "Driver’s licence" }, { value: "intl_passport", label: "International passport" },
];
const DOC_TYPES = [
  { value: "government_id", label: "Government ID (required)" }, { value: "trade_certificate", label: "Trade certificate / licence" },
  { value: "selfie", label: "Selfie holding your ID" }, { value: "other", label: "Other supporting document" },
];

function VerificationPanel() {
  const q = useArtisanVerification();
  if (q.isLoading) return <Loading />;
  if (!q.data) return <Notice kind="error">{apiError(q.error, "Could not load verification.")}</Notice>;
  const app = q.data;
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text variant="h3" style={{ flex: 1 }}>Verified Artisan badge</Text>
          <Badge label={app.status_label} status={app.status === "verified" ? "approved" : app.status === "pending_review" ? "pending" : app.status} />
        </View>
        <Text variant="small">Verified artisans rank higher and win more bookings. Tell us about your skills, upload your documents, then pay the one-off {naira(app.fee)} review fee.</Text>
        {app.status === "rejected" && app.review_note ? <Notice kind="error">Not approved yet: {app.review_note} Fix it below and resubmit{app.fee_paid ? " — no extra fee" : ""}.</Notice> : null}
        {app.status === "pending_review" ? <Notice kind="info">Submitted {formatDate(app.submitted_at)}. Our team is reviewing your documents.</Notice> : null}
        {app.status === "verified" ? <Notice kind="success">You’re verified{app.reviewed_at ? ` since ${formatDate(app.reviewed_at)}` : ""}. The badge shows on your profile.</Notice> : null}
        {[
          ["Skill categories & experience", app.requirements.categories && app.requirements.experience],
          ["ID type and number", app.requirements.identity],
          ["Government ID uploaded", app.requirements.government_id_document],
          [`Verification fee (${naira(app.fee)})`, app.fee_paid],
        ].map(([label, done]) => (
          <View key={String(label)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {done ? <CheckCircle2 size={17} color={colors.success} /> : <Circle size={17} color={colors.faint} />}
            <Text variant="small" color={done ? colors.ink : colors.muted}>{label}</Text>
          </View>
        ))}
      </Card>
      {app.is_editable ? (
        <>
          <DetailsForm app={app} />
          <DocsForm app={app} />
          <SubmitCard app={app} />
        </>
      ) : null}
    </View>
  );
}

function DetailsForm({ app }: { app: ArtisanVerification }) {
  const cats = useCategories("home_service");
  const save = useSaveArtisanVerification();
  const [selected, setSelected] = useState<string[]>(app.categories);
  const [years, setYears] = useState(app.years_experience == null ? "" : String(app.years_experience));
  const [idType, setIdType] = useState<string>(app.id_type || "nin");
  const [idNumber, setIdNumber] = useState("");
  const [creds, setCreds] = useState(app.trade_credentials);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function submit() {
    setMsg(null);
    save.mutate({
      categories: selected, years_experience: years === "" ? null : Number(years), id_type: idType,
      ...(idNumber.trim() ? { id_number: idNumber.trim() } : {}), trade_credentials: creds.trim(),
    }, {
      onSuccess: () => { setIdNumber(""); setMsg({ kind: "success", text: "Details saved." }); },
      onError: (e) => setMsg({ kind: "error", text: apiError(e, "Could not save.") }),
    });
  }
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">1 · Your skills & ID</Text>
      <MultiSelect label="Skill categories" values={selected} onChange={setSelected} loading={cats.isLoading}
        options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose your trades" hint="Pick every trade you’re skilled in." />
      <Input label="Years of experience" value={years} onChangeText={(v) => setYears(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="e.g. 5" />
      <Select label="ID type" value={idType} onChange={setIdType} options={ID_TYPES} />
      <Input label="ID number" value={idNumber} onChangeText={setIdNumber} autoCapitalize="characters"
        placeholder={app.id_number_masked ? `Saved: ${app.id_number_masked}` : "Enter your ID number"} />
      <Input label="Trade credentials (optional)" value={creds} onChangeText={setCreds} multiline placeholder="Certifications, apprenticeships, associations…" />
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <Button title="Save details" loading={save.isPending} onPress={submit} />
    </Card>
  );
}

function DocsForm({ app }: { app: ArtisanVerification }) {
  const upload = useUploadArtisanDoc();
  const del = useDeleteArtisanDoc();
  const [type, setType] = useState("government_id");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState("");
  async function pick() {
    const f = type === "selfie" ? await takeSelfie() : await pickDocument(["application/pdf", "image/*"]);
    if (f) setFile(f);
    return f;
  }
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">2 · Documents</Text>
      <Select label="Document" value={type} onChange={(v) => { setType(v); setFile(null); }} options={DOC_TYPES} />
      <FilePick file={file} label={type === "selfie" ? "Take a selfie holding your ID" : "Choose a photo or PDF"} onPick={pick} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title="Upload document" kind="secondary" loading={upload.isPending} disabled={!file}
        onPress={() => { setError(""); upload.mutate({ doc_type: type, file: file! }, { onSuccess: () => setFile(null), onError: (e) => setError(apiError(e, "Upload failed.")) }); }} />
      {app.documents.map((d) => (
        <View key={d.id} style={s.docRow}>
          <FileText size={18} color={colors.brand600} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>{d.doc_type_label}</Text>
            <Text variant="caption" numberOfLines={1}>{d.original_name}</Text>
          </View>
          <Pressable hitSlop={10} accessibilityLabel={`Delete ${d.doc_type_label}`} onPress={() => confirm("Remove document?", d.doc_type_label, "Remove", () => del.mutate(d.id), true)}>
            <Trash2 size={17} color={colors.danger} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

function SubmitCard({ app }: { app: ArtisanVerification }) {
  const submit = useSubmitArtisanVerification();
  const q = useArtisanVerification();
  const [error, setError] = useState("");
  const ready = app.requirements.categories && app.requirements.experience && app.requirements.identity && app.requirements.government_id_document;
  function go() {
    setError("");
    submit.mutate(undefined, {
      onSuccess: async (d) => {
        if (d.authorization_url) { await openCheckout(d.authorization_url, d.reference); q.refetch(); }
        else Alert.alert("Submitted", "Your verification is now with our review team.");
      },
      onError: (e) => setError(apiError(e, "Could not submit.")),
    });
  }
  return (
    <Card style={{ gap: 10 }}>
      <Text variant="h3">3 · {app.fee_paid ? "Submit for review" : "Pay & submit"}</Text>
      <Text variant="small">{app.fee_paid ? "Your fee is already paid — resubmitting is free." : `One-off verification fee: ${naira(app.fee)}. You’ll pay securely, then our team reviews your documents.`}</Text>
      {!ready ? <Notice kind="warning">Complete steps 1 and 2 first.</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title={app.fee_paid ? "Submit for review" : `Pay ${naira(app.fee)} & submit`} loading={submit.isPending} disabled={!ready} onPress={go} />
      <KV label="Status" value={app.status_label} />
    </Card>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, gap: 2, borderWidth: 1, borderColor: colors.line },
  svcIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" },
  pick: { minHeight: 120, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand200, alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47%", flexGrow: 1, gap: 6, backgroundColor: colors.white, padding: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  docRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
});
