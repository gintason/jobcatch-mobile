/**
 * Employer KYC — business details, email/phone OTP, documents, submit.
 * Only verified employers can post jobs (same rule as the web).
 */
import { useState } from "react";
import { View } from "react-native";
import { BadgeCheck, CheckCircle2, Circle, FileText, Mail, Phone, Trash2 } from "lucide-react-native";
import { FilePick, KV, confirm } from "@/components/dashboard";
import { apiError, type PickedFile } from "@/lib/api";
import { pickDocument } from "@/lib/files";
import { formatDate } from "@/lib/format";
import {
  useDeleteKYCDoc, useEmployerKYC, useSaveKYC, useSendKYCOtp, useSubmitKYC, useUploadKYCDoc, useVerifyKYCOtp,
  type EmployerKYC, type KYCDocType,
} from "@/lib/roles";
import { Badge, Button, Card, Input, Loading, Notice, Select, Text, colors } from "@/ui";

const CHECK_LABEL = { cac: "CAC registration", tin: "Tax ID (TIN)", nin: "NIN" } as const;
const DOC_OPTIONS: { value: KYCDocType; label: string }[] = [
  { value: "cac_certificate", label: "CAC certificate (required)" },
  { value: "utility_bill", label: "Utility bill, last 3 months (required)" },
  { value: "government_id", label: "Director / representative’s government ID (required)" },
  { value: "tin_certificate", label: "TIN certificate" },
  { value: "other", label: "Other supporting document" },
];

export function EmployerVerification() {
  const q = useEmployerKYC();
  if (q.isLoading) return <Loading />;
  if (!q.data) return <Notice kind="error">{apiError(q.error, "Could not load verification.")}</Notice>;
  const kyc = q.data;
  return (
    <View style={{ gap: 14 }}>
      <StatusCard kyc={kyc} />
      {kyc.is_editable ? (
        <>
          <Details kyc={kyc} />
          <Card style={{ gap: 12 }}>
            <Text variant="h3">2 · Confirm your contact details</Text>
            <ContactRow kyc={kyc} channel="email" />
            <ContactRow kyc={kyc} channel="sms" />
          </Card>
          <Documents kyc={kyc} />
          <Submit kyc={kyc} />
        </>
      ) : (
        <Card style={{ gap: 2 }}>
          <KV label="Registered name" value={kyc.registered_name} />
          <KV label="CAC number" value={`${kyc.company_type} ${kyc.cac_number}`} />
          <KV label="TIN" value={kyc.tin} />
          <KV label="Director" value={kyc.director_name} />
          <KV label="Business email" value={kyc.contact_email} />
          <KV label="Phone" value={kyc.contact_phone} />
          <KV label="Documents" value={String(kyc.documents.length)} />
        </Card>
      )}
    </View>
  );
}

function StatusCard({ kyc }: { kyc: EmployerKYC }) {
  if (kyc.status === "verified") {
    return (
      <Card style={{ flexDirection: "row", gap: 12, backgroundColor: colors.successBg, borderColor: "#bbf7d0" }}>
        <BadgeCheck size={26} color={colors.success} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3" color={colors.success}>Verified Employer</Text>
          <Text variant="small" color={colors.success}>Your business is verified{kyc.reviewed_at ? ` since ${formatDate(kyc.reviewed_at)}` : ""}. The badge appears on all your job postings, and you can post jobs.</Text>
        </View>
      </Card>
    );
  }
  const r = kyc.requirements;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text variant="h3" style={{ flex: 1 }}>Business verification</Text>
        <Badge label={kyc.status_label} status={kyc.status === "pending" ? "pending" : kyc.status === "rejected" ? "rejected" : "info"} />
      </View>
      {kyc.status === "pending" ? <Notice kind="info">Submitted {formatDate(kyc.submitted_at)}. Our team usually reviews within 1–2 business days.</Notice>
        : <Text variant="small">To keep JobCatch free of fake listings, only verified employers can post. Confirm your email and phone, add your CAC, TIN and director details, and upload your documents.</Text>}
      {kyc.status === "rejected" && kyc.rejection_reason ? <Notice kind="error">Not approved: {kyc.rejection_reason} Update the details below and resubmit.</Notice> : null}
      {([
        ["Business details", r.details_complete], ["Email confirmed", r.email_verified], ["Phone confirmed", r.phone_verified], ["Documents uploaded", r.documents_complete],
      ] as const).map(([label, done]) => (
        <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {done ? <CheckCircle2 size={17} color={colors.success} /> : <Circle size={17} color={colors.faint} />}
          <Text variant="small" color={done ? colors.ink : colors.muted}>{label}</Text>
        </View>
      ))}
      {Object.entries(kyc.checks ?? {}).filter(([, c]) => c && c.status !== "skipped").map(([k, c]) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Badge label={c.status} status={c.status === "passed" ? "approved" : c.status === "failed" ? "failed" : "pending"} />
          <Text variant="caption" style={{ flex: 1 }}>{CHECK_LABEL[k as keyof typeof CHECK_LABEL]}{c.message ? ` — ${c.message}` : ""}</Text>
        </View>
      ))}
    </Card>
  );
}

function Details({ kyc }: { kyc: EmployerKYC }) {
  const save = useSaveKYC();
  const [f, setF] = useState({
    registered_name: kyc.registered_name, company_type: kyc.company_type || "RC", cac_number: kyc.cac_number, tin: kyc.tin,
    business_address: kyc.business_address, state: kyc.state, director_name: kyc.director_name, director_nin: "",
  });
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  function submit() {
    setMsg(null);
    const { director_nin, ...rest } = f;
    save.mutate({ ...rest, company_type: rest.company_type as EmployerKYC["company_type"], ...(director_nin ? { director_nin } : {}) }, {
      onSuccess: () => { set("director_nin", ""); setMsg({ kind: "success", text: "Business details saved." }); },
      onError: (e) => setMsg({ kind: "error", text: apiError(e, "Could not save.") }),
    });
  }
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">1 · Business details</Text>
      <Input label="Registered business name" value={f.registered_name} onChangeText={(v) => set("registered_name", v)} placeholder="As on your CAC certificate" />
      <Select label="Registration type" value={f.company_type} onChange={(v) => set("company_type", v)}
        options={[{ value: "RC", label: "Limited company (RC)" }, { value: "BN", label: "Business name (BN)" }, { value: "IT", label: "Incorporated trustees (IT)" }]} />
      <Input label="CAC number" value={f.cac_number} onChangeText={(v) => set("cac_number", v)} keyboardType="number-pad" placeholder="e.g. 1234567" />
      <Input label="TIN" value={f.tin} onChangeText={(v) => set("tin", v)} placeholder="e.g. 12345678-0001" />
      <Input label="Business address" value={f.business_address} onChangeText={(v) => set("business_address", v)} placeholder="Street, area, city" />
      <Input label="State" value={f.state} onChangeText={(v) => set("state", v)} placeholder="e.g. Lagos" />
      <Text variant="label" style={{ marginTop: 4 }}>Director / company representative</Text>
      <Input label="Full names" value={f.director_name} onChangeText={(v) => set("director_name", v)} placeholder="As on their NIN" />
      <Input label="NIN" value={f.director_nin} onChangeText={(v) => set("director_nin", v.replace(/\D/g, "").slice(0, 11))} keyboardType="number-pad"
        placeholder={kyc.director_nin_masked ? `Saved: ${kyc.director_nin_masked}` : "11 digits"} hint="Only visible to our review team — never shown publicly." />
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <Button title="Save details" loading={save.isPending} onPress={submit} />
    </Card>
  );
}

function ContactRow({ kyc, channel }: { kyc: EmployerKYC; channel: "email" | "sms" }) {
  const isEmail = channel === "email";
  const verified = isEmail ? kyc.is_email_verified : kyc.is_phone_verified;
  const saved = isEmail ? kyc.contact_email : kyc.contact_phone;
  const save = useSaveKYC();
  const send = useSendKYCOtp();
  const verify = useVerifyKYCOtp();
  const [value, setValue] = useState(saved);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const Icon = isEmail ? Mail : Phone;

  async function sendCode() {
    setError("");
    try {
      if (value !== saved) await save.mutateAsync(isEmail ? { contact_email: value.trim() } : { contact_phone: value.trim() });
      await send.mutateAsync(channel);
      setSent(true);
    } catch (e) { setError(apiError(e, "Could not send the code.")); }
  }
  return (
    <View style={{ gap: 8, paddingTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon size={16} color={colors.brand500} />
        <Text variant="bodyStrong" style={{ flex: 1, fontSize: 14 }}>{isEmail ? "Business email" : "Phone number"}</Text>
        {verified && value === saved ? <Badge label="Verified" tone="success" /> : null}
      </View>
      <Input value={value} onChangeText={setValue} keyboardType={isEmail ? "email-address" : "phone-pad"} autoCapitalize="none"
        placeholder={isEmail ? "hr@company.com" : "0803 000 0000"} />
      {!(verified && value === saved) ? (
        sent ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}><Input value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="6-digit code" /></View>
            <Button title="Verify" size="md" disabled={code.length < 4} loading={verify.isPending}
              onPress={() => { setError(""); verify.mutate({ channel, code }, { onSuccess: () => { setSent(false); setCode(""); }, onError: (e) => setError(apiError(e, "That code didn’t work.")) }); }} />
          </View>
        ) : (
          <Button title={`Send code by ${isEmail ? "email" : "SMS"}`} kind="secondary" size="md" disabled={!value.trim()} loading={save.isPending || send.isPending} onPress={sendCode} />
        )
      ) : null}
      {sent ? <Text variant="caption">We sent a code to {value}. <Text variant="caption" color={colors.brand500} onPress={sendCode}>Resend</Text></Text> : null}
      {error ? <Text variant="caption" color={colors.danger}>{error}</Text> : null}
    </View>
  );
}

function Documents({ kyc }: { kyc: EmployerKYC }) {
  const upload = useUploadKYCDoc();
  const del = useDeleteKYCDoc();
  const [type, setType] = useState<KYCDocType>(kyc.requirements.missing_documents[0] ?? "cac_certificate");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState("");
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">3 · Documents</Text>
      {kyc.requirements.missing_documents.length ? (
        <Text variant="caption">Still needed: {kyc.requirements.missing_documents.map((d) => DOC_OPTIONS.find((o) => o.value === d)?.label.replace(" (required)", "") ?? d).join(", ")}</Text>
      ) : null}
      <Select label="Document type" value={type} onChange={(v) => { setType(v as KYCDocType); setFile(null); }} options={DOC_OPTIONS} />
      <FilePick file={file} label="Choose a photo or PDF" onPick={async () => { const f = await pickDocument(["application/pdf", "image/*"]); if (f) setFile(f); return f; }} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title="Upload document" kind="secondary" disabled={!file} loading={upload.isPending}
        onPress={() => { setError(""); upload.mutate({ doc_type: type, file: file! }, { onSuccess: () => setFile(null), onError: (e) => setError(apiError(e, "Upload failed.")) }); }} />
      {kyc.documents.map((d) => (
        <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
          <FileText size={18} color={colors.brand600} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>{d.doc_type_label}</Text>
            <Text variant="caption" numberOfLines={1}>{d.original_name}{d.review_note ? ` · ${d.review_note}` : ""}</Text>
          </View>
          <Badge label={d.status} status={d.status === "accepted" ? "approved" : d.status} />
          <Trash2 size={17} color={colors.danger} accessibilityLabel={`Delete ${d.doc_type_label}`}
            onPress={() => confirm("Remove document?", d.doc_type_label, "Remove", () => del.mutate(d.id), true)} />
        </View>
      ))}
    </Card>
  );
}

function Submit({ kyc }: { kyc: EmployerKYC }) {
  const submit = useSubmitKYC();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return (
    <Card style={{ gap: 10 }}>
      <Text variant="h3">4 · Submit for review</Text>
      <Text variant="small">Our team checks your details and documents, usually within 1–2 business days.</Text>
      {!kyc.can_submit ? <Notice kind="warning">Complete steps 1–3 first{kyc.requirements.missing_fields.length ? ` (missing: ${kyc.requirements.missing_fields.join(", ").replace(/_/g, " ")})` : ""}.</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {done ? <Notice kind="success">Submitted. We’ll notify you when the review is done.</Notice> : null}
      <Button title="Submit for verification" disabled={!kyc.can_submit} loading={submit.isPending}
        onPress={() => { setError(""); submit.mutate(undefined, { onSuccess: () => setDone(true), onError: (e) => setError(apiError(e, "Could not submit.")) }); }} />
    </Card>
  );
}
